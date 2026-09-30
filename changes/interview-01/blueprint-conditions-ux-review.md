# Condizioni e stato vitale: review UX, raccordi e regressioni (incremento 10)

24/09/2026. Review indipendente e **in sola lettura** del delta dell'incremento 10.
Worktree `d20-studio-interview-01`, ramo `codex/interview-01`. Non ho modificato
sorgenti né test e non ho fatto commit. Questo file è l'unico che ho scritto nel worktree.
Le prove temporanee sono rimaste nella scratchpad della sessione. Per il browser ho usato
un pannello separato e una sessione Playwright dedicata (`d20-ux-review`), poi chiusa.

Perimetro: `conditions-ui.mjs/.css` e il modo in cui `app.mjs`, `characters.mjs`,
`table.mjs`, `combat-ui.mjs`, `rest-ui.mjs`, `forms-ui.mjs` e `path-ui.mjs` lo espongono.
Base: [piano UI](blueprint-conditions-ui-plan.md), [rapporto UI](blueprint-conditions-ui.md),
[integrazione root](blueprint-conditions-integration.md), [API](blueprint-conditions-api.md),
`DEVELOPMENT.md` e le matrici di `BLUEPRINT_STATUS.md`.

| File esaminato                       | SHA-256 (12)   |
| ------------------------------------ | -------------- |
| `design/blueprint/conditions-ui.mjs` | `9f2c833545a4` |
| `design/blueprint/conditions-ui.css` | `739378d6d8e4` |
| `design/blueprint/conditions.mjs`    | `eaccc01bc499` |
| `design/blueprint/app.mjs`           | `7128c92ce748` |
| `design/blueprint/characters.mjs`    | `526ccad5c2c8` |
| `design/blueprint/table.mjs`         | `ace7f2193d90` |
| `design/blueprint/combat-ui.mjs`     | `b3a04fa44f5e` |
| `design/blueprint/rest-ui.mjs`       | `a2b6b9a32330` |
| `design/blueprint/forms-ui.mjs`      | `d6bd59e26a5e` |
| `design/blueprint/path-ui.mjs`       | `25ed08253792` |

I file UI e root coincidono con gli hash dei rapporti UI e di integrazione. `forms-ui.mjs`
non compare in quei rapporti.

## Esito in breve

La cosa più importante è che non c'è nessun P1. Da scheda e Tavolo le condizioni si
trovano con un clic. Anteprima, Annulla/Esc e conservazione degli input funzionano nei
percorsi reali. Nei percorsi che ho provato i dati privati non passano all'altro ruolo.
Restano **5 P2** da chiudere prima del checkpoint 10:

- la suite non è verde;
- due controlli browser dei checkpoint 5 e 9 si rompono;
- due percorsi scrivono ancora i PF senza passare dagli eventi vitali;
- la scheda ha due ingressi ridondanti, uno dei quali porta al comando sbagliato;
- i PF temporanei non hanno un comando proprio.

A questi si aggiungono **16 P3** di rifinitura.

## Findings

Severità:

- **P1**: blocca il percorso o la privacy;
- **P2**: da correggere prima del checkpoint 10;
- **P3**: rifinitura o coerenza.

### P2-1 — Suite non verde: un test dei vecchi confini è ormai superato

- **Dove.** `design/blueprint/tests/reactions.test.mjs:300`, test «zero hit points
  alone do not invent concentration loss; incapacitation ends it without a fake roll».
- **Riproduzione.** Da `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`
  eseguire `node --test design/blueprint/tests/*.test.mjs`.
  - Ultima esecuzione: **561 test, 560 PASS, 1 FAIL**. La prima, prima che altri agenti
    aggiungessero test, dava 544/543/1 con lo stesso fallimento.
  - L'asserzione alla riga 310 si aspetta una richiesta di Concentrazione a 0 PF.
  - Con la politica esplicita `death-saves`, i 0 PF producono Privo di sensi, quindi
    Incapacitato, e questo chiude la concentrazione senza tiro. È il comportamento 2024
    atteso dai raccordi («0 PF prima di richieste concentrazione irrilevanti»).
