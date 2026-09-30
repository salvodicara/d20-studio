# Incremento 10 — correzioni dei rilievi di review e browser

24/09/2026. Autore delle correzioni, non review indipendente. Candidato dirty nel
worktree `codex/interview-01`; serve una review separata sugli hash sotto.

Fonti dei rilievi: [review regole](blueprint-conditions-rules-review.md),
[review UX](blueprint-conditions-ux-review.md), [dadi](blueprint-dice-correction-review.md),
log browser `increment10-*-final.log`. Regole: SRD 5.2.1 EN/IT (sha256 verificati:
EN `8974902d…`, IT `a7b88b0c…`).

## Esito

- Suite completa: `node --test design/blueprint/tests/*.test.mjs` → **621/621**
  (log `d20-blueprint-evidence/2026-09-23/increment10-fixes-suite.log`). Prima: 561, 560.
- Browser (sessione `d20-conditions-check`, log `increment10-fixes-<script>.log`):
  `conditions-journey` 11/11 senza rilievi, `dice-correction-journey` 7/7 senza rilievi,
  nuovo `conditions-fixes-journey` 7/7, `conditions-death-journey` 7/7,
  `conditions-mobile-journey` 3/3. Regressioni: `combat` 10/10, `core` 13/13,
  `reactions` 8/8, `multi-self` 6/6, `concentration` 10/10, `rest-time` 3/3,
  `rest-shared` 3/3. Zero errori di pagina.
- Immagini nuove: `fixes-sheet-hp-card.png`, `fixes-temp-hp-replace.png`,
  `fixes-field-error.png`, `fixes-table-stand-disabled.png`,
  `dice-d-digital-undo-reroll.png` (ora: riuso delle facce), `conditions-b-*.png`.
- Nuovi test: `tests/increment10-review.test.mjs` (31), più casi in
  `conditions-ui.test.mjs` (11), `combat-ui.test.mjs` (5), `rest-time.test.mjs`,
  `reactions.test.mjs`. Onestà TDD: i casi di dominio P1, P3 held-items, P3 expired,
  P2 PF massimi sono stati visti fallire prima del fix; gli altri sono stati scritti
  subito dopo il fix, dopo aver riprodotto il rilievo con una sonda Node o col log browser.

## Rilievi

