# Correzioni dopo le review B11b (aree) e incremento 10 (condizioni)

24/09/2026. Autore delle correzioni, non review indipendente. Candidato dirty nel worktree
`codex/interview-01`, nessun commit; serve una review separata sugli hash in fondo.
Base: rilievi delle review B11b (`d20-blueprint-evidence/2026-09-24/B11b-review/`) e
incremento 10 (`.../inc10-review/`), [chiusura inc10](blueprint-conditions-closure.md),
[integrazione del registro](blueprint-registry-integration.md). Regole: SRD 5.2.1 EN/IT, copie
locali in `d20-studio-experience-evidence/` (pdf verificati per la regola sul massimo a 0 PF).

## Esito

- Ogni rilievo è stato riprodotto prima della correzione (sonde delle review rieseguite); i
  nuovi test sono stati scritti prima delle correzioni e falliscono se si toglie la correzione
  corrispondente (14 mutazioni provate su una copia, ognuna fa fallire almeno un test).
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: **649/649** (log
  `d20-blueprint-evidence/2026-09-24/B11b-fix/suite.log`). All'avvio erano 632 (non 621: altri
  agenti ne avevano aggiunti); i miei nuovi test sono 17, in
  `design/blueprint/tests/review-fixes-b11b-inc10.test.mjs`.
- Browser, sessione `d20-b11b-fix`, cwd `d20-blueprint-evidence/2026-09-24/B11b-fix/`, log
  `<script>.log`, zero errori di pagina:

  | Script                                   | Esito                                                |
  | ---------------------------------------- | ---------------------------------------------------- |
  | `registry-smoke-journey`                 | 18/18                                                |
  | `core-journey`                           | 13/13                                                |
  | `conditions-journey`                     | 11/11, nessun rilievo                                |
  | `conditions-death-journey`               | 7/7                                                  |
  | `dice-correction-journey`                | 7/7, nessun rilievo                                  |
  | `b11b-inc10-fixes-journey` (nuovo)       | 11/11                                                |
  | `review-probe-journey` della review B11b | tutti i valori ora attesi (`review-probe-after.log`) |

  Immagini: `report-plain-warning-1440.png`, `header-areas-390-fixed.png`,
  `table-dm-390-fixed.png`, `topline-player-390.png`, `death-save-reapply.png`,
  `correct-zero-refused.png`.

## Rilievi B11b (registro e aree)