- **Correzione (fuori dalla mia riserva).** È la stessa del rapporto di integrazione,
  richiesta 1: dopo `const state = fixture();` aggiungere
  `delete state.actors.livia.vitalityPolicy;`. Il test torna a descrivere il confine senza
  politica. In alternativa si può riscrivere l'asserzione sul comportamento con politica.
  Senza questa modifica non si può dichiarare una suite verde.

### P2-2 — Due controlli browser dei checkpoint precedenti non sono più eseguibili

- **Dove.**
  - `changes/interview-01/blueprint-checks/forms-journey.js:50-55` (incremento 9);
  - `changes/interview-01/blueprint-checks/builder-advance-journey.js:25-30` (incremento 5).
- **Riproduzione.** Eseguire
  `playwright-cli -s=<nome> --raw run-code --filename=…/forms-journey.js`. Il risultato è
  `TimeoutError: locator.fill … waiting for locator('#dialog [name="hp"]')`.
  - Il pulsante `[data-character-action="hp"]` ora apre il pannello Condizioni sul comando
    Correggi.
  - I campi hanno `data-conditions-field`, non `name`, e non esiste più un submit.
  - `builder-advance-journey.js` cerca il pulsante «Correggi PF» e poi «Registra
    correzione»: nessuno dei due esiste più in `characters.mjs`, quindi fallirà allo
    stesso passo. Lo deduco dal codice: non l'ho eseguito perché richiede prima
    `builder-journey.js`.
- **Correzione.** Nei due script sostituire il vecchio passo con il percorso reale del
  pannello:

  ```text
  [data-character-action="hp"]      (oppure [data-conditions-entry=…] → [data-conditions-command="correct"])
  → [data-conditions-field="hp"] → [data-conditions-field="reason"]
  → [data-conditions-preview] → [data-conditions-apply]
  → chiusura con #dialog footer [data-close]
  ```

  Poi rieseguire le due catene e annotarle nel README dei controlli.

### P2-3 — Due percorsi scrivono PF ed Indebolimento senza passare dagli eventi vitali

- **Primo percorso: «Correggi valori» della scheda.** `patchCharacter`,
  `characters.mjs:155-161`, conserva il danno subito. Riducendo i PF massimi, i PF possono
  scendere a 0 senza `applyVitalityEvent`.
- **Riproduzione del primo percorso.** Con una prova Node sugli stessi moduli:
  1. Livia a 5/22 PF con concentrazione attiva.
  2. `patchCharacter(… maxHp: 10 …)`.
  3. Risultato: `hp 0`, `vitality "dying"`, **nessun** Privo di sensi o Prono,
     concentrazione ancora attiva.
  4. L'unico segnale è la riconciliazione «0 PF senza incoscienza registrata: riconcilia
     lo stato.».
  - Il pannello non offre alcun comando per riconciliare. «Correggi PF e stato» non
    aggiunge l'origine `zero-hp` e un Privo di sensi manuale non termina con la cura.
  - Nel browser la stessa situazione mostra «Morente» sulla pedina senza le condizioni che
    lo accompagnano.
- **Secondo percorso: correzione del riposo.** In `rest-time.mjs:1466-1470` (preview) e
  `correctRestResult` → `setRow`, la correzione scrive direttamente `hp`, `tempHp` ed
  `exhaustion`. Conseguenze:
  - `hp → 0` salta i 0 PF;
  - `0 → n` non chiude l'origine `zero-hp` né azzera i TS contro la morte;
  - `exhaustion → 6` non uccide (resta solo la riconciliazione `exhaustion-death`).
- **Perché conta.** Nella scheda il vecchio correttore diretto dei PF è stato rimosso,
  proprio perché danno, cura e correzione restassero eventi distinti. Questi due percorsi
  lo aggirano di lato.