| #   | Rilievo                                          | Stato                  | Correzione                                                                                                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------ | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1  | Pozione bevuta a 0 PF (Incapacitato)             | Corretto               | `beginHealing` rifiuta Incapacitato (SRD EN 184 / IT 208); il dialogo mostra il motivo e non offre Bevi. Il test d’integrazione che beveva a 0 PF ora usa una cura alleata.                                                                                                                                                        |
| P2  | Attacco digitale: Undo = rilancio gratuito       | Corretto               | Tentativo e dadi digitali sono due commit. Undo ritira solo i dadi (`withdrawn`: nessuna continuazione automatica, serve «Riapplica risultato noto»). Un secondo Undo ritira il tentativo; il nuovo tentativo con stessi attore, azione, bersagli e turno riusa le facce (storico «Riusato»). Bersaglio diverso: dadi nuovi.       |
| P2  | Attacco a distanza in mischia                    | In parte non difetto   | La regola esisteva già (`rollModeFor`): il tiro era normale. Difetto reale: il motivo non era mostrato. Ora `rollReasons` con fonte (EN 15 / IT 17) in anteprima e richiesta, e «Tiro normale: vantaggio e svantaggio si annullano».                                                                                               |
| P3  | Anteprima senza termine; origine con pagina SRD  | Corretto               | Riga «Termine» nell’anteprima; la riga Origine non cita fonti.                                                                                                                                                                                                                                                                     |
| P3  | Dado misto etichettato «Fisico»                  | Corretto               | `faceModes` per dado; storico «Digitale (dado 1) + Fisico (dado 2)».                                                                                                                                                                                                                                                               |
| P3  | Causa/turno solo creature leggibili              | Corretto (decisione)   | Proiezione osservabile: pedine visibili nella scena attiva, solo id e nome, per causa e turno; il riposo resta solo sulle schede leggibili.                                                                                                                                                                                        |
| P3  | Decimali col punto al Tavolo                     | Corretto               | `formatNumber` in `ui.mjs`: messaggio mappa, scala «1,5 m / casella», avvicinamento, porte, movimento interrotto, calibrazione. «metre» → «meter».                                                                                                                                                                                 |
| P2  | `applyVitalityRoll` si fida dei descrittori      | Corretto               | TS morte: soggetto = tiratore, id `death-save:<id>:<trigger>`, trigger `turn:<turnKey>` in iniziativa, modificatore ricalcolato alla risoluzione (anche nella richiesta). Recupero stabile legato alla stabilità corrente. Controllo richiesto sul soggetto. Un solo TS per turno: il test di dominio ora usa round successivi.    |
| P2  | Chiave di turno per indice                       | Corretto               | `combatTurnKey`: `encounter:round:attore`, unica per combat, condizioni e forme.                                                                                                                                                                                                                                                   |
| P2  | Sonno fuori dal dominio                          | Corretto               | Sonno = Privo di sensi via `applyConditionEvent` (Prono distinto, concentrazione, oggetti noti, eventi); risveglio via `end` per `restId`: Prono resta. Anteprima con riga Prono.                                                                                                                                                  |
| P2  | Spaventato mai applicato                         | Corretto               | Fonte nota: linea di vista geometrica fra le pedine («within line of sight», EN 182 / IT 216). Fonte ignota o assente: domanda esplicita sì/no prima dell’attacco (`conditionFacts`); anche per chi afferra/affascina ignoto. Le prove di caratteristica (Medicina) restano con avviso.                                            |
| P3  | Unità di danno di Dardo incantato                | Corretto (dichiarato)  | Un evento vitale per dardo, come i TS di concentrazione: a 0 PF un fallimento per dardo, danno massiccio per dardo.                                                                                                                                                                                                                |
| P3  | Termine rivela fonte nascosta                    | Corretto               | `projectTerm` anonimizza l’attore del termine (tranne il soggetto) quando la fonte è riservata; riga termine sensibile nello storico.                                                                                                                                                                                              |
| P3  | Prono del Morso senza proprietario               | Corretto               | `owner` = controllore dell’attaccante.                                                                                                                                                                                                                                                                                             |
| P3  | 20 naturale con PF massimi ignoti                | Corretto               | Recupero di 1 PF senza massimo noto, con riconciliazione; un piano bloccato fallisce invece di dichiarare «recupera».                                                                                                                                                                                                              |
| P3  | Evento «scaduto» registrato da un lettore        | Corretto               | Controllo richiesto prima di registrare.                                                                                                                                                                                                                                                                                           |
| P3  | Correzione con 3 fallimenti senza morte          | Corretto               | 3 fallimenti richiedono Morto, 3 successi Stabile nella stessa correzione.                                                                                                                                                                                                                                                         |
| P3  | Pietrificato e Avvelenato                        | Corretto               | Avvelenato non impone effetti mentre Pietrificato; l’istanza resta.                                                                                                                                                                                                                                                                |
| P3  | Effetti sull’iniziativa non consumati            | Corretto (manuale)     | Catalogo: effetti d’iniziativa manuali (+ nota Indebolimento). La preparazione mostra «Da includere nel tiro: …» accanto al tiro.                                                                                                                                                                                                  |
| P3  | Oggetti tenuti senza effetto                     | Corretto               | Demo: ignoti per chi ha oggetti, `[]` per inventario vuoto. Un attacco con arma d’inventario la registra in mano. Gli oggetti caduti vanno a terra, non più equipaggiati né usabili; scheda «A terra» + «Registra raccolto».                                                                                                       |
| P3  | Meccaniche private divergenti                    | Corretto (decisione)   | Le applicazioni private valgono ovunque; chi non le vede riceve «Effetto riservato» in scheda, anteprima, richieste e fallimenti automatici.                                                                                                                                                                                       |
| P3  | Recupero Indebolimento senza evento              | Corretto               | Il riposo lungo usa l’evento `exhaustion` del dominio.                                                                                                                                                                                                                                                                             |
| P3  | Pubblico dei parametri vitali                    | Corretto (decisione)   | Un solo pubblico: chi legge la scheda (`canReadVitals`, come la panoramica) vede PF, conteggi e tiri vitali; gli altri solo lo stato pubblico della pedina.                                                                                                                                                                        |
| P2  | Test reazioni non aggiornato                     | Corretto               | Caso legacy senza politica + caso con politica (concentrazione chiusa senza TS).                                                                                                                                                                                                                                                   |
| P2  | `forms-journey.js`, `builder-advance-journey.js` | Aperto (fuori riserva) | Modifiche esatte sotto.                                                                                                                                                                                                                                                                                                            |
| P2  | Scritture dirette di PF/Indebolimento            | Corretto               | «Correggi valori» non porta mai a 0 PF (minimo 1). La correzione del riposo rifiuta 0 PF, uscite da 0 e Indebolimento. Le riconciliazioni del pannello offrono il comando che le risolve.                                                                                                                                          |
| P2  | Due ingressi ridondanti nella scheda             | Corretto               | Un solo ingresso nella scheda PF («Danni, cure e condizioni»), senza comando preselezionato; niente nome/PF ripetuti. Il Tavolo mantiene il riepilogo.                                                                                                                                                                             |
| P2  | PF temporanei senza comando                      | Corretto               | Evento `temp-hp` (SRD EN 18 / IT 20): non si sommano, scelta tieni/sostituisci, avviso a 0 PF. Comando «PF temporanei».                                                                                                                                                                                                            |
| P3  | Rialzati attivo a Velocità 0                     | Corretto               | Tavolo e pannello: disabilitato con motivo visibile; «Può strisciare» sostituito a Velocità 0.                                                                                                                                                                                                                                     |
| P3  | «Azione già spesa» fuori iniziativa              | Corretto               | Solo se Medicina l’ha spesa in iniziativa (`actionSpent`).                                                                                                                                                                                                                                                                         |
| P3  | Testo offline che promette una coda              | Corretto               | «Non applicata, niente in coda; riconnettiti e premi Applica; gli input restano». Tiri condivisi disabilitati offline con motivo.                                                                                                                                                                                                  |
| P3  | Errori non legati ai campi                       | Corretto               | `aria-invalid`, messaggio sotto il campo, `aria-describedby`; le righe prima/dopo restano visibili con Applica disabilitato.                                                                                                                                                                                                       |
| P3  | Stepper Indebolimento digitato                   | Corretto               | Effetto e limiti aggiornati mentre si digita.                                                                                                                                                                                                                                                                                      |
| P3  | HTML dell’identità precedente nel DOM            | Corretto               | La shell svuota `#dialog` alla chiusura (anche Esc) e al cambio di ruolo.                                                                                                                                                                                                                                                          |
| P3  | Colori del percorso da Prono                     | Corretto               | ×1, ×2 e ×3 distinti (`data-path-cost`).                                                                                                                                                                                                                                                                                           |
| P3  | Enfasi dei comandi                               | Corretto               | Un solo primario per vista: senza comando aperto Aggiungi/Aiuto/TS morte; con comando aperto il comando è «selezionato» e Applica è il primario.                                                                                                                                                                                   |
| P3  | Nessun ritorno al pannello                       | Corretto               | «Torna a Condizioni e stato» dopo un tiro vitale partito dal pannello.                                                                                                                                                                                                                                                             |
| P3  | Gerarchia dell’inspector e Velocità              | Corretto               | Stato vitale prima di Forme; nella scheda «ora 0 m per condizioni» accanto alla Velocità base.                                                                                                                                                                                                                                     |
| UX  | Extra della review UX (11–16)                    | Corretti               | Focus sul titolo del comando preselezionato; `role="group"` al posto di toolbar; niente `aria-pressed` statico nel catalogo; X a 40 px; nota sulla distanza del soccorso (l’SRD non la fissa); Undo con etichetta della modifica; riga di registro condivisa per origine riservata (solo l’applicazione privata nasconde la voce). |