| Grav. | Rilievo                                                       | Stato    | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P2    | Rifiuti di `ctx.commit` mostrati come guasti dell'area        | Corretto | Il rifiuto offline ha `{it, en}` (il messaggio resta nella lingua corrente, perché alcuni moduli mostrano `error.message`). Un `Error` semplice lanciato da un mutator esce con `refusal: true`; `registry.invoke` mostra il motivo senza avviso. TypeError e altri bug restano avvisi. Il pulsante della fixture di riferimento mostra il rifiuto invece di un errore non gestito.    |
| P2    | Ciclo di vita degli strumenti del Tavolo                      | Corretto | `activate` gira dopo il bind del Tavolo che resta a schermo, ogni volta che la modalità nomina lo strumento (chip, `table.setMode`, ritorno a Muovi). `deactivate` gira al cambio di modalità, uscendo dal Tavolo (`leaveTable()` dal render della shell), al cambio di ruolo e a Ripristina (`resetTableView`).                                                                       |
| P2    | Scorciatoie delle aree che sottraggono tasti al core          | Corretto | Invio e Spazio semplici e Mod+A/C/V/X sono scorciatoie riservate del core in ogni contesto: un'area che le chiede le perde e il report lo dice. Il listener non esegue mai un comando per Invio/Spazio su un controllo a fuoco, né per Mod+A/C/V/X/Z/Y/Shift+Z dentro un campo di testo. Mod+Z resta assegnabile fuori dai campi: un test esistente lo prevede.                        |
| P3    | Bozza d'area non chiesta dopo una bozza del core              | Corretto | `navigate(pagina, parametri, "core")` segna la sola conferma del core e chiede ancora la protezione dell'area; `true` resta «tutto confermato». Stessa cosa al cambio di ruolo e da hash/Indietro.                                                                                                                                                                                     |
| P3    | Sezione di campagna nascosta al ruolo                         | Corretto | Titolo «Sezione non disponibile per questo ruolo» e pulsante «Torna alla panoramica». Una sostituzione nascosta di una sezione del core lascia la sezione del core.                                                                                                                                                                                                                    |
| P3    | Etichetta del chip sostituito (Misura/Puntatore)              | Corretto | Il chip usa etichetta e icona della sostituzione visibile.                                                                                                                                                                                                                                                                                                                             |
| P3    | Avviso e report delle aree                                    | Corretto | Un avviso del registro aggiorna subito la striscia (logger dell'host). L'avviso apre il report già in vista. Sotto ogni area, ogni avviso è una frase semplice («Il comando «Comando rotto» non ha funzionato.») con il dettaglio tecnico sotto. L'elenco tecnico finale resta.                                                                                                        |
| P3    | Navigazione su telefono con pagine d'area                     | Corretto | A ≤ 720 px la navigazione va su una seconda riga: niente scorrimento invisibile. A 390 px con due aree tutte e sei le voci sono visibili. Senza aree resta su una riga a 360 e 390 px; a 320 px va su due righe invece di scorrere nascosta. La seconda riga segue lo `space-between` esistente (resta un dettaglio estetico).                                                         |
| P3    | Primo render bloccato dai controlli / ordine delle Preferenze | Corretto | Ogni controllo HEAD ha un limite di 4 s. Se scade, l'area risulta «con errori» con un messaggio e non viene importata. `index.html` mostra «Caricamento del blueprint…» fino al primo render. Le Preferenze scrivono prima le impostazioni del dispositivo, poi cambiano lingua e rete, infine le scritture personali e di campagna (queste ultime richiedono lo stato di rete nuovo). |

## Rilievi incremento 10 (condizioni e sopravvivenza)

| Grav. | Rilievo                                               | Stato                             | Cosa è cambiato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----- | ----------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P1    | Undo concede un nuovo tiro vitale                     | Corretto                          | Ogni tiro vitale ha un'identità di ritentativo: tipo, chi tira, soggetto, tipo di aiuto, episodio a 0 PF del soggetto (l'istanza Privo di sensi da 0 PF, o da knockout per il risveglio) e, in iniziativa, il turno del TS o dell'azione Aiuto. `enqueueVitalityRequest` riprende le facce ritirate come gli attacchi: il modulo offre solo «Riapplica risultato noto» e lo storico dice «Riusato». Le facce valgono una volta: un tiro accettato dopo, con la stessa chiave, le consuma. Senza questa regola il ritentativo fuori iniziativa le avrebbe riusate anche al tiro successivo. |
| P2    | Facce personali visibili al DM dopo il collegamento   | Corretto                          | `projectAttempts` toglie `outcome.vitality` (naturale, totale, esito, ore del d4) a chi non è il proprietario né chi l'ha risolto. L'interfaccia mostra «Registrato» invece di «In attesa del tiro».                                                                                                                                                                                                                                                                                                                                                                                       |
| P2    | Due TS contro la morte nello stesso turno             | Corretto                          | `rollBlocker` scade un TS chiesto fuori iniziativa quando la creatura è nell'ordine, e un TS legato a un turno fuori dal suo incontro attivo. A ogni inizio turno le richieste così scadono: resta un solo TS in coda.                                                                                                                                                                                                                                                                                                                                                                     |
| P2    | Termine del compagno rimosso non collegato            | Corretto                          | Riga di `state.mjs` applicata (`{ turnKey: pending.previousTurnKey }`). Test attraverso il vero `createStore().commit`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| P2    | «Correggi PF e stato» porta a 0 PF                    | Corretto                          | Rifiutati PF 0 da PF > 0 (`zero-by-correction`: usa Danno) e massimo 0 (`max-hp-zero`, SRD EN p. 17 / IT p. 19: la creatura muore, si registra con «Morto»). Messaggio sotto il campo, Applica disabilitato. `min` dei campi allineato (PF 1, oppure 0 se già a 0; massimo 1).                                                                                                                                                                                                                                                                                                             |
| P3    | Barra DM del Tavolo a 390 px                          | Corretto                          | La riga del titolo va a capo e la barra resta nella larghezza. DM: 390 px invece di 544, tutti i pulsanti visibili. Giocatore: il titolo sta su una riga e i due pulsanti vanno sotto. Prima il titolo andava su due righe; nessun overflow in entrambi i casi.                                                                                                                                                                                                                                                                                                                            |
| P3    | `CONDITIONS_FLOW.md` e `DEVELOPMENT.md` non allineati | Parziale                          | `DEVELOPMENT.md`: nuova sezione breve sui contratti cambiati qui. `CONDITIONS_FLOW.md` è del coordinatore: modifiche richieste sotto.                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| P3    | TS contro la morte illimitati fuori iniziativa        | Non cambiato: serve una decisione | Vedi «Non difetti e decisioni».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |

## Non difetti e decisioni

- **TS contro la morte fuori iniziativa senza limite (inc10 P3).** Il comportamento
  corrisponde al contratto attuale: fuori iniziativa «Tira contro la morte» crea la richiesta
  una volta, e dopo la risoluzione se ne può chiedere un'altra. L'SRD lega il TS all'inizio del
  turno e non dice come scandirlo fuori dall'iniziativa. Scegliere è una decisione di prodotto:
  - A: solo il DM può chiedere il TS fuori iniziativa;
  - B: un TS per ogni avanzamento del tempo di gioco (per esempio 6 secondi o un turno fuori
    combattimento, F-060);
  - C: un TS per richiesta, com'è oggi.

  Non l'ho imposta. La correzione del P1 impedisce comunque di ritirare lo stesso TS con Undo.