- **Correzione proposta.** Possono intervenire root, `characters` e `rest-time`.
  - In `patchCharacter`, se un cambio di `maxHp` porterebbe `hp` a 0: passare dalla
    correzione vitale (`applyVitalityChange`, kind `correct`, con motivo), oppure limitare
    `hp ≥ 1` e segnalare.
  - In `previewRestCorrection`, rifiutare `hp: 0`, i passaggi da/verso 0 e i cambi di
    `exhaustion`, con un messaggio che rimanda a «Condizioni e stato». In alternativa,
    delegare quelle righe agli eventi di `conditions.mjs`.
  - Rendere operative le riconciliazioni vitali: nel pannello, un pulsante accanto al
    messaggio che apre il comando giusto.

### P2-4 — Scheda: due ingressi allo stesso dialogo, uno col comando sbagliato, e PF ripetuti

- **Riproduzione (browser, 1280×900, Giocatore, Personaggi → Livia).**
  - La scheda Statistiche vitali mostra **PF 18/22** e il pulsante «Danni, cure e
    correzioni».
  - Subito sotto, il riepilogo ripete **nome (già nel titolo della pagina), PF 18/22, PF
    temporanei** e aggiunge un secondo pulsante «Condizioni e stato».
  - «Danni, cure e correzioni» apre il pannello su **«Correggi PF e stato vitale»**
    (`characters.mjs:1963`, `tab "correct"`). Quel modulo esordisce con «non è danno,
    cura…»: l'etichetta promette danno e cura, ma porta al comando meno frequente.
  - Il riepilogo non ha una cornice: galleggia tra le statistiche e le schede.
- **Riferimento.** In D&D Beyond il riquadro PF apre un solo pannello per danno, cura, PF
  temporanei e TS contro la morte. Le condizioni stanno in un riquadro dell'intestazione.
  Il piano UI stesso chiede «un solo ingresso».
- **Correzione.** Se ne occupa `characters.mjs` e il root. Un solo ingresso:
  - il riquadro PF (o il suo pulsante) apre il pannello **senza preselezione** o su
    Danno;
  - stato vitale, chip delle condizioni e TS contro la morte entrano nel riquadro PF;
  - si eliminano il nome e i PF ripetuti del riepilogo nella scheda. Sul Tavolo il
    riepilogo resta com'è.

### P2-5 — I PF temporanei non hanno un comando

- **Riproduzione.** Nel pannello, «Cura» dichiara «La cura non … concede PF temporanei».
  Non c'è però un altro comando.
  - L'unico percorso è «Correggi PF e stato», che si presenta come correzione di un dato
    sbagliato e chiede un motivo.
  - Concedere PF temporanei (False Life, Heroism, Inspiring Leader e simili) è un gesto di
    gioco frequente. Oggi non è né reperibile né semanticamente corretto.
- **Stato.** È la richiesta di dominio 6, ancora aperta nel rapporto UI.
- **Correzione.** Nel dominio, un evento `temp-hp`: regola 2024, non si sommano, si
  sceglie se tenere quelli esistenti o sostituirli, con la fonte. Nella barra, un comando
  «PF temporanei» con anteprima «tieni X / sostituisci con Y».

### P3 — Rifinitura e coerenza

1. **Gerarchia dei comandi.** Il pulsante dorato «primario» resta su «Aggiungi
   condizione» anche quando è attivo un altro comando (es. Correggi). Quel comando ha solo
   il bordo di `aria-pressed`, visivamente più debole. Con Livia morente convivono due
   primari: «Tira contro la morte» e «Stabilizza». Proposta: primario = comando attivo, un
   solo primario per vista (`conditions-ui.mjs:810`).
