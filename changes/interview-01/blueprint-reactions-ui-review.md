# Review indipendente — integrazione UI delle reazioni

23/09/2026, reviewer `blueprint_module_review`, stesso modello/effort della
sessione coordinatrice. Review circoscritta dell'incremento 3 nel worktree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Nessuna modifica al codice applicativo; questo è l'unico file scritto dal reviewer.

## Candidata esaminata

Working tree non committato, base HEAD `f7ef92dcc32f82765ed9bafe6593cc4f957743e7`.
Gli hash identificano i byte esaminati, non un'approvazione del commit base.
Snapshot SHA-256 finale del 23/09/2026, dopo la formattazione e le ultime
correzioni UI confermate dal coordinatore. Il dominio è elencato come dipendenza
letta per verificare l'integrazione, senza sostituirne la review indipendente.

| File in `design/blueprint/`          | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `reaction-ui.mjs`                    | `c977100fbb319f8aaca978c1eb3b16b1d34a4fafc5db3fb5bec1742b478e7099` |
| `combat-ui.mjs`                      | `bd662ad26bc47013ae006b8c102f05e40a39362b4c98af88e4b687eb82cee8b4` |
| `table.mjs`                          | `f8a09d24ddedb87ce4bf61589f71bec78e3951e13eb5b3983a4007a04c0453f1` |
| `characters.mjs`                     | `fe5dd38383cfa38c74fbe44497606c1ee35b748f9955f046f64d2e0186c3aec7` |
| `app.mjs`                            | `f418899e3569101503e9da6c21fc2bf1e1067d89db60568efb00ca19fd475c85` |
| `combat.mjs`                         | `94256d036306a32002fc649e72a69555c95534e7030d82e398faf4925c59c932` |
| `tests/character-reactions.test.mjs` | `c0770f2c7df5748e5bef2d690fc1cd06d58907d6cc18a1233f812d4b44c31fc5` |

## Esito

Nessun P1/P2 residuo nel perimetro esaminato, dopo le correzioni sotto.
Il dominio è oggetto della review separata di `review_journey`. La presente
review controlla chiamate UI, permessi e proiezioni, prosecuzione causale,
correzioni della scheda e comprensibilità dei blocchi. Non approva tutte le
regole del dominio, il blueprint completo o una baseline del prodotto.

### Rilievi risolti e ricontrollati

- **P2 — effetti della concentrazione precedente non rimossi dalla scheda.**
  `recordConcentration` e `end-concentration` sostituivano/azzeravano il record
  senza rimuovere gli effetti con il vecchio `concentrationId`. Il nuovo helper
  `characters.commit` conserva l'ID precedente, rimuove solo gli effetti di
  quell'istanza e poi chiama `refreshConsequences`, nello stesso commit.
  Repro tramite gli handler reali: sia sostituzione sia fine eliminano
  `old-focus` da un altro attore e conservano `other-focus`. Il test aggiunto
  dal coordinatore verifica anche scadenza del TS precedente, PF e slot invariati.
- **P2 — ordine simultaneo impossibile per il giocatore con una fonte nascosta.**
  Con due opportunità simultanee e una fonte nascosta, la proiezione esponeva
  `orderRequiresDM=true` ma la UI proponeva un ordine con un solo candidato;
  l'invio falliva sempre con `Include each simultaneous reaction exactly once`.
  `renderReactionRequests` ora spiega il coordinamento del DM senza esporre il
  modulo incompleto; `openOrder` verifica lo stesso flag. Repro ricontrollato:
  spiegazione presente, nessun comando ordine al giocatore, handler obsoleto
  senza effetto, nessuna identità nascosta, due candidati e comando disponibili al DM.

La prima segnalazione sul recupero di Costituzione era superata da una modifica
concorrente del coordinatore. Non rimane aperta: `characters.commit` richiama
`refreshConsequences`; correggere CON attraverso `edit-character` porta la
richiesta da `needsData=true` a `false` con modificatore numerico corretto.

## Evidenza eseguita

- `node --test design/blueprint/tests/*.test.mjs`: **109 pass, 0 fail**
  dopo la formattazione; 105/105 nella precedente
  esecuzione durante la review, prima degli ultimi test aggiunti dagli autori.
- Ultimi ritocchi ricontrollati: movimento formattato con massimo due decimali
  secondo la lingua, senza cambiare lo stato; pulsante del tiro pendente
  etichettato Riduci richiesta/Minimize request. Test mirati di tabella,
  combat UI e integrazione scheda rieseguiti dopo questi ritocchi: **5/5 pass**.
- Harness Node temporanei in stdin, senza file aggiunti: chiamate agli handler
  reali di `bindCharacters` e `bindReactionRequests`, con contesto/dialogo
  simulati. Verificati recupero CON, fine/sostituzione della concentrazione e
  ordinamento con fonte nascosta nei due ruoli.
- Per entrambe le risposte **Usa/Rinuncia Scudo** contro un critico digitale
  già accettato dal DM, il danno prosegue nel medesimo commit, con
  `automatic=true`, `mode=digital`, `resolvedBy=dm`. La proposta non consuma;
  la rinuncia conserva la reazione; l'uso la consuma una volta.
- Lettura di `app.dialog` e degli handler reazione: Esc/Riduci chiude il
  dialogo senza callback di rinuncia e senza mutazione. L'apertura del dialogo
  nel harness non cambia richiesta o risorse. La prova del tasto nel browser
  resta responsabilità della sessione coordinatrice.
- La preparazione aggiorna il repertorio solo mediante `combatActionId`
  esplicito; il test dedicato verifica rimozione/ripristino dell'azione e
  assenza di inferenza da un nome libero di magia.

Nessun browser aperto o controllato da questo reviewer. Nessuna prova umana
di gioco, sicurezza backend o sincronizzazione reale è implicata da questi
controlli locali. Riferimenti: `BLUEPRINT_CONTRACT`, `TABLE_REACTIONS`,
`design/blueprint/DEVELOPMENT.md` e `blueprint-reactions-research.md`.