- **Mod+A «bloccato» nella sonda B11b.** La sonda premeva Control+A su macOS, dove Control+A
  porta il cursore a inizio riga e non seleziona tutto: la selezione 0 veniva da lì. Il difetto
  però c'era, perché il comando dell'area partiva e annullava l'evento. La nuova journey usa
  ControlOrMeta+A e verifica la selezione di 5 caratteri.
- **Storico delle condizioni dopo il collegamento (inc10 P2).** Il DM continua a vedere le righe
  di stato («Fallimenti 0 → 1», scadenza del recupero). Descrivono lo stato ora condiviso della
  scheda, non le facce: dopo il collegamento quello stato è leggibile comunque. Il d4 si può
  ricavare dalla scadenza. Nasconderlo richiederebbe una regola di privacy sullo stato storico,
  da decidere nel contratto.
- **Consumo delle facce anche per gli attacchi.** `reversedEvidence` è condivisa: ora anche un
  attacco identico, dopo un ritentativo già applicato, tira dadi nuovi (prima riusava di nuovo
  le facce ritirate, per esempio in un secondo attacco con lo stesso bersaglio e turno).
  `dice-correction-journey` 7/7 e le suite di combattimento passano senza modifiche.
- **Preferenze.** Se una scrittura personale o di campagna fallisce dopo il cambio di lingua e
  rete, questi restano applicati. Sono scelte già validate; oggi solo le scritture del
  dispositivo possono fallire per lo storage.

## Richieste fuori riserva

1. **`docs/interview/CONDITIONS_FLOW.md` (coordinatore):**
   - Frontiera: togliere «politica a 0 PF per i personaggi creati dal builder» e «stile dedicato
     del badge». Togliere anche la frase sul termine del compagno rimosso, ora chiuso.
   - COND-03/COND-10: dire che un'applicazione privata oggi nasce solo dal dominio. Il pannello
     invia sempre `visibility: "shared"` e offre solo «Origine riservata». In alternativa si
     aggiunge il controllo.
   - COND-05: «Non porta a 0 PF» ora è applicato. Aggiungere che un massimo di 0 PF si registra
     come morte.
   - COND-06: un TS chiesto fuori iniziativa e ancora pendente scade quando la creatura entra
     nell'ordine. Undo e poi la stessa richiesta riusano la faccia, anche per Medicina e d4.
   - Aggiungere che un Dado Vita chiude il knockout (chiusura inc10, punto 7).
   - Registrare la decisione aperta sul ritmo dei TS fuori iniziativa (sopra).
2. **`changes/interview-01/blueprint-checks/README.md`:** aggiungere
   `b11b-inc10-fixes-journey.js`, con cartella prove `2026-09-24/B11b-fix/`. Notare che serve un
   server locale e che le sonde passano solo per intercettazione.
3. **`docs/interview/BLUEPRINT_STATUS.md`:** gli stessi aggiornamenti del punto 1, se lo stato li
   riporta.
4. **`DEVELOPMENT.md`:** restano da scrivere le sezioni complete dell'incremento 10 e di B11,
   chieste dai rapporti precedenti (`combatTurnKey`, `canReadVitals`, callback `ctx`,
   `ctx.registry`...). Qui ho aggiunto solo i contratti cambiati.

## Limiti

- La scorciatoia riservata non copre i tasti di sistema oltre questi (per esempio Mod+P, Mod+F).
  Il palette B23 potrà ampliare l'elenco.
- Il limite di 4 s vale per il controllo HEAD. Un `import()` lento dopo un HEAD riuscito non ha
  un limite proprio: il browser non ne offre uno.
- Browser: solo Chromium (Playwright). Nessuna prova su Safari o Firefox.

## Hash (SHA-256, 12 caratteri)

- `design/blueprint/app.mjs`: `5d0d941b032b`
- `design/blueprint/table.mjs`: `cff9ea146a9d`
- `design/blueprint/registry.mjs`: `d91ad8ef4aba`
- `design/blueprint/extensions.mjs`: `c14606397b85`
- `design/blueprint/campaign.mjs`: `692818a61ffb`
- `design/blueprint/combat.mjs`: `d83c2399038f`
- `design/blueprint/combat-ui.mjs`: `648b3cb9d34c`
- `design/blueprint/conditions.mjs`: `84ea13d21dbb`
- `design/blueprint/conditions-ui.mjs`: `cdae1c35eb1f`
- `design/blueprint/state.mjs`: `bd767874e9da`
- `design/blueprint/styles.css`: `81c83b5aaa2c`
- `design/blueprint/registry.css`: `6d9be0a7b41c`
- `design/blueprint/index.html`: `97e415476d0d`
- `design/blueprint/DEVELOPMENT.md`: `dfac63b44528`
- `design/blueprint/tests/fixtures/sample-extension.mjs`: `3bda646b0978`
- `design/blueprint/tests/review-fixes-b11b-inc10.test.mjs`: `ec4178a12265`
- `changes/interview-01/blueprint-checks/b11b-inc10-fixes-journey.js`: `7230fe85d3b1`

Altri agenti modificano file vicini: un hash diverso non implica una modifica mia.