2. **Comandi impossibili offerti come attivi.** Con Livia Privo di sensi (Velocità 0):
   - il pannello mostra «Rialzati», la cui anteprima dice «Velocità 0: non può
     rialzarsi»;
   - sul Tavolo «Rialzati» nella barra azioni è **attivo** e al clic mostra solo un toast
     d'errore. Il motivo sta in `title`, invisibile al tocco (`table.mjs` `renderStandButton`);
   - «Effetti in vigore» elenca anche «Può strisciare… o rialzarsi»
     (`conditions-ui.mjs:1306`) mentre la Velocità è 0.

   Disabilitare con motivo visibile, come già fa Cura, o nascondere finché la creatura è
   Incapacitata. Sopprimere la riga su strisciare quando la Velocità è 0.

3. **Testo falso fuori iniziativa.** Il dialogo «Risolvi tiro» della Medicina dice sempre
   «L'azione è già spesa.» (`combat-ui.mjs:117`). Verificato in esplorazione libera:
   `combat.active=false` e `mira.action=true`. Mostrare la frase solo in iniziativa.
4. **Offline: testo fuorviante.**
   - «questa modifica condivisa attende la riconnessione» fa pensare a una coda. In realtà
     nulla viene accodato e Chiudi scarta la bozza.
   - Proposta: «Senza rete non si applica: riconnettiti e premi Applica; i dati restano
     finché il pannello è aperto».
   - «Tira contro la morte» e «Avvia prova di Medicina» restano attivi offline sulle
     creature condivise e falliscono solo con un toast.
5. **Errori non associati al campo.** «Indica un motivo.» compare solo nella colonna
   anteprima. Il campo «Causa (obbligatoria)» non ha `aria-invalid` né
   `aria-describedby`, eppure il piano UI chiede «errori associati al campo».

   Inoltre, finché manca il motivo, l'anteprima non mostra le righe prima/dopo: con 30
   danni, «18 → 0, Privo di sensi, Prono» appare solo dopo. Conviene mostrarle comunque
   con Applica disabilitato.

6. **Indebolimento.** Se si digita il livello nel campo numerico, non si aggiornano né la
   riga d'effetto né lo stato dei pulsanti −/+. `input` marca solo `dirty`, e `change` su
   un campo numerico non ridisegna (`conditions-ui.mjs:1409-1426`). La preview resta
   corretta.
7. **DOM dell'identità precedente.** Come DM ho aperto Condizioni su Sentinella e
   applicato Spaventato con origine riservata «DM-SECRET-ABC». Poi ho chiuso il dialogo e
   sono passato a Giocatore.
   - `document.documentElement.outerHTML` contiene ancora `DM-SECRET-ABC` dentro il
     `#dialog` chiuso.
   - Non è visibile e non è nell'albero di accessibilità: nessun P1.
   - Viola però «renderizzare solo proiezioni permesse».
   - Causa: `refreshConditionsUI` cerca solo `#dialog[open]`, e il `closeDialog` della
     shell non svuota mai `innerHTML`. Lo stesso vale per i dialoghi di riposi, forme e tiri.
   - Correzione nel root: svuotare `#dialog.innerHTML` alla chiusura o al cambio di ruolo.
8. **Colori del percorso da Prono.** `path-ui.mjs` evidenzia solo `multiplier === 2`.
   Strisciare su terreno normale (×2) sembra terreno difficile; strisciare su terreno
   difficile (×3, `spatial.mjs:269`) sembra terreno normale. Il costo testuale resta
   giusto. Usare `>= 2` e uno stile distinto per ×3.
9. **Nessun ritorno al pannello.** Dopo «Tira contro la morte» o «Avvia prova di
   Medicina» il dialogo del tiro sostituisce il pannello. «Torna al gioco» lo chiude e
   bisogna riaprire «Condizioni e stato». Proporre «Torna a Condizioni e stato» quando il
   tiro parte dal pannello.
10. **Ordine dell'inspector e Velocità nella scheda.**
    - Sul Tavolo «Forme e creature collegate» precede il riepilogo vitale. Per una
      creatura morente, stato e TS contro la morte dovrebbero venire prima.
    - Nella scheda, la statistica Movimento mostra «9 m · Velocità base» mentre la Velocità
      effettiva è 0. L'etichetta è corretta, ma manca un rimando all'effetto delle
      condizioni.
