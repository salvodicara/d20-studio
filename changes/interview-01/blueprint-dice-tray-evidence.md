# B34 — Tiri: vassoio dei dadi, richieste del DM, tiri di gruppo e destinatari — prove

24–25/09/2026. Worktree `d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non
committato. Area costruita tramite il registro (B11) più poche aggiunte puntuali nei file
condivisi, elencate sotto (nessuna firma o comportamento esistente cambiato, salvo il
pulsante «Tira i dadi» che ora apre il vassoio come chiede la scheda).

## In breve

I dadi hanno un posto solo: la scheda **Dadi** della barra laterale destra del Tavolo, aperta
anche da «Tira i dadi» nella barra delle azioni (il pulsante d20 del vassoio di D&D Beyond).
Tre sezioni:

- **Tira**: formula libera («2d6+1d4+3», tieni/scarta, esplosioni, successi) con i pulsanti
  dei dadi, vantaggio/svantaggio/critico, dadi **digitali, fisici o connessi**, **chi vede il
  risultato** (Tutti, Io e il DM, Solo il DM, Solo io), CD e descrizione, **pila dei
  modificatori** (FG) con i modificatori preparati dal DM (Mezza copertura +2, Tre quarti +5),
  risultato con i dadi 2D, **prove, tiri salvezza e abilità** del personaggio come numeri da
  tirare sul posto (clic, clic destro, pressione lunga, «…»), **ultimi 10 tiri** con Ripeti il
  tiro, Rivela, Correggi, Ritira.
- **Richieste**: il DM chiede un TS, una prova di caratteristica o di abilità (con CD
  facoltativa e vantaggio) a più creature, o un **tiro contrapposto**; ogni richiesta entra
  nella **coda esistente** di `combat.mjs` (campanella, «Tiri e risultati», B56) e chi gioca la
  creatura risponde con dadi fisici o digitali dalla carta. Riepilogo successi/fallimenti,
  nessuna conseguenza automatica; Annulla e «Riapplica il risultato noto»; Ispirazione eroica
  dopo un fallimento; il DM conclude o riapre la carta. Per il DM anche l'Ispirazione eroica di
  tutto il gruppo.
- **Aspetto e prova**: dadi 3D condivisi (B56), **2D leggeri solo per chi tira** o nessuna
  animazione; politica personale dei tiri («chiedi sempre vantaggio o svantaggio», chi vede di
  solito); politica della campagna sui tiri nascosti (DM); effetti visivi degli incantesimi;
  dadi connessi simulati; e la prova dei dadi 3D di B56 (**la scheda «Prova i dadi» è
  assorbita qui**).

Fuori dal Tavolo: sezione **Tiri** nella scheda del personaggio (Azioni) con l'interruttore
**Ispirazione eroica** e TS/abilità tirabili sul posto; nel diario `@Embed[save:dex:13]`
diventa una **carta di tiro** (il DM la trasforma in richiesta, il giocatore la tira).

## File

Nuovi (di B34):

- `design/blueprint/dice-tray.mjs` — modulo d'ingresso `register(registry)`: sezione di stato
  `dice-tray` (`undo: "preserve"`), impostazioni personali (`dice-tray`) e di campagna
  (`dice-tray-campaign`, solo DM), scheda del Tavolo, sezione della scheda, livello mappa degli
  effetti, fornitore di embed del diario, evento `dice-tray:prefill` (chat `/r`), menu del tiro,
  dadi 2D.
- `design/blueprint/dice-tray-domain.mjs` — puro: formula (sottoinsieme Foundry), modalità,
  valutazione, facce fisiche con esplosioni, modificatori dalla scheda, destinatari,
  annuncio e rivelazione, record, ritiro/correzione, Ispirazione eroica, pila e modificatori
  preparati, dadi connessi, evento `roll-accepted`.
- `design/blueprint/roll-requests.mjs` — puro: richieste sulla coda esistente, proiezione per
  ruolo, riepilogo e confronto, risposta via `resolveRoll`, ritiro con Ispirazione, riferimenti
  del diario.
- `design/blueprint/dice.css` — stili `.dtray-*` (inseriti con `registerStyles`).
- `design/blueprint/tests/dice-tray.test.mjs` — 22 test; `tests/roll-requests.test.mjs` — 7.
- `changes/interview-01/blueprint-checks/dice-tray-journey.js` — percorso nel browser (la
  scheda lo chiamava `dice-requests-journey.js`; il nome segue l'incarico).

Aggiunte puntuali in file condivisi (tutte additive, commentate «B34»):

| File                                                    | Aggiunta                                                                                                                                                                                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `combat.mjs`                                            | nuova esportazione `enqueueRollRequest(state, input, role)` (attempt `kind: "roll-request"` costruito con `requestFor`, solo DM); `resolveRoll` registra la faccia naturale anche per `kind: "check"`; `hasBlockingConsequences` ignora le richieste del DM |
| `table.mjs`                                             | `data-table="dice"`: se il vassoio è costruito apre la scheda `dice-tray` (senza chiuderla); altrimenti il vecchio «Tiro libero» resta come riserva                                                                                                         |
| `dice-3d.mjs`                                           | la scheda «Prova i dadi» ha `when: () => !area?.get("table-panel", "dice-tray")`: assorbita dal vassoio, che ne rende lo stesso cassetto                                                                                                                    |
| `dice-3d-domain.mjs`                                    | `describeRoll`: ramo `source: "dice-tray"` (titolo, dadi tenuti, CD, esito, pila); `describeCombat`: ramo per le richieste del DM (titolo, CD, esito)                                                                                                       |
| `combat-ui.mjs`, `notifications.mjs`, `chat-domain.mjs` | etichetta `check: Prova/Check` (prima una prova richiesta si sarebbe chiamata «Danni»)                                                                                                                                                                      |
| `chat.mjs`                                              | `/r d20+5` emette `dice-tray:prefill` prima di premere «Tira i dadi»: il vassoio si apre con la formula                                                                                                                                                     |

## Dove si trova (≤ 2 clic)

| Contesto                                                    | Percorso                                               | Chi                                    |
| ----------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------- |
| Tavolo → **Tira i dadi** (barra delle azioni) o scheda Dadi | 1 clic                                                 | giocatore e DM                         |
| Tavolo → Dadi → **Richieste**                               | 2 clic; badge col numero da tirare                     | DM (chiede), giocatore (risponde)      |
| Campanella → «Tiro richiesto: Livia…» / Tiri e risultati    | 1–2 clic (coda esistente)                              | chi controlla la creatura              |
| Personaggi → scheda → **Azioni** → «Tiri»                   | 1 clic dalla scheda                                    | chi vede la scheda; tira chi controlla |
| Campagna → voce del diario con `@Embed[save:dex:13]`        | la carta è nel testo                                   | DM chiede, giocatore tira              |
| Preferenze → **Tiri e dadi** / **Tiri nascosti**            | 1 clic (stesse scelte anche in Dadi → Aspetto e prova) | ognuno per sé; campagna solo DM        |
| Chat `/r d20+5`                                             | apre Dadi con la formula                               | chi parla                              |

## Capacità → prova

| Capacità (censimento)                                                 | Percorso                                                                                             | Comando e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Regola / fonte                                                                                                                      | Pattern adottato                                                                                                                                                                   | Prova                                                                                                                                                   |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-88 vassoio libero con formula, vantaggio, modificatori             | Tavolo → Tira i dadi → Formula «2d6+1d4+3» → Tira                                                    | facce dal servizio `rollDie` (una sola estrazione, poi commit delle stesse facce), totale = somma + 3, riga di registro «Livia · 2d6 + 1d4 + 3: [4, 2] + [3] + 3 = 12 · dado digitale», `roll-accepted` per B56; fisici: un campo per dado, [6,5,4] = 18; vantaggio «1d20+5» → «2d20kh1+5» tiene il più alto; «2d6+» → «Manca un dado o un numero dopo «+» (posizione 4)», «3d7» → «d7 non è un dado standard…», nulla registrato; «Ripeti il tiro» dagli ultimi 10        | SRD 5.2.1 Prove con d20 EN 6 / IT 6; Vantaggio/svantaggio EN 7–8 / IT 8; critico EN 16 / IT 18 (dadi dei danni due volte)           | vassoio d20 di D&D Beyond (DDB-151), Dice Tray Foundry (FVT-156), Owlbear Dice (VTL-113), ultimi 10 ripetibili Roll20 (R20-142)                                                    | percorso (1), test «the form rolls…», «a wrong formula…», schermate 01–02                                                                               |
| TV-97 sintassi avanzata                                               | stessa formula                                                                                       | `4d6kh3`, `4d6dl1`, `2d6x` (fino a 10 esplosioni), `1d6xo`, `10d6cs>=5`; con dadi fisici le esplosioni chiedono le facce in più («Un dado è esploso: inserisci la faccia del dado aggiuntivo (d6)»)                                                                                                                                                                                                                                                                        | decisione dell'app (AUTHORED.syntax)                                                                                                | modificatori dei dadi Foundry (FVT-152), sottoinsieme                                                                                                                              | test «keep/drop…», «physical faces…», «a wrong formula… explosion»                                                                                      |
| TV-89 menu del tiro sul numero                                        | Dadi → Prove, TS e abilità (o scheda → Tiri) → clic destro / pressione lunga / «…»                   | menu: Tira con vantaggio, con svantaggio, normale (un d20) — «Tira come critico» per i dadi dei danni sul pulsante Tira — e «Tira per» Tutti / Io e il DM / Solo il DM / Solo io; frecce, Esc, Invio; Maiusc+clic vantaggio, Ctrl/⌘+clic svantaggio                                                                                                                                                                                                                        | SRD vantaggio EN 7–8 / IT 8                                                                                                         | clic destro e pressione lunga di DDB (DDB-150, DDB-149), d20 trascinabile Alchemy come alternativa visibile (VTL-163), tasti Beyond20 (VTL-012)                                    | percorso (2) e (B), schermate 04, 16                                                                                                                    |
| TV-90 destinatari del tiro                                            | Dadi → Chi vede il risultato; Preferenze → Chi vede i tuoi tiri di solito                            | giocatore: Tutti, Io e il DM, Solo il DM (cieco), Solo io; DM: Tutti, Solo DM; predefinito personale + scelta per tiro; scheda personale sempre «Solo io»                                                                                                                                                                                                                                                                                                                  | proiezione `canSeeResult` (dominio); B56 non mostra i dadi di un tiro cieco a chi l'ha tirato                                       | modalità Foundry (FVT-150), scala Roll20 (R20-143), icona persona di Dice+ (VTL-173), selettore DDB (DDB-149)                                                                      | test «who reads a roll…», «offline…»                                                                                                                    |
| TV-91 tiro nascosto che si annuncia; rivelazione                      | DM: Solo DM → Tira; Ultimi tiri → Rivela «Solo a Doran» / «A tutti»                                  | il giocatore vede «Il DM ha fatto un tiro nascosto.» nel vassoio e nel registro/chat senza risultato; dopo «Solo a Doran» (giocato dal DM) il giocatore vede ancora solo l'annuncio; dopo «A tutti» vede il risultato e il registro dice «Tiro rivelato a tutti: …»; con la politica di campagna spenta nessuna traccia; il giocatore che tira «Solo il DM» riceve «Tiro inviato al DM: il risultato è nascosto anche a te.»                                               | —                                                                                                                                   | Bones! (VTL-172), rivelazione Foundry (FVT-150), FG trascina su un giocatore (R20-172), /ssr Roll20 (R20-143)                                                                      | percorso (3), test «the DM's hidden roll…», schermate 05–06                                                                                             |
| TV-92 richiesta di tiro del DM come carta con riepilogo               | DM: Dadi → Richieste → TS Destrezza CD 13 → Livia e Doran → Invia                                    | due attempt `roll-request` nella coda di `combat.mjs` (modificatore dalla scheda: DES +2); giocatore: badge 1, carta, «Dadi fisici» 9 → «11 · Fallimento»; Annulla → «Annullato: facce note 9» → «Riapplica il risultato noto» (nessun dado nuovo); DM: Doran «Dadi digitali»; riepilogo «Successi 0 · Fallimenti 2 · In attesa 0»; PF invariati, «Nessuna conseguenza automatica»; la stessa richiesta è nella campanella e in «Tiri e risultati» (Risolvi tiro del core) | SRD Tiri salvezza EN 7 / IT 7, Prove EN 6 / IT 6, abilità EN 9 / IT 10                                                              | richiesta dnd5e (FVT-146), carta e totali di Monk's TokenBar (FVT-147), tiri di gruppo FG contro CD (R20-078), Quick Rolls AboveVTT (VTL-164)                                      | percorso (4) e (B), test «the DM's request queues…», «answers go through resolveRoll…», «with the real store…», «request tab…», schermate 07–08, 17, 20 |
| TV-93 tiri contrapposti                                               | DM: Richieste → Contrapposto → Livia (Atletica) contro Sentinella (Acrobazia)                        | ognuno risponde; «Totale più alto: Livia 20 contro 14» o «Pareggio (n): decide il DM»; nota «Confronto dell'app: l'SRD 5.2.1 non ha una regola generale per le prove contrapposte»                                                                                                                                                                                                                                                                                         | nessuna regola SRD 5.2.1 (fonte `authored`, mai citata come SRD)                                                                    | contrapposti di Monk's TokenBar (FVT-147)                                                                                                                                          | percorso (5), test «opposed rolls…», schermata 11                                                                                                       |
| TV-83 finestre pre/post tiro (Ispirazione) · PG-33 Ispirazione eroica | scheda → Azioni → Tiri → interruttore; carta della richiesta → «Ripeti un dado · Ispirazione eroica» | interruttore del giocatore (o del DM), visibile al DM in Richieste; dopo il TS fallito: dialogo (quale d20 con vantaggio/svantaggio, digitale o fisico) 9 → 15 = 17 · Successo; ispirazione spenta; registro «Livia · Ispirazione eroica spesa: ripete il d20 9 → 15 = 17…»; offerta una volta; nel vassoio vale per l'ultimo tiro del personaggio                                                                                                                         | SRD Ispirazione eroica EN 8, 183 / IT 8, 209 (una alla volta, ripeti un dado subito dopo e usa il nuovo; con vantaggio un solo d20) | interruttore DDB e vista DM (DDB-036), «Roll Again» di BG3 dopo un fallimento (CRP-031) con la regola 2024 per creatura, non la riserva di BG3; finestra pre-tiro = pila (CRP-131) | percorso (6), test «Heroic Inspiration…» (dominio e richieste), schermate 09–10                                                                         |
| TV-96 pila di modificatori situazionali                               | Dadi → Pila dei modificatori → «+ Mezza copertura +2» → TS Destrezza                                 | chip «Mezza copertura +2 ×», il TS usa d20 + 2 (DES) + 2 e la pila si svuota; «Altro modificatore» ±n; DM: Gestisci i modificatori preparati (nome, valore, «Visibile ai giocatori», elimina)                                                                                                                                                                                                                                                                              | Copertura SRD EN 179 / IT 206 (+2 / +5 a CA e TS su Destrezza)                                                                      | pila FG accanto alla chat, un clic toglie (R20-174); Standard Modifiers FG con occhio di visibilità (R20-126)                                                                      | percorso (7), test «modifier stack and campaign presets…», «stack chips…», schermata 03                                                                 |
| TV-94 dadi animati condivisi e disattivabili; 2D leggeri              | Dadi → Aspetto e prova → Dadi animati                                                                | 3D condivisi = B56 (ogni tiro del vassoio emette `roll-accepted`); 2D leggeri: `dice-3d.enabled` spento, due d6 2D rotolano nel risultato solo per chi tira; con movimento ridotto restano fermi; il DM vede il risultato ma non i dadi                                                                                                                                                                                                                                    | —                                                                                                                                   | Shared Dice DDB (DDB-152), dadi 2D solo per chi tira di Shard (VTL-157), Dice So Nice (FVT-155)                                                                                    | percorso (8), test «stack chips, inspiration switch and 2D style…», schermata 14                                                                        |
| TV-95 dadi intelligenti                                               | Aspetto e prova → Dadi connessi (simulazione) → Associa → Tira con «Connessi»                        | dado simulato associato e rinominato «Pixels di Livia»; il tiro aspetta il dado («In attesa del dado connesso…»), nulla è registrato prima; «Simula il lancio…» registra la faccia con `faceModes: ["connected"]`; i dadi senza dispositivo usano il digitale (come l'estensione Pixels)                                                                                                                                                                                   | —                                                                                                                                   | Pixels per Owlbear (VTL-176), fornitore esterno per dado Foundry (FVT-153)                                                                                                         | percorso «Simulated connected die», test «connected dice…»                                                                                              |
| TV-125 effetti visivi degli incantesimi, disattivabili                | Tavolo in combattimento → Dardo di fuoco digitale sull'Esploratore                                   | dopo il tiro accettato un lampo arancione va da Livia al bersaglio sul livello `dice-tray-fx` (Dardo incantato: dardi viola, Mani brucianti: cono); impostazione «Effetti visivi degli incantesimi»; nulla con movimento ridotto; mai su una pedina nascosta per chi guarda                                                                                                                                                                                                | effetto solo cosmetico, nessuna regola                                                                                              | Automated Animations/Sequencer con opt-out (FVT-103/102), Embers (VTL-180), FX di Roll20 (R20-106)                                                                                 | percorso «TV-125», test «spell effects…», schermata 18                                                                                                  |
| PG-48 politica dei tiri                                               | Preferenze → Tiri e dadi, o Aspetto e prova                                                          | «Chiedi sempre vantaggio o svantaggio»: un clic su un numero apre «Vantaggio o svantaggio?» (Vantaggio / Normale / Svantaggio) prima del tiro; «Chi vede i tuoi tiri di solito»                                                                                                                                                                                                                                                                                            | —                                                                                                                                   | Manage Sheet Roll20 «Query» (R20-032), «Type of Roll: ask every time» Beyond20 (VTL-012)                                                                                           | percorso (10), test «numbers roll in place…», schermata 13                                                                                              |
| CA-26 testo eseguibile nelle voci                                     | Campagna → Resoconto → Modifica → «Il ponte oscilla: @Embed[save:dex:13]» → Salva                    | carta «Tiro salvezza su Destrezza · CD 13»: il DM «Chiedi il tiro…» (scelta dei destinatari e del vantaggio) → carta di richiesta «Dal diario» nel vassoio e nella campanella; il giocatore «Tira: Livia» dal testo e vede il risultato nella carta                                                                                                                                                                                                                        | —                                                                                                                                   | enricher dnd5e `[[/save dex 15]]` con `request` (FVT-146), pulsanti di tiro nelle note di Quest Portal (VTL-051), `@Embed` (FVT-175)                                               | percorso (9), test «chat /r prefills…; journal embeds…», «journal refs…», schermata 12                                                                  |
| B56 «Prova i dadi» assorbita                                          | Dadi → Aspetto e prova → Prova i dadi 3D                                                             | nessuna scheda B56 separata; lo stesso cassetto B56 (preset TS Costituzione, Lancia i dadi) registra il tiro di prova                                                                                                                                                                                                                                                                                                                                                      | —                                                                                                                                   | un solo vassoio come DDB                                                                                                                                                           | percorso «B56 … absorbed», test «the area registers…», schermata 19                                                                                     |

## Criteri di accettazione della scheda

| #   | Criterio                                                                                         | Esito                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | «2d6+1d4+3» digitale o fisico; vantaggio; ultimi tiri ripetibili; formula errata spiegata        | fatto (percorso 1)                                                                                                                                                                                    |
| 2   | Menu da clic destro, pressione lunga e «…»                                                       | fatto (percorso 2 desktop con mouse e tastiera; B telefono con pressione lunga al tocco)                                                                                                              |
| 3   | «Solo DM»: annuncio senza risultato secondo la politica; rivelato solo a Doran                   | fatto dopo la revisione: in questa demo Doran è del DM, quindi la rivelazione va a un personaggio di un giocatore (Livia) e l'elenco non offre più Doran né schede personali (Review and fixes, P1-2) |
| 4   | TS Destrezza CD 13 a Livia e Doran come carte; fisico o digitale; riepilogo; nessuna conseguenza | fatto (percorso 4)                                                                                                                                                                                    |
| 5   | Tiro contrapposto                                                                                | fatto (percorso 5)                                                                                                                                                                                    |
| 6   | Ispirazione eroica: interruttore sulla scheda, ritiro dopo un fallimento, consumo registrato     | fatto (percorso 6)                                                                                                                                                                                    |
| 7   | Pila «copertura +2» sul prossimo tiro                                                            | fatto (percorso 7)                                                                                                                                                                                    |
| 8   | Dadi 2D solo per chi tira, spenti con movimento ridotto                                          | fatto (percorso 8: con movimento ridotto i dadi 2D restano visibili ma non rotolano)                                                                                                                  |
| 9   | Prova scritta nel diario → carta di richiesta                                                    | fatto (percorso 9)                                                                                                                                                                                    |
| 10  | Politica personale «chiedi sempre il vantaggio»                                                  | fatto (percorso 10)                                                                                                                                                                                   |

## Verifiche svolte (25/09/2026)

- `node --test design/blueprint/tests/dice-tray.test.mjs design/blueprint/tests/roll-requests.test.mjs`
  → 29/29.
- `node --test design/blueprint/tests/*.test.mjs` → 1953 test, 1950 superati; i 3 falliti sono
  di `relations-graph` (un'altra area in costruzione nello stesso worktree; in un giro
  precedente fallivano invece 4 test di `generators`, poi passati): nessuno tocca B34.
  `dice-3d`, `chat`, `combat`, `combat-ui`, `notifications`, `registry*` passano.
- Browser (Chromium via playwright-cli, sessione `d20-b34`, server `127.0.0.1:8879`):
  `playwright-cli -s=d20-b34 --raw run-code --filename=changes/interview-01/blueprint-checks/dice-tray-journey.js`
  da `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B34/` →
  17 controlli superati, nessun errore di pagina (IT desktop 1440, giocatore e DM, clic,
  tasti, pressione lunga col mouse, reload; EN telefono 390 × 844 con tocco, pressione lunga
  al tocco, nessuno scorrimento orizzontale).
- Controllo a parte (`20-core-requests-dialog`): la stessa richiesta compare in «Tiri e
  risultati» del core con «Risolvi tiro» (fisico/digitale) e nella campanella («Tiro
  richiesto: Livia · Tiro salvezza · CD 13 · …»).

## Schermate (1440 × 900 salvo il telefono)

In `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B34/`:
01 tiro digitale con i dadi 3D; 02 formula errata spiegata; 03 pila con Mezza copertura;
04 menu del clic destro; 05 tiro nascosto del DM rivelato a Doran; 06 il giocatore vede solo
l'annuncio; 07 carta della richiesta (DM); 08 riepilogo; 09 scheda: Tiri e Ispirazione;
10 ritiro con Ispirazione riuscito; 11 contrapposto; 12 carta nel diario; 13 politica «chiedi
sempre»; 14 dadi 2D; 15–17 telefono EN (vassoio, menu da pressione lunga, richiesta
risolta); 18 effetto del Dardo di fuoco; 19 Aspetto e prova con la prova B56; 20 finestra
«Tiri e risultati» del core con le richieste. Le ho guardate tutte: nessun testo tagliato
nelle parti controllate; i suggerimenti di B30 coprono a volte un angolo della mappa.

## Limiti onesti

- Un solo browser, due identità: «condiviso» significa lo stesso stato locale; nessuna
  sincronizzazione in tempo reale. I dadi 3D di B56 si vedono solo per l'identità corrente al
  momento del tiro.
- La chat (B17) mostra i tiri del vassoio come righe di evento del registro, non come carte
  di tiro: B17 potrà leggere `state.ext["dice-tray"].rolls` (proiettati con `projectRoll`).
- Le richieste seguono il pubblico del core per i tiri accettati: i personaggi dei giocatori
  sono condivisi, le creature del DM riservate. Non c'è una richiesta «cieca» (solo DM) per
  i personaggi dei giocatori: `acceptedRolls` di `state.mjs` non ha questo destinatario e non
  l'ho toccato.
- Il ritiro con Ispirazione eroica di una richiesta si registra accanto alla richiesta: la
  carta, il riepilogo, il registro e B56 usano il nuovo dado; la finestra «Tiri e risultati»
  del core mostra ancora le facce originali (prove immutabili).
- Il tiro contrapposto confronta i totali e basta: l'SRD 5.2.1 non ha una regola generale.
- Dadi connessi solo simulati (nessun Web Bluetooth); la faccia «riportata» viene dal servizio
  `rollDie` al posto del sensore.
- Effetti visivi solo per Dardo di fuoco, Dardo incantato e Mani brucianti (i tre incantesimi
  di combattimento della demo), linee e cono SVG senza risorse grafiche.
- I numeri tirabili sono nel vassoio e nella sezione «Tiri» della scheda; il riquadro
  «Caratteristiche» del core resta con la sua finestra di prova (`characters.mjs` non toccato).
- Sintassi dei dadi: niente ritiri (`r`, `ro`), min/max, gruppi `{…}`, riferimenti `@attr`,
  funzioni; solo dadi standard d4–d100.
- La pila si svuota anche se poi un Annulla di gioco ritira il tiro (sezione `preserve`).
- Correzione e ritiro sono offerti sugli ultimi 10 tiri visibili.
- La sintassi nel diario è il marcatore dell'app `@Embed[save:dex:13]` (unico riconosciuto da
  `text-embeds.mjs`), non `[[/save dex 13]]` di dnd5e.
- Il DM può tirare anche per i personaggi dei giocatori (regola di controllo del core).

## Effetti su percorsi di altre aree (non modificati)

- `dice-3d-journey.js` (B56): apriva la scheda `[data-table-drawer="dice-3d"]`, ora dentro
  Dadi → Aspetto e prova (`.dtray-b56`), e al punto (10c) il «Tiro libero» del Tavolo, ora il
  vassoio. Da aggiornare dal proprietario di B56 o dal coordinatore.
- `chat-review-fixes-journey.js` P3 (B17): `/r d20+5` apriva la finestra «Tiro libero»; ora
  apre Dadi con «1d20+5» e la carta di chat diventa una riga di evento.

## Review and fixes

Revisione indipendente del 25/09/2026 (revisore-correttore, non autore di B34). Stesso
worktree, lavoro non committato. Sessione browser `d20-b34-rf`, cartella delle prove
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B34-rf/`.

### Cosa ho controllato

Le 10 accettazioni della scheda e le capacità TV-83, TV-88…TV-97, TV-125, PG-33, PG-48,
CA-26 nel browser (percorso dell'autore rieseguito, poi uno mio), la fedeltà ai pattern
citati, i controlli finti, la coerenza con scheda, campagna e Tavolo, ruoli e privacy,
offline, Annulla e correzioni, IT/EN, tastiera, telefono 390, test, file condivisi toccati e
posizione secondo B61. Il primo giro del percorso dell'autore passava (17/17): i difetti
sotto non erano coperti dai suoi controlli.

### Difetti trovati e correzioni (prima il test, poi il codice)

| #     | Gravità | Riproduzione (prima della correzione)                                                                                                                                                                                                | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1-1  | P1      | Giocatore, Dadi → Chi tira **Iria** (scheda personale) → Tira: il tiro diventa «Solo io» ma è annunciato; il DM vede «Iria ha fatto un tiro nascosto.» nel vassoio e nel registro condiviso («Iria · tiro nascosto»).                | Corretto: un tiro forzato a «Solo io» (scheda personale, nascosta o fuori campagna) non si annuncia mai; riga di registro privata; il DM non vede traccia né nome (`recordRoll`).                                                                                                                                                                                                                                                                                                                                                                                                           |
| P1-2  | P1      | DM, tiro «Solo DM» → «Rivela a»: l'elenco offriva tutti i personaggi, anche **Iria** (nome di una scheda personale che il DM non può leggere) e **Doran** (del DM: la rivelazione non raggiungeva nessuno).                          | Corretto: `revealTargets` = personaggi condivisi giocati da un giocatore (Livia, Mira); `revealRoll` rifiuta gli altri («Rivela a un personaggio di un giocatore»). Accettazione (3) ora provata con Livia.                                                                                                                                                                                                                                                                                                                                                                                 |
| P2-3  | P2      | Dadi → Livia: TS INT **+3**, TS SAG +1; Doran TS COS **+2**, FOR +0. La scheda (B37) dice INT +5, SAG +3, COS +4, FOR +2 (Mago e Guerriero hanno la competenza nei TS). Le abilità ignoravano `skillModifiers` registrati.           | Corretto: senza valore registrato il TS aggiunge la competenza della prima classe (dati di costruzione, come B37; SRD 5.2.1 multiclasse); `skillModifiers` vince come `savingThrows`. Vassoio = scheda per ogni TS di Livia, Doran, Mira (controllo nel browser). Anche le richieste.                                                                                                                                                                                                                                                                                                       |
| P2-4  | P2      | DM: richiesta TS COS a Doran, Dadi digitali (riga privata), Ispirazione eroica a Doran, «Ripeti un dado»: il registro **condiviso** diceva «Doran · Ispirazione eroica spesa: ripete il d20 11 → 9 = 11 · CD 20: fallimento».        | Corretto: il ritiro ha il pubblico della risposta (`requestIsPrivate`): riga privata ed evento `roll-accepted` privato per le creature del DM.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| P2-5  | P2      | DM: diario `@Embed[save:dex:13]` → «Chiedi il tiro…»; giocatore: «Tira: Livia» nel testo creava un **altro** tiro del vassoio; la richiesta restava «In attesa» (carta, campanella, «Tiri e risultati»).                             | Corretto: `rollFromEmbed` risponde alla richiesta aperta del diario per quella creatura (digitale, fisico o risultato noto dopo Annulla); senza richiesta tira sul posto come prima. Il pulsante dice «· richiesto dal DM» e la carta nel testo mostra la risposta.                                                                                                                                                                                                                                                                                                                         |
| P2-6  | P2      | Dadi → «Fisici», poi clic su TS DES (o nella scheda → Azioni → Tiri): il tiro era **digitale**. I tiri sul posto non avevano mai dadi fisici (regola: fisici e digitali ovunque ci sia un tiro).                                     | Corretto: scelta personale ricordata «Dadi per i tiri sul posto» (Preferenze › Tiri e dadi, Aspetto e prova, o «Dadi» del vassoio). Fisici: finestra «Facce del dado fisico» (un d20, due con vantaggio/svantaggio), campo a fuoco, Invio registra, faccia errata rifiutata (Foundry manual fulfilment, FVT-153). Connessi: attesa del dado nel vassoio (Pixels).                                                                                                                                                                                                                           |
| P2-7  | P2      | DM: richiesta a Livia → «Concludi la richiesta»; giocatore: «Tiri e risultati · 1» e «Risolvi tiro» ancora attivi, campanella ancora con la richiesta.                                                                               | Corretto: concludere porta i tiri in attesa del gruppo a «Non più applicabile» nella coda (campanella e dialogo smettono di chiederli); Riapri li rimette in attesa; le risposte date restano.                                                                                                                                                                                                                                                                                                                                                                                              |
| P2-7b | P2      | Dopo P2-7: il giocatore annulla una sua risposta precedente; lo stato torna a prima della chiusura ma «chiusa» restava nella sezione `preserve`: carta conclusa e tiro di nuovo chiesto.                                             | Corretto: «conclusa» sta sui tentativi della coda insieme agli stati che ritira (una sola istantanea); le carte chiuse prima della revisione leggono ancora l'elenco della sezione.                                                                                                                                                                                                                                                                                                                                                                                                         |
| P2-12 | P2      | Livia **Trattenuta**: TS DES dal vassoio con un solo d20; richiesta del DM TS DES senza svantaggio; Avvelenata: prove normali; Paralizzata: TS FOR tirabile; Indebolimento ignorato. Il core applica già queste regole ai TS d'area. | Corretto: `conditionTest` legge `conditionSaveRules` del core: Indebolimento −2 per livello su ogni prova con d20 (tra le fonti), Trattenuto → svantaggio ai TS DES, Avvelenato → svantaggio alle prove, Paralizzato/Pietrificato/Stordito/Privo di sensi → fallimento automatico ai TS FOR/DES (rifiuto nel vassoio con il motivo; nella richiesta riga «Fallimento automatico (Paralizzato)», nessun dado chiesto). Vantaggio + svantaggio si annullano; il risultato dice «svantaggio (Trattenuto)». Spaventato non è dedotto (serve la vista della fonte): lo sceglie chi tira o il DM. |
| P3-8  | P3      | PG-48 offriva solo «Tira subito» e «Chiedi sempre».                                                                                                                                                                                  | Corretto: aggiunti «Sempre con vantaggio» e «Sempre con svantaggio» (Roll20 Always, Beyond20); Maiusc/Ctrl e il menu restano più forti.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| P3-9  | P3      | Il menu «…» del pulsante Tira cambiava per sempre modalità e destinatari del modulo (il pattern DDB-149 vale per un tiro).                                                                                                           | Corretto: il menu decide solo quel tiro; con dadi fisici e vantaggio/svantaggio il modulo passa alla modalità scelta per chiedere la seconda faccia.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| P3-10 | P3      | I pulsanti «…» (`aria-haspopup="menu"`) non dicevano se il menu era aperto.                                                                                                                                                          | Corretto: `aria-expanded` false/true/false.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| P3-11 | P3      | Richiesta: 9 → Ispirazione 15 = 17; Annulla, «Correggi…» a 19 con motivo: la riga mostrava ancora 17 (il ritiro del vecchio 9).                                                                                                      | Corretto: il ritiro vale finché le facce ritirate sono quelle accettate; una correzione lo supera (21 · Successo); un secondo ritiro non è offerto.                                                                                                                                                                                                                                                                                                                                                                                                                                         |

### Non difetti o fuori da B34 (con motivo)

- **Accettazione (3) «rivela solo a Doran»**: Doran è un personaggio del DM in questa demo;
  la rivelazione a un giocatore è provata con Livia (unico altro giocatore della demo).
- **Pulsante «Tira» sotto la pila dei modificatori** (bisogna scorrere nel pannello): scelta
  di impaginazione, non un controllo finto; Invio nella formula tira e il fuoco torna al
  pulsante. Lasciato com'è.
- **Tre scelte digitali/fisici al Tavolo** («Azioni · Dadi» del core, barra rapida B53,
  «Dadi» del vassoio): quella del vassoio ora è la scelta personale ricordata per i tiri sul
  posto; unificarle tocca `combat-ui.mjs` (variabile locale del core) e B53: decisione del
  coordinatore.
- **Core e B40 senza competenza di classe nei TS**: `dexteritySaveModifier` e il TS di
  Concentrazione in `combat.mjs`, e `testModifier` di `special-moves-domain.mjs` (B40), usano
  il valore registrato o il solo modificatore. Nessun effetto sui dati della demo (Livia e
  Doran non hanno competenza in DES; nessuno dei due si concentra con competenza in COS), ma
  va allineato fuori da B34.
- **PG-48 «spareggio» e «critico»**: lo spareggio DES dell'iniziativa e le opzioni del
  critico appartengono a iniziativa e attacchi, non al vassoio; qui c'è «Tira come critico»
  per i dadi dei danni.
- **Ispirazione eroica superata da una correzione** (P3-11): resta spesa; nessun rimborso
  automatico (lo può ridare chi gioca o il DM con l'interruttore).

### File

Solo file di B34, nessun file condiviso toccato in questa revisione:
`design/blueprint/dice-tray.mjs`, `dice-tray-domain.mjs`, `roll-requests.mjs`,
`tests/dice-tray.test.mjs` (rivelazione a Livia invece di Doran),
`tests/dice-tray-review.test.mjs` (nuovo, 11 test),
`changes/interview-01/blueprint-checks/dice-tray-journey.js` (passi 3 e 9 secondo P1-2 e
P2-5), `changes/interview-01/blueprint-checks/dice-tray-review-journey.js` (nuovo).

### Verifiche (25/09/2026)

- `node --test design/blueprint/tests/dice-tray.test.mjs design/blueprint/tests/roll-requests.test.mjs design/blueprint/tests/dice-tray-review.test.mjs`
  → 40/40.
- `node --test design/blueprint/tests/*.test.mjs` → 2020/2020 (un giro intermedio aveva 2
  test di `scene-assets` rossi, area in lavorazione di un altro, passati al giro dopo).
- Browser, sessione `d20-b34-rf`: percorso dell'autore aggiornato
  (`dice-tray-journey.js`, immagini in `B34-rf/journey/`) → 17/17, nessun errore di pagina;
  percorso della revisione (`dice-tray-review-journey.js`) → 11/11, nessun errore di pagina
  (IT desktop 1440 giocatore e DM, clic, Maiusc+clic, tastiera con Invio ed Esc, pannello
  delle condizioni; EN telefono 390 × 844 al tocco, nessuno scorrimento orizzontale).
- Schermate guardate: `r03` scheda con TS INT +5, `r06` finestra delle facce fisiche,
  `r07` «Tiri e risultati» con la richiesta conclusa «Non più applicabile», `r08` telefono EN,
  `r09` TS DES con «svantaggio (Trattenuto)»; `baseline/` è il primo giro prima delle
  correzioni.