La lista dei rilievi ricevuta era troncata dopo «Gerarchia dell’inspector»: eventuali
rilievi successivi non erano leggibili; ho coperto i punti 11–16 della review UX.

## Decisioni da riportare nei contratti (fuori riserva)

1. **Undo e dadi** (`docs/interview/TABLE_ACTIONS.md`, righe 162-165): digitale come fisico.
   Tentativo e dadi sono passi distinti; un Undo ritira l’applicazione e lascia speso il
   tentativo; il risultato ritirato torna solo con «Riapplica risultato noto» o con una
   correzione motivata; un nuovo tentativo identico nello stesso turno riusa le facce
   ritirate. Undo non è mai un rilancio.
2. **Proiezione osservabile**: una pedina visibile può essere causa o turno di termine,
   solo con nome; nessun accesso alla scheda.
3. **Pubblico dei parametri vitali**: chi legge la scheda (membri per i personaggi di
   campagna, DM per i PNG, proprietario per le schede personali).
4. **Dardo incantato**: un’istanza di danno per dardo per vitalità e concentrazione
   (interpretazione dichiarata, coerente con DECISIONS «Dardi»).
5. **Spaventato**: linea di vista geometrica fra pedine; origine ignota = domanda esplicita.
6. **Applicazioni private**: effetto valido ovunque con motivo anonimo; registro condiviso
   quando è riservata solo l’origine.