11. **Focus iniziale.** Aprendo con un comando preselezionato (per esempio dal pulsante
    PF), il focus va sulla X del dialogo, non sul titolo dell'area di lavoro.
    `panel.focus` viene impostato, ma `show()` non lo applica.
12. **Dettagli di accessibilità e testo.**
    - `role="toolbar"` senza navigazione con le frecce (pattern ARIA): implementarla o
      togliere il ruolo.
    - I bottoni del catalogo hanno `aria-pressed="false"` statico.
    - Inglese incoerente: «metre» in `table.mjs:302`, «meter» nel pannello.
    - La X del dialogo della shell è larga 36 px a 390 px.
13. **Portata dell'Aiuto.** La Medicina non verifica né segnala la distanza tra chi
    soccorre e chi riceve. È un limite dichiarato del dominio, ma l'anteprima dovrebbe
    avvisare «verifica al tavolo che sia a portata».
14. **Undo generico.** «Annulla ultima modifica» nel pannello può annullare una modifica
    non legata alle condizioni (per esempio l'ultimo spostamento al Tavolo) e non dice
    quale. Mostrare il titolo della modifica che verrà annullata.
15. **Fonte dell'origine.** Nell'anteprima, la riga «Origine: Non registrata →
    DM-SECRET-ABC» cita come fonte l'SRD della definizione, ma è un testo scritto a mano
    (dominio, `conditions.mjs:1847`). La fonte di quella riga dovrebbe essere manuale.
16. **Registro condiviso.** Un'applicazione condivisa con origine riservata usa
    `visibility:"private"` per l'intera voce del registro. L'altro ruolo vede la condizione
    sulla pedina ma nessuna voce «Condizione applicata». L'etichetta non contiene l'origine:
    si potrebbe registrarla in chiaro e tenere riservata solo l'origine. È una scelta del
    dominio, da confermare.

## Controlli superati

- **Suite.** 561 test, 560 PASS. L'unico FAIL è quello descritto in P2-1.
  `conditions-ui` 19/19 e `conditions-integration` 20/20 passano. I 6 fallimenti di base
  di `conditions-ui` sono chiusi.
- **Reperibilità.** Il pannello si apre sempre con un clic dal punto di partenza:

  | Da dove                            | Come                                                     | Clic                         |
  | ---------------------------------- | -------------------------------------------------------- | ---------------------------- |
  | Scheda di Livia                    | riepilogo o pulsante PF                                  | 1                            |
  | Tavolo                             | Livia è selezionata di default, riepilogo nell'inspector | 1 (anche a 390 px)           |
  | Elenco Personaggi                  | Apri scheda, poi riepilogo                               | 2                            |
  | Tavolo, dopo aver scelto la pedina | Sentinella, come DM                                      | 1 clic sulla pedina + 1 clic |

- **Anteprima prima di applicare.** Danno 30 senza motivo: errore, Applica disabilitato,
  importo conservato. Con il motivo:
  - righe Privo di sensi, Prono e PF 18 → 0 con fonti;
  - nessuna mutazione prima di Applica;
  - un solo commit, notifica «Danno registrato».
- **Annulla/Esc.** Esc chiude senza mutazioni e il focus torna al pulsante d'ingresso. La
  richiesta di Medicina ridotta resta in attesa ed è visibile nel riepilogo («Tiro in
  attesa») e nel pannello («Apri: Prova di Medicina»).
- **Offline.** Su Livia (condivisa) Applica è disabilitato, compaiono due avvisi e
  l'origine digitata («Sabbia») è conservata.
- **EN/IT.** Il render inglese non contiene residui italiani, a parte i nomi bilingui
  voluti nella scheda della definizione. La scansione italiana di danno, storico,
  Indebolimento, correzione, Rialzati, soccorso e termini (turno e riposo) non ha residui
  inglesi.
- **Target e layout.** Tutti i controlli del pannello sono ≥ 40 px a 1280 e a 390 px (le
  etichette delle caselle sono alte 44 px). A 390 px non c'è overflow orizzontale né della
  pagina né del dialogo. Tastiera: Invio sull'ingresso apre il dialogo e l'ordine di
  tabulazione segue la lettura.
- **Nessun controllo inerte.** Ogni `data-conditions-*` renderizzato ha un gestore.
  L'elenco statico dei bind combacia con i selettori emessi.
- **Privacy tra ruoli.**
  - Harness Node con `createStore` reale: un'origine riservata applicata dal Giocatore non
    compare nel render del DM (pannello, riepilogo, storico aperto). Il DM vede «Origine
    riservata».
  - Browser: l'origine riservata del DM non appare nell'interfaccia del Giocatore. Pedina e
    inspector mostrano solo «Frightened».
  - Il Giocatore non apre il pannello di Sentinella («non disponibili») e il riepilogo
    restituisce una stringa vuota.
  - Unica eccezione: il DOM nascosto descritto in P3-7.
- **Coda comune dei tiri.** «Tira contro la morte» fuori iniziativa crea un'unica
  richiesta tipizzata. Il tiro digitale 7 registra un Fallimento (1/3), visibile in scheda,
  pannello e pedina. La Medicina Mira → Livia mostra CD 10, 1d20 + 3 (Saggezza) e fonte, e
  passa per la stessa coda.
- **Regressioni browser dei checkpoint 1–9**, in una sessione separata e sequenziale:

  | Percorso      | Esito                           |
  | ------------- | ------------------------------- |
  | core          | 13/13                           |
  | combat        | 10/10                           |
  | reactions     | 8/8                             |
  | concentration | 10/10                           |
  | rest-shared   | 3/3                             |
  | rest-time     | 3/3                             |
  | spatial       | 8/8                             |
  | forms-journey | **fallisce** al passo PF (P2-2) |

## Richieste fuori dalla mia riserva (riepilogo per i responsabili)

1. **Proprietario di `tests/reactions.test.mjs`.** Correzione P2-1, per esempio
   `delete state.actors.livia.vitalityPolicy;` dopo `fixture()` nel test della riga 300.
2. **Proprietario di `blueprint-checks`.** Aggiornare `forms-journey.js` e
   `builder-advance-journey.js` al percorso del pannello (P2-2), poi rieseguirli.
3. **`characters.mjs` e `rest-time.mjs`/`rest-ui.mjs`.** Instradare o limitare le
   scritture di PF e Indebolimento (P2-3). Unificare l'ingresso nella scheda (P2-4).
4. **`conditions.mjs` + `conditions-ui.mjs`.**
   - Evento e comando per i PF temporanei (P2-5).
   - Riconciliazioni operative (P2-3).
   - Fonte manuale per la riga dell'origine (P3-15).
   - Ritocchi UI P3-1, 2, 4, 5, 6, 11, 12, 14.
5. **`table.mjs`.** Rialzati disabilitato con motivo visibile (P3-2), ordine
   dell'inspector (P3-10), «metre» → «meter» o viceversa (P3-12).
6. **`combat-ui.mjs`.** Frase sull'azione spesa solo in iniziativa (P3-3). Ritorno al
   pannello dopo un tiro vitale (P3-9).
7. **`path-ui.mjs`.** Evidenziare i moltiplicatori ≥ 2 e distinguere ×3 (P3-8).
8. **`app.mjs` (shell).** Svuotare `#dialog` alla chiusura o al cambio di ruolo (P3-7).

## Limiti di questa review

Non ho verificato:

- un lettore di schermo reale;
- il tocco fisico: solo emulazione della viewport;
- il reload JSON a metà di una richiesta vitale, già coperto dai test di integrazione;
- le schede personali offline (non ci sono attori personali nel seed; coperte dai test UI);
- le regole 2024 riga per riga, che competono alla review di dominio.

Lo stile resta provvisorio e non approvato. Questi rilievi riguardano gerarchia,
reperibilità, stati e raccordi, non l'estetica.
