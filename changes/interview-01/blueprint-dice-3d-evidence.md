# B56 — Presentazione dei tiri digitali: dadi animati — prove

24/09/2026. Worktree `d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non
committato. Area costruita solo tramite il registro (B11): **nessun file condiviso
modificato** (`extensions.mjs` elencava già `dice-3d`; nessun hook aggiunto).

## In breve

Quando l'app accetta un tiro digitale, i dadi 3D rotolano e **si fermano sulla faccia già
registrata**; non decidono né rilanciano nulla. Prove e tiri salvezza con CD usano la
schermata di Baldur's Gate 3 (d20 grande al centro, CD e modificatori, poi SUCCESSO o
FALLIMENTO letto dal registro); gli altri tiri rotolano sul Tavolo con un riepilogo, come
D&D Beyond, Dice So Nice e i dadi di Owlbear. I dadi fisici non si animano: si vede la
faccia inserita. Un tiro nascosto non arriva mai a chi non può vederlo. Colore dei dadi per
persona, dadi spegnibili, movimento ridotto (B22, scelta del dispositivo o sistema), salto
con clic, tocco o Esc. Sul Tavolo il cassetto **Prova i dadi** permette al proprietario di
provarli, passando dal servizio dei dadi digitali dell'app (`rollDie` di `state.mjs`).

## File

Nuovi (tutti di B56):

- `design/blueprint/dice-3d.mjs` — modulo d'ingresso `register(registry)`: sezione di
  stato `dice-3d` (`undo: "preserve"`), impostazioni personali e del dispositivo, cassetto
  del Tavolo, ascolto di `roll-accepted` e `compendium:roll`, strato globale (popover nel
  top layer), coda delle scene, salto, cassetto «Prova i dadi».
- `design/blueprint/dice-3d-domain.mjs` — puro: dal tiro accettato alla presentazione per
  un ruolo (visibilità, CD, esito registrato, modificatori, dadi tenuti/scartati), record
  della prova (validazione, ritiro e correzione motivati, riuso delle facce ritirate),
  elenco dei tiri recenti proiettato per ruolo.
- `design/blueprint/dice-3d-geometry.mjs` — puro: poliedri veri (d4 tetraedro, d6 cubo,
  d8 ottaedro, d10 trapezoedro pentagonale con aquiloni planari, d12 dodecaedro, d20
  icosaedro; d100 = due d10 decine/unità), numerazione reale (facce opposte n+1, d10 cifre
  a somma 9), orientamento di riposo sulla faccia registrata, traiettoria di rotolamento,
  proiezione prospettica e disegno Canvas 2D (nessuna libreria, nessun WebGL).
- `design/blueprint/dice-3d.css` — stili `.dice3d-*` con `registerStyles`.
- `design/blueprint/tests/dice-3d.test.mjs` — 22 test.
- `changes/interview-01/blueprint-checks/dice-3d-journey.js` — percorso nel browser.

## Dove si trova (≤ 2 clic)

| Contesto                                               | Percorso                                                                                                                                      | Chi                      |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| Ogni tiro digitale accettato                           | automatico: Tavolo (attacchi, danni, TS, concentrazione, morte), iniziativa, Dadi Vita, creazione del personaggio, Compendio, tabelle casuali | chi può vedere quel tiro |
| Tavolo → **Prova i dadi** (cassetto)                   | 1 clic dal Tavolo                                                                                                                             | giocatore e DM           |
| Preferenze → **Dadi animati** / **Movimento dei dadi** | 1 clic (ingranaggio nell'intestazione)                                                                                                        | ognuno per sé            |

## Capacità → prova

| Capacità (censimento)                                                                       | Percorso                                                                                                                           | Comando e risultato                                                                                                                                                                                                                                                                          | Regola / fonte                                                                                                                                                                             | Pattern adottato                                                                                                                                 | Prova                                                                                      |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| TV-94 dadi animati condivisi e disattivabili; B56 «il d20 si ferma sulla faccia registrata» | Tavolo → Dardo di fuoco digitale su un goblin                                                                                      | d20 rotola (due fotogrammi del canvas diversi), si ferma sul valore di `combatAttempts[].requests[attack].values`, riepilogo «[8] + 5 = 13 · Colpito» letto da `outcomes[0].hit`; danni d10 nella stessa scena                                                                               | combat.mjs decide colpo/critico; il dado non ricalcola                                                                                                                                     | D&D Beyond Shared Dice «un tiro = un risultato» (DDB-152), Dice So Nice (FVT-155), vassoio Owlbear (VTL-113)                                     | percorso (11), test «a digital attack tumbles…», schermata 10                              |
| B56 «TS con CD mostra successo/fallimento»; CRP-131                                         | Tavolo → Mani brucianti; DM → Tiri e risultati → Sentinella → Risolvi tiro digitale                                                | schermata BG3 sopra la finestra aperta (popover nel top layer): «Tiro salvezza su Destrezza · Mani brucianti», CD 13 da `targets[].saveDC`, «+2», 10 + 2 = 12, FALLIMENTO = `outcomes[].saveSuccess`                                                                                         | SRD 5.2.1 Saving Throw EN p.187 / IT p.218, D20 Test EN p.180 / IT p.212: riuscita se totale ≥ CD; nessun successo automatico con 20 naturale (solo i TS contro la morte hanno un effetto) | BG3 roll screen: d20 al centro, CD e modificatori, esito dopo l'animazione (CRP-131). Deviazione dichiarata: niente critico sui TS (regole 2024) | percorso (12), test «a save with a DC…», schermata 11                                      |
| Stessa schermata per la prova                                                               | Tavolo → Prova i dadi → «Tiro salvezza su Costituzione · Livia · CD 12» → Lancia i dadi                                            | +2 dal punteggio COS 14 (stessa fonte della concentrazione in combat.mjs), CD 12, esito salvato nel record e nel registro («… CD 12: fallimento · dado digitale»)                                                                                                                            | stessa regola; il modificatore segue `savingThrows[x]` poi il modificatore di caratteristica                                                                                               | BG3 (CRP-131)                                                                                                                                    | percorso (1), test «the drawer builds a pool…», schermate 02–03                            |
| Concentrazione e TS contro la morte                                                         | domanda di combattimento esistente                                                                                                 | CD e riuscita letti da `request.dc/success` e da `outcome.vitality` (20 naturale: «recupera 1 PF»; 1 naturale: «due fallimenti»)                                                                                                                                                             | SRD 5.2.1 concentrazione p.179; TS contro la morte EN 17–18 / IT 19–20                                                                                                                     | BG3 (CRP-131)                                                                                                                                    | test «concentration and death saves…»                                                      |
| TV-86 dadi fisici: «si mostra la faccia inserita»                                           | Prova i dadi → Fisici → faccia 15                                                                                                  | nessuna animazione (`data-animate=false`), tessera «d20 · 15 · Dado fisico: faccia inserita», SUCCESSO; in combattimento lo stesso per ogni richiesta fisica                                                                                                                                 | I-229: le facce fisiche sono prove                                                                                                                                                         | Foundry facce manuali per dado (FVT-153)                                                                                                         | percorso (4), test «physical, reused and corrected…», schermata 06                         |
| B56 «tiro nascosto non visibile all'altro ruolo»; TV-90, TV-91                              | DM: Prova i dadi → «Solo io (tiro nascosto del DM)»; combattimento: TS dei goblin                                                  | il DM vede «Solo DM»; al cambio di ruolo lo strato si svuota; il giocatore non lo riceve, non lo elenca, non può rivederlo; il TS del goblin è `private` nel registro e assente dai «Tiri recenti» del giocatore                                                                             | `rollVisibleTo` (registry.mjs); proiezioni di combat.mjs                                                                                                                                   | Dice So Nice: dadi visibili solo a chi vede il tiro (FVT-155); modalità Foundry (FVT-150); destinatari Dice+ (VTL-173); DDB (DDB-149)            | percorsi (10) e (12), test «a hidden DM roll…», schermata 12                               |
| B56 «nessun cambio al risultato registrato»; correzioni motivate                            | Prova i dadi → Correggi (solo fisico) / Ritira; combattimento → Annulla ultima modifica → Riapplica risultato noto                 | correzione 15→5 con motivo, storia «(prima 15)», presentata senza animazione; digitale: nessuna correzione, solo ritiro motivato; nuovo tiro identico riusa le facce ritirate una volta («Facce riusate»); Undo del TS: faccia invariata, nessuna nuova animazione; riapplica: stessa faccia | I-229 (riuso una volta delle facce ritirate), DEVELOPMENT.md «dice evidence»                                                                                                               | FG/Foundry correzione con motivo (TV-86)                                                                                                         | percorsi (4), (5), (13), test «withdrawal and correction…», «corrections and withdrawals…» |
| Riepilogo e dettaglio del tiro; TV-87                                                       | Prova i dadi → Tiri recenti → Rivedi                                                                                               | «Rivedi» ripete l'animazione sulle stesse facce (stessa traiettoria, seme dal tiro) e non aggiunge tiri; elenco dei tiri che il ruolo può vedere da registro, Compendio e prova                                                                                                              | —                                                                                                                                                                                          | Game Log DDB: clic sul tiro per il dettaglio (DDB-148); ultimi tiri Owlbear (VTL-113)                                                            | percorso (6), test «recent rolls join…»                                                    |
| TV-94 disattivabili; aspetto personale                                                      | Prova i dadi → I tuoi dadi; Preferenze → Dadi animati                                                                              | colore per persona (Rubino per il giocatore, Oro per il DM) visto anche dagli altri; «Mostra i dadi animati» spento: il tiro resta registrato, nulla a schermo; salvato dopo il reload                                                                                                       | impostazioni `personal` del registro (FVT-188)                                                                                                                                             | DDB set personali e vassoio con impostazioni 3D (DDB-151/152), Dice So Nice aspetto per utente (FVT-155)                                         | percorsi (7), (9), test «colour is per identity…», schermate 07, 09                        |
| B22 movimento ridotto; «riduzione del movimento mostra subito il risultato»                 | Prova i dadi → Movimento su questo dispositivo → Ridotto; Preferenze → Movimento ridotto «Sempre attivo»; `prefers-reduced-motion` | nessun rotolamento: dadi fermi sulla faccia e risultato subito, niente dissolvenze                                                                                                                                                                                                           | B22 scrive `data-motion="reduced"` sulla radice; qui letti anche il suo campo e la media query                                                                                             | Owlbear segue il sistema (SVC-167), Alchemy «disable visual motion» (SVC-166)                                                                    | percorsi (8), (8b), test, schermata 08                                                     |
| Salto con clic/tocco/Esc                                                                    | durante il rotolamento                                                                                                             | clic o tocco: il risultato compare subito e il clic non passa alla pagina sotto; Esc: salta (sopra una finestra aperta raggiunge anche la finestra); secondo Esc chiude; chiusura automatica                                                                                                 | —                                                                                                                                                                                          | Dice So Nice (clic nasconde), BG3 (salto)                                                                                                        | percorsi (2), (14)                                                                         |
| Prova per il proprietario                                                                   | Tavolo → Prova i dadi                                                                                                              | d4–d100 (fino a 10 dadi), modificatore, CD facoltativa solo con un d20, chi tira, digitali/fisici, destinatari «Tutto il tavolo»/«Solo io»; offline: il tiro per il tavolo è rifiutato prima di estrarre facce, «Solo io» resta locale                                                       | facce digitali da `rollDie` (state.mjs), mai un generatore proprio                                                                                                                         | aggiunta dadi e Tira di Owlbear (VTL-113), vassoio DDB (DDB-151)                                                                                 | percorsi (1)–(7), test «offline…», schermate 01, 04–05                                     |
| EN, telefono 390, tocco                                                                     | EN da Preferenze; Tavolo → Try the dice                                                                                            | «Tap to skip», «Constitution saving throw», «Difficulty Class», «Success/Failure», nessun overflow orizzontale                                                                                                                                                                               | —                                                                                                                                                                                          | —                                                                                                                                                | percorso (14), schermate 13–14                                                             |

## Comandi eseguiti

```sh
node --test design/blueprint/tests/dice-3d.test.mjs         # 22/22
node --test design/blueprint/tests/*.test.mjs               # 1070/1070 (24/09, con le aree in corso)
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B56
playwright-cli -s=d20-b56 open http://127.0.0.1:8879/
playwright-cli -s=d20-b56 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/dice-3d-journey.js
```

Esito del percorso: 15 controlli superati, nessun errore di pagina (IT desktop 1440 come
giocatore e DM, due incontri reali, reload; EN telefono 390 con tocco).

Schermate 1440×900 in `d20-blueprint-evidence/2026-09-24/B56/`: 01 cassetto, 02 d20 in
rotolamento, 03 d20 fermo + FALLIMENTO/SUCCESSO, 04–05 tutti i dadi, 06 dado fisico, 07 dadi
Rubino dopo il reload, 08 movimento ridotto, 09 Preferenze, 10 Dardo di fuoco, 11 TS
nascosto del DM sopra la finestra, 12 tiri recenti del giocatore senza il TS nascosto;
13–14 telefono EN. Tutte guardate: nessun testo tagliato o sovrapposto nello stato finale
(durante il rotolamento il d20 in aria passa dietro il riquadro della CD, voluto).

Regressione: copie dei percorsi esistenti con tiri digitali, con le schermate deviate in
`B56/regression/shots/` per non toccare le prove altrui: `compendium`, `random-tables`,
`builder-dice`, `encounter-lifecycle`, `rest-shared` superati con i dadi attivi.
`dice-correction`, `combat-mobile`, `conditions-death` si fermano prima dei tiri sul
pulsante «Richieste/Requests» dell'intestazione, che non esiste più (cambiato da un'altra
area); `approach` richiede di eseguire prima `spatial-journey`. Non dipendono da B56.

## Scelte

- **Solo presentazione.** Il modulo non genera mai il risultato di un tiro esistente:
  ascolta `roll-accepted` (derivato dall'host dopo un commit, mai per anteprime o rifiuti)
  e `compendium:roll`, poi legge facce, CD ed esito dal record. La prova registra le
  proprie facce con `rollDie` dentro un commit ed emette `roll-accepted` da sé, come B25.
- **Correzioni di Undo** (`correction: true`) e riapplicazioni non sono tiri nuovi: niente
  animazione. Facce riusate o corrette si mostrano ferme, con l'etichetta.
- **Chi vede cosa:** `rollVisibleTo` per ogni tiro; il cambio di ruolo, il ripristino e il
  cambio di lingua svuotano subito lo strato e la coda.
- **Strato globale** `div.dice3d-layer` sotto `document.body` (eccezione prevista dal
  registro per B56) con `popover="manual"`: resta sopra una finestra modale aperta (il DM
  vede il TS mentre risolve le richieste). Blocca il puntatore solo durante il rotolamento;
  dopo, la pagina resta usabile e un clic chiude. Esc è trattenuto solo mentre i dadi
  rotolano e nessuna finestra è aperta.
- **Movimento:** traiettoria calcolata (rotolamento lungo la direzione di lancio, rimbalzi
  decrescenti, arrivo esatto nell'orientamento di riposo), seme dal tiro: «Rivedi» è
  identico. Non è una simulazione fisica; il risultato non dipende mai dal moto.
- **Raffica di tiri:** un commit con più tiri (attacco + danni) è una sola scena; le prove
  con CD hanno ciascuna la propria schermata; un nuovo tiro accorcia l'attesa del
  risultato già a schermo; al massimo 6 scene in coda e 20 dadi 3D per scena (il resto nel
  riepilogo).
- **Impostazioni:** `dice-3d.enabled` e `dice-3d.color` personali (per identità, stato
  condiviso con commit locale privato, mai annullate dall'Undo); `dice-3d-device.motion`
  del dispositivo. Il colore di chi tira è quello che vedono tutti.

## Limiti onesti

- Dimostrazione in un solo browser con due identità: l'animazione compare a chi fa il tiro;
  «gli altri» la vedono solo come proiezione (elenco, «Rivedi»), senza sincronizzazione in
  tempo reale. Nessun backend.
- Il «Tiro libero» del core (ispettore → «Tira i dadi») registra solo un'etichetta e non
  emette `roll-accepted`: non si anima finché B34 non lo sostituisce. Il cassetto «Prova i
  dadi» non è il vassoio di B34 (niente sintassi dei dadi, menu vantaggio, richieste).
- Dadi senza forma reale (d2, d3, facce di tabelle personalizzate) e danni del Compendio con
  dadi misti di cui la formula non dice l'ordine: mostrati come tessere piatte, mai con un
  dado inventato.
- Tiro nascosto che «si annuncia» senza risultato (Bones!, VTL-172; C4): non adottato,
  resta politica da decidere; oggi l'altra persona non riceve nulla.
- Nessun suono dei dadi (B22 ha il volume; qui non si riproduce audio), nessun set di dadi
  oltre ai sei colori, nessun effetto speciale sul 20 naturale, nessuna modalità «leggera»
  2D separata (VTL-157, SVC-172): il Canvas 2D è già leggero ma non misurato su dispositivi
  lenti.
- Rendering con ombreggiatura piatta e prospettiva semplice; numeri in Times bold; il d4 è
  «letto in alto» (numero sul vertice superiore).
- Verificato in Chromium (Playwright) a 1440 e 390; non in Safari/Firefox (il popover ha un
  ripiego a strato fisso se manca).

## Review fixes

24/09/2026, dopo la revisione di B56 (prove del revisore in
`d20-blueprint-evidence/2026-09-24/B56-review/`, script r1–r18). Ogni rilievo è stato
riprodotto (test o browser) prima della correzione. Solo file di B56 toccati: nessun file
condiviso modificato, nessun hook aggiunto.

| Rilievo                                                                          | Esito                                                    | Cosa cambia per chi gioca                                                                                                                                                                                                                                                                                                                                                                                                                         | Dove / prova                                                                                                                                                                                                                           |
| -------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1** Tiro di prova di Iria (scheda personale) «Tutto il tavolo» visibile al DM | **Corretto**                                             | Se chi tira è una scheda personale, una creatura nascosta o un personaggio fuori dalla campagna, «Tutto il tavolo» è disattivato con il motivo («Iria è una scheda personale: il tiro resta solo tuo») e il tiro resta privato: record, riga del registro ed evento `roll-accepted`. Stessa regola del core (`state.mjs` acceptedRolls). Un record salvato prima come «condiviso» per una scheda personale resta comunque solo a chi l'ha tirato. | `forcedPrivateReason`, `validateDemoInput`, `canSeeDemo` in `dice-3d-domain.mjs`; test «a practice roll for a personal sheet stays private…»; percorso (10b); `review-fixes/p1-*.png` (DM: niente Iria in Tiri recenti né in Registro) |
| **P2** Esc sui dadi chiude anche la finestra sotto                               | **Corretto**                                             | Esc agisce solo sui dadi, lo strato più in alto: il primo salta, il secondo chiude; la finestra «Tiri e risultati» resta aperta con il focus dentro, e il DM risolve il tiro seguente senza riaprirla. Alla chiusura dei dadi il focus torna dov'era se era andato perso.                                                                                                                                                                         | `onKey`, `restoreFocus` in `dice-3d.mjs`; percorso (12); `review-fixes/probe2.js` (1 finestra aperta dopo Esc durante il rotolamento e dopo la chiusura; il terzo Esc chiude la finestra)                                              |
| **P2** Focus perso dopo «Lancia i dadi» e dopo un cambio di aspetto              | **Corretto**                                             | Dopo il tiro il focus resta su «Lancia i dadi»; le frecce scorrono i colori senza uscire dal gruppo; un tiro rifiutato conserva le facce scritte.                                                                                                                                                                                                                                                                                                 | una sola resa per commit in `rollDemo`, `ui.focus` impostato prima di `setSetting`; test «keyboard focus stays…»; percorsi (1) e (7)                                                                                                   |
| **P2** I tiri di prova nel registro sembrano tiri veri                           | **Corretto**                                             | Ogni riga comincia con «Tiro di prova · …» / «Practice roll · …» (anche ritiro e correzione), la schermata BG3 dice «LIVIA · TIRO DI PROVA», i Tiri recenti hanno il badge «Tiro di prova». Il DM parte da «Nessuna creatura» o dalla sua creatura selezionata, mai da un personaggio dei giocatori.                                                                                                                                              | `logLabel`, `defaultDemoActor`; test «practice rolls read as practice…»; percorso (1)                                                                                                                                                  |
| **P2** Tiri recenti ignora gli Annulla                                           | **Corretto**                                             | Un tiro il cui commit è stato annullato resta elencato come prova ma con «Annullato con «Annulla»: risultato conservato», senza «Rivedi» (stessa regola di `combat-ui.mjs` renderRollHistory).                                                                                                                                                                                                                                                    | `recentRolls` (`revertsId`), `replayRoll`; test «a roll reverted by Undo…»; percorso (13); `review-fixes/p2-reverted-row.png`                                                                                                          |
| **P2** «Tira i dadi» del Tavolo senza animazione                                 | **Corretto**                                             | Il tiro libero dell'ispettore mostra gli stessi dadi (digitale: rotola e si ferma sulla faccia registrata; fisico: tessera senza animazione) ed entra nei Tiri recenti come «Tiro libero», con la visibilità della riga del registro. L'Undo (correzione) non è un tiro nuovo. Letto dall'etichetta con `parseFreeRoll` di B17 finché B34 non registra un tiro strutturato.                                                                       | ascolto `commit` + `freeRollFromEntry`; test «the Table's free roll…»; percorso (10c); `review-fixes/p2-free-roll-landed.png`                                                                                                          |
| P3 Scena del ruolo precedente nel DOM nascosto                                   | **Corretto**                                             | Alla chiusura il contenuto dello strato si svuota; al cambio di identità anche la regione `aria-live`.                                                                                                                                                                                                                                                                                                                                            | `finishCurrent`, `clearDice`; percorso (10)                                                                                                                                                                                            |
| P3 «Clic o Esc per saltare» anche a dadi fermi                                   | **Corretto**                                             | A dadi fermi (o senza animazione: fisici, riusati, movimento ridotto) il suggerimento diventa «Clic o Esc per chiudere» / «Tocca per chiudere».                                                                                                                                                                                                                                                                                                   | `hintText`; percorsi (1) e (14)                                                                                                                                                                                                        |
| P3 Schermata BG3 tagliata col telefono in orizzontale                            | **Corretto**                                             | Con altezza ≤ 520 px la schermata si compatta: a 844×390 titolo, CD, dado ed esito stanno tutti a schermo (`scrollHeight` 390 = `clientHeight`).                                                                                                                                                                                                                                                                                                  | `@media (max-height: 520px)` in `dice-3d.css`; percorso (14); schermata 15                                                                                                                                                             |
| P3 d4 illeggibile sul tavolo                                                     | **Corretto**                                             | Il d4 fermo ha sotto un piccolo cartellino con il valore registrato, nei colori del dado.                                                                                                                                                                                                                                                                                                                                                         | `drawValueBadge` in `dice-3d-geometry.mjs`; `review-fixes/p3-all-dice-d4-badge.png`                                                                                                                                                    |
| P3 Colore letto al momento della visione                                         | **Corretto**                                             | Il colore è salvato nel tiro di prova: «Rivedi» mostra il colore con cui è stato tirato anche dopo un cambio. I tiri delle altre aree (che non portano un colore) usano ancora il colore attuale di chi tira, dichiarato «lo vedono tutti».                                                                                                                                                                                                       | `color` nel record e in `roll-accepted`; test «the dice colour is saved with the roll…»                                                                                                                                                |
| P3 (1) limite applicato prima del filtro                                         | **Corretto**                                             | Tiri recenti mostra fino a 8 tiri presentabili.                                                                                                                                                                                                                                                                                                                                                                                                   | `recentRolls`; test «recent rolls fill the limit…»                                                                                                                                                                                     |
| P3 (2) Due comandi di movimento ridotto in Preferenze                            | **Corretto**                                             | Tolta la sezione di dispositivo «Movimento dei dadi»: resta solo «Movimento ridotto» di B22. Il cassetto offre la stessa scelta di B22 (stesso valore, non un secondo). Senza B22 i dadi seguono il sistema. Un vecchio valore salvato di `dice-3d-device.motion` è ignorato.                                                                                                                                                                     | test di registrazione e «colour is per identity…» con l'area B22 reale; percorsi (8), (9)                                                                                                                                              |
| P3 (3) Schermata BG3 per ogni TS di mostro                                       | **Corretto**                                             | La schermata BG3 (CRP-131: la prova del personaggio) resta per i personaggi e per le prove del cassetto; il TS di una creatura (`kind: "npc"`) rotola sul tavolo con CD ed esito nel riepilogo, come BG3 mostra i TS nemici nel registro di combattimento: il puntatore è trattenuto solo durante il rotolamento (circa 1,3 s), poi il riepilogo in basso lascia vedere e usare la finestra; prima la schermata piena la copriva per circa 4,5 s. | `describeRoll` (layout); test «a creature's save rolls on the table…»; percorso (12); `review-fixes/p2-npc-save-tumble-over-dialog.png`                                                                                                |
| P3 (4) Esito ricalcolato quando manca                                            | **Non è un difetto di comportamento; corretta la frase** | Quando il combattimento non ha ancora registrato l'esito (TS di Mani brucianti risolto prima dei danni), si applica la stessa regola che `combat.mjs` userà (totale ≥ CD, riga 1716; SRD 5.2.1 «Saving Throws»). Le frasi sopra «esito letto dal registro» / «mai ricalcolato» vanno lette così: esito registrato quando c'è, altrimenti la regola SRD identica a quella del motore.                                                              | commento in `describeCombat`; test «a save with a DC…» (caso senza esito)                                                                                                                                                              |

### Frasi precedenti superate

- «Esc: … sopra una finestra aperta raggiunge anche la finestra» e «Esc è trattenuto solo
  mentre i dadi rotolano e nessuna finestra è aperta»: ora Esc resta sempre ai dadi finché
  sono a schermo.
- La riga «TS con CD mostra successo/fallimento» con la schermata BG3 per la Sentinella:
  ora il TS della creatura rotola sul tavolo con CD ed esito; la schermata BG3 resta per i
  personaggi e per la prova del cassetto.
- «Movimento su questo dispositivo» e l'impostazione `dice-3d-device.motion`: rimosse.
- Limite «il Tiro libero del core … non si anima finché B34»: ora si anima (letto
  dall'etichetta).
- `dice-3d.test.mjs`: 30 test (erano 22).

### Comandi eseguiti

```sh
node --test design/blueprint/tests/dice-3d.test.mjs          # 30/30
node --test design/blueprint/tests/preferences.test.mjs design/blueprint/tests/chat*.test.mjs design/blueprint/tests/registry*.test.mjs   # 60/60
node --test design/blueprint/tests/*.test.mjs                 # 1133/1154, vedi sotto
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B56
playwright-cli -s=d20-b56 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/dice-3d-journey.js
playwright-cli -s=d20-b56 --raw run-code --filename=review-fixes/probe1.js   # anche probe2.js, probe3.js
```

Suite completa (due esecuzioni, 24/09 ~04:55): i 21 fallimenti sono tutti in
`handouts`, `help`, `home`, `session-prep` e `token-menu`, aree che altri stanno
modificando in questi minuti (`help.mjs` non esporta più `bindTip`; `token-menu` aggiunge
«rotate»); nessuno di quei test carica `dice-3d`. Tutti i test di B56, B22, chat e registro
passano.

Percorso aggiornato: 17 controlli superati, nessun errore di pagina (nuovi: 10b Iria
privata, 10c tiro libero, Esc e focus in (12), «Annullato» in (13), orizzontale in (14)).
Le prove esplorative `review-fixes/probe1–3.js` confermano gli stessi punti con le
schermate in `B56/review-fixes/`.

## Review fixes (round 2)

24/09/2026, dopo la seconda revisione di B56 (prove del revisore in
`d20-blueprint-evidence/2026-09-24/B56-review/round2/`). Ogni rilievo è stato riprodotto
prima della correzione; le copie degli script del revisore, con le schermate reindirizzate,
e le sonde nuove sono in `d20-blueprint-evidence/2026-09-24/B56/review-fixes-2/`. Toccati
solo file di B56 (`dice-3d.mjs`, `dice-3d.css`, `dice-3d-domain.mjs`,
`tests/dice-3d.test.mjs`, `blueprint-checks/dice-3d-journey.js`): nessun file condiviso,
nessun hook aggiunto.

| Rilievo                                                                                                                       | Esito        | Cosa cambia per chi gioca                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Dove / prova                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P2** Il clic o l'Invio che chiude la schermata BG3 arriva al comando nascosto sotto (un secondo tiro)                       | **Corretto** | La schermata della prova (BG3, CRP-131) resta modale finché si chiude: il clic o il tocco che la chiude (e quello che salta il rotolamento) finisce sulla schermata; Invio e Spazio saltano e poi chiudono come il clic; Tab resta sulla schermata. Vale anche senza animazione (dado fisico, movimento ridotto). Il suggerimento dice «Clic, Invio o Esc per chiudere» / «Click, Enter or Esc to close» (al tocco resta «Tocca per chiudere»). I dadi sul tavolo, a riposo, continuano a lasciar passare clic e tasti (Dice So Nice). | `onKey`, `onPointer`, `onClick`, `forDice` in `dice-3d.mjs`; CSS `[data-layout="check"]`; test «a check screen keeps the closing click…»; percorso (2b), (12), (14)                                                          |
| **P2** Il comando «Movimento ridotto» del cassetto ha lo stesso nome di quello di B22: il percorso di B22 si ferma al passo 4 | **Corretto** | Nel cassetto il comando si chiama «Movimento ridotto (tutta l’app)» / «Reduced motion (whole app)»: stessa impostazione di B22, ma si capisce che vale per tutta l'app e non ha più lo stesso nome del comando in Preferenze.                                                                                                                                                                                                                                                                                                          | etichetta in `renderDrawer`; test «the drawer's reduced-motion choice is named apart…» (IT ed EN, confronta l'etichetta registrata da B22); copia di `preferences-journey.js` senza modifiche ai selettori: 12/12 alle 08:31 |
| P3 Danni del Compendio: «[2, 3] = 7» senza il bonus fisso                                                                     | **Corretto** | Il riepilogo, la regione `aria-live` e Tiri recenti leggono «[2, 3] + 2 = 7».                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `compendiumModifier` in `dice-3d-domain.mjs`; test «a compendium damage roll adds up…»; `s5-compendium.js`: «Lupo · Morso · danni [3, 1] + 2 = 6»                                                                            |

### Riproduzioni prima e dopo

- Clic che chiude (desktop, giocatore, cassetto): prima `ext["dice-3d"].rolls` passava da 1
  a 2 (revisore, `s3-clickthrough.js`); ora resta 1, e sotto il puntatore c'è la schermata
  (`pointer-events: auto`), non «Lancia i dadi».
- Invio che chiude (tastiera): prima `enterOnLandedCreatesRoll: true`; ora `false`, il
  focus resta su «Lancia i dadi» e Maiusc+Tab durante il rotolamento non lo sposta
  (`s6-keyboard.js`).
- Tocco che chiude (telefono 390): 1 → 1 tiri, schermata chiusa (`s7-phone-tap-through.js`).
- Spazio, Tab, dado fisico e movimento ridotto (`probe-keys.js`): Spazio chiude senza
  tirare, Tab lascia la schermata aperta, il clic di chiusura sopra «Lancia i dadi» non
  registra nulla sia col dado fisico sia col movimento ridotto; i dadi sul tavolo a riposo
  lasciano ancora passare il clic (comportamento scelto, invariato).
- In combattimento (caso che il revisore aveva solo dedotto), `probe-combat-click.js` e
  `probe-combat.js`: il DM registra il TS di Doran (un eroe: schermata BG3) sopra «Tiri e
  risultati». Sopra una finestra modale il browser tratta lo strato dei dadi come inerte:
  `elementFromPoint` al centro di «Risolvi tiro» della Sentinella restituisce proprio quel
  pulsante, anche se la schermata lo copre. Il caso era quindi reale, e con il codice
  precedente anche il clic che salta il rotolamento sopra una finestra arrivava alla
  finestra. Ora i clic, i tocchi e i tasti diretti a una finestra aperta _prima_ dei dadi
  appartengono ai dadi: il clic di chiusura chiude solo i dadi (stato invariato, nessun
  modulo «Registra tiro» aperto, finestra ancora aperta), Invio non attiva «Chiudi» della
  finestra. Una finestra aperta _dopo_ i dadi sta sopra di loro e tiene i suoi clic e tasti.
  Un `click()` lanciato da uno script non viene mai trattenuto.

### Nota sul Compendio (B16 in corso)

Mentre correggevo, B16 ha cambiato il proprio flusso: i tiri del Compendio ora arrivano
come tiri del registro (`roll-accepted`, `source: "compendium"`) con il modificatore del
piano, e i record nuovi usano `values` invece di `faces`. Il percorso di B56 per i record
vecchi (`compendium:roll` e record con `faces`) è corretto comunque; nel browser il tiro
passa ora dal registro e si legge «[3, 1] + 2 = 6». Da segnalare al coordinatore, non
modificato qui: il nuovo tiro di B16 porta sia `actorName` («Lupo») sia un'etichetta che
comincia con lo stesso nome, quindi il riepilogo dice «Lupo · Lupo · Morso · danni»; e
`actorName` è in una sola lingua (quella di chi tira).

### Frasi precedenti superate

- «Clic o Esc per chiudere» sulla schermata BG3: ora «Clic, Invio o Esc per chiudere»
  (i dadi sul tavolo mantengono «Clic o Esc…»).
- «Il puntatore è trattenuto solo durante il rotolamento» (TS di una creatura sopra la
  finestra, prima revisione): resta vero per i dadi sul tavolo a riposo; ma prima di questa
  correzione, sopra una finestra modale, nemmeno il clic durante il rotolamento era
  trattenuto. Ora lo è.
- La schermata BG3 non lascia più passare il clic di chiusura: la frase «click, tap or Esc
  skips, then closes» vale ancora, ma il clic che chiude non raggiunge la pagina.
- `dice-3d.test.mjs`: 33 test (erano 30). Percorso: 18 voci (nuova (2b); (12) include il TS
  di Doran; (14) include il tocco di chiusura).

### Comandi eseguiti

```sh
node --test design/blueprint/tests/dice-3d.test.mjs                  # 33/33
node --test design/blueprint/tests/dice-3d.test.mjs design/blueprint/tests/preferences.test.mjs
node --test design/blueprint/tests/*.test.mjs                         # vedi sotto
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B56
playwright-cli -s=d20-b56 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/dice-3d-journey.js
playwright-cli -s=d20-b56 --raw run-code --filename=review-fixes-2/s3-clickthrough.js   # anche s5, s6, s7, probe-*, prefs-journey-copy
```

Risultati (24/09, 08:20–08:40):

- Percorso B56: 18 voci superate, nessun errore di pagina (eseguito tre volte; l'ultima
  dopo l'ultima modifica).
- Suite completa, due esecuzioni: 1288/1290 e poi 1295/1296. I fallimenti cambiano da
  un'esecuzione all'altra e sono tutti in aree che altri stanno modificando in questi
  minuti: `preferences.test.mjs` «sheet-only panel…» e `campaign-settings.test.mjs` «view
  as…» nella prima, `assistant.test.mjs` nella seconda (`preferences.mjs` e
  `assistant-domain.mjs` modificati alle 08:36–08:39). Nessuno dei test falliti riguarda
  `dice-3d`. Tutti i test di B56 passano.
- Copia di `preferences-journey.js` di B22 (solo le schermate reindirizzate): 12/12 alle
  08:31, compreso il passo 4 che prima si fermava. Rieseguita alle 08:39 si ferma più
  avanti, al passo sulle unità («units note EN», testo della nota di B22), dopo che
  `preferences.mjs` era cambiato; il passo 4 passa.