7. **Oggetti tenuti**: ignoti finché registrati; arma usata = tenuta; caduti = a terra.
8. **Chiave di turno** `encounter:round:attore` e TS morte uno per turno.

## Richieste fuori riserva

1. `blueprint-checks/forms-journey.js` riga 50: sostituire i passi `[data-character-action="hp"]`,
   `#dialog [name="hp"]`, `[name="reason"]`, submit con
   `#content [data-conditions-entry]` → `[data-conditions-command="correct"]` →
   `#dialog [data-conditions-field="hp"]` = 9 → `[data-conditions-field="reason"]` →
   `[data-conditions-preview]` → `[data-conditions-apply]` → `#dialog footer [data-close]`.
2. `blueprint-checks/builder-advance-journey.js` righe 25-30 (`correctHP`): stessa sequenza al
   posto di «Correggi PF»/«Registra correzione». Poi rieseguire builder-journey e questo.
3. `blueprint-checks/README.md`: aggiungere `conditions-fixes-journey.js` e aggiornare la
   descrizione di `dice-correction-journey.js` gruppo 2 (due commit, riuso delle facce).
4. `design/blueprint/DEVELOPMENT.md`: `combatTurnKey`; `withdrawn`/`reusedFrom`/`retryKey`;
   `rollReasons` e `conditionFacts`; `canReadVitals`; `projectConditionReasons`; evento
   `temp-hp`; evento trusted `exhaustion`; sonno via dominio; `ctx.undoLabel`,
   `openConditionRoll(id, {returnTo})`; `formatNumber`.
5. Contratti/stato (`TABLE_ACTIONS.md`, flusso condizioni, `BLUEPRINT_STATUS.md`): le
   decisioni sopra e il nuovo comando PF temporanei.

## Limiti rimasti

- Somministrare una pozione a un alleato a 0 PF non ha ancora un comando dedicato:
  si registra con Cura nel pannello.
- Spaventato sulle prove di caratteristica (Medicina) resta un avviso.
- «Registra raccolto» non spende l’interazione con un oggetto del turno.
- Effetti delle condizioni sull’iniziativa: manuali, con promemoria.
- Il riuso delle facce vale per stesso attore, azione, bersagli e turno; cambiare
  bersaglio produce dadi nuovi.
- `forms-journey` e `builder-advance-journey` non rieseguiti (fuori riserva).

## Hash (SHA-256, 12 caratteri)

`conditions.mjs` cdf107854eb9 · `conditions-ui.mjs` ab9f8b0960ab ·
`conditions-ui.css` 500444cf083b · `combat.mjs` 7b02f163ccc1 · `combat-ui.mjs` a8a7aa0d122e
· `characters.mjs` fb2c31bc1e7a · `state.mjs` 24ed3b2c852e · `rest-time.mjs` f09ff9b248e5 ·
`rest-ui.mjs` 7fd95ec126fd · `table.mjs` 6553411b4dbe · `table-spatial.mjs` b3c90f2e361e ·
`reaction-ui.mjs` c1fb15c09010 · `spatial-editor.mjs` 9b694b8e8112 · `path-ui.mjs`
7a40c9ab975b · `preparation.mjs` 32bea0fc4530 · `app.mjs` ae763011ce20 · `ui.mjs`
e101e0351806 · `forms-companions.mjs` 06d432533272 · `styles.css` e96d4ecf051c ·
test `increment10-review` 570e41531871, `conditions-ui` 6cbc67256397, `combat-ui`
582ac259e453, `conditions` 4b9720930265, `conditions-integration` a252267e4d0c,
`combat-evidence` e2279a1ba27e, `rest-time` f26605a780d5, `reactions` 7768ac6b19cc ·
script `conditions-journey` 4fc8b017bab3, `dice-correction-journey` 3aee009eb4bc,
`conditions-fixes-journey` 83f61c1f48eb.
