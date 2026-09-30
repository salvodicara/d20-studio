# Blueprint: correzione delle facce dopo Undo e profili dei dadi ricalcolati

23/09/2026. Autore del fix, non review indipendente. Chiude il rischio concreto
lasciato in `HANDOFF_CLAUDE.md` (Incremento 10, "Rischio concreto"). Candidato
dirty, identificato dagli hash sotto; serve ancora una review separata.

File: `combat.mjs` (fdd4f76309f4), `state.mjs` (fbcc407a8b6b),
`combat-ui.mjs` (c42f5fb2f61b), `tests/combat-evidence.test.mjs`
(0293ad576d3a), `tests/combat-ui.test.mjs` (88ce4e7140b5). Hash SHA-256 abbreviati.

## Rischio riprodotto

Dopo Undo, `rollEvidence` conservava solo `{acceptedValues, mode}` per id di
richiesta. `requestFor` ricopiava quelle facce su qualsiasi richiesta ricreata
con lo stesso id, anche se il profilo dei dadi era cambiato. Prima del fix i
test mostravano:

- **digitale, da colpo a critico e viceversa**: la correzione della faccia
  d'attacco falliva in blocco (`invalid-dice`). 1d6 `[3]` veniva riassociato a
  2d6, e 2d6 `[3,4]` a 1d6. Non si poteva correggere nulla.
- **fisico**: la richiesta danni 2d6 riceveva `acceptedValues [3]`, quindi
  qualunque inserimento veniva respinto come "facce già registrate".
- **privacy**: facce accettate quando la scheda era personale diventavano
  leggibili dal DM se la richiesta veniva ricreata dopo l'ingresso in campagna
  (`personal:false`).

## Fix

- `rollEvidence[id]` ora salva anche `dice`, `personal` e `owner` (`state.mjs`,
  `restoreCombatEvidence`).
- Il nuovo helper puro `knownEvidence(evidence, request)` (`combat.mjs`) decide il riuso.
  Con profilo identico riusa tutte le facce. Con profilo ricalcolato tiene,
  per ogni gruppo di dadi con le stesse facce, le prime facce nell'ordine
  originale: `knownValues` con `null` per i dadi mancanti. Le altre diventano
  `supersededValues`, in `recomputedFrom`. La regola è fissa, così nessuno può
  scegliere quale dado tenere. Se tutte le facce sono note diventano
  `acceptedValues`. Le prove legacy senza `dice` vengono riusate solo se
  ancora compatibili, altrimenti sono tutte sostituite. La provenienza
  personale resta personale.
- `resolveRoll` tratta come prova registrata anche le facce note parziali.
  Cambiarle richiede `correctionReason`; `previousValues` conserva quelle note.
- `resolveAutomaticRolls` riusa le facce note e tira in digitale **solo** i
  dadi mancanti. Se le facce note erano fisiche, lascia la richiesta in attesa
  delle facce digitate. Non sovrascrive più `mode:"physical"` di una prova riusata.
- Storico (`acceptedRolls`): quando compare una richiesta ricalcolata con facce
  incompatibili, viene aggiunta una voce `status:"superseded"`. La voce contiene
  facce originali, profili vecchio/nuovo, facce tenute e sostituite, con lo stesso
  pubblico della richiesta. Il tiro risolto porta `knownValues` e `recomputedFrom`.
- UI: il dialogo **Completa il tiro** mostra le facce note in sola lettura,
  il cambio di profilo (`1d10 → 2d10`) e i campi solo per i dadi mancanti
  (fisici, oppure digitali su invio). Una correzione motivata resta dentro i
  dettagli. **Riapplica risultato noto** e il dialogo ordinario spiegano le facce
  sostituite. "In attesa" elenca le facce già note. Lo storico dei tiri mostra
  correzione (`Corregge 15 · Motivo: …`), facce riusate e facce sostituite.

## Verifiche

- `node --test design/blueprint/tests/*.test.mjs`: 482 test, 476 passati. I 6
  falliti sono i test noti di `conditions-ui.test.mjs`, in attesa del modulo.
- Nuovi test: 8 dominio in `combat-evidence` e 2 UI in `combat-ui`. Coprono
  colpo↔critico digitale e fisico, Undo più reload più correzione ripetuta
  senza rilanci, autorità corrente, provenienza personale, privacy della
  creatura nascosta (proiezione e storico del giocatore) e mappatura per
  gruppo e legacy.
- Browser reale (`http://127.0.0.1:8879/`), script
  `d20-blueprint-evidence/2026-09-23/dice-correction-journey.js` con risultato
  `.result.json`, zero errori di pagina. Percorso: Dardo di fuoco fisico 15/2,
  doppio Undo, correzione a 20 con motivo, 2d10 con il 2 noto, solo il secondo
  dado digitato, danno 5 critico. Poi doppio Undo, reload, correzione a 15:
  il 2 è tenuto, il 3 sostituito e riapplicato senza dadi. Immagini:
  `dice-completion-dialog.png`, `dice-superseded-reapply.png`,
  `dice-correction-history.png`.
- Autorità: dopo Undo, se il giocatore perde il controllo, non può riapplicare,
  e la continuazione automatica di un'altra identità non rilancia né
  riapplica. Era già corretto; ora è coperto da test.

## Limiti rimasti

- La corrispondenza vale per indice di gruppo con le stesse facce. Basta per il
  raddoppio dei critici attuale. Profili diversi (per esempio un dado
  aggiuntivo di un altro tipo) finiscono tra le facce sostituite, senza riuso.
- Riapplicare facce già note non crea una nuova voce di tiro. Nello storico la
  voce originale resta "Annullato · risultato conservato"; nel registro
  sessione la riapplicazione appare solo come etichetta del commit.
- Ripetere una correzione dopo averla annullata crea una nuova voce
  `superseded`. È voluto: ogni commit racconta ciò che ha fatto.
- Nel flusso UI normale un attacco digitale nasce e si risolve nello stesso
  commit, quindi Undo lo rimuove del tutto. Il ramo digitale con dadi mancanti
  si raggiunge solo con continuazioni separate (reazioni, avvicinamento). Lì è
  coperto dai test di dominio, non da un percorso browser.
- `reaction-ui.mjs` chiama `resolveAutomaticRolls(s, rollDie)` come prima.
  Non serve alcuna modifica.
- Per `DEVELOPMENT.md`, proprietà del coordinatore, si suggerisce una riga:
  "rollEvidence conserva dice/personal/owner; `knownEvidence` riusa le facce
  compatibili per gruppo, sostituisce le altre (`status:"superseded"` nello
  storico) e non rilancia mai facce note".
