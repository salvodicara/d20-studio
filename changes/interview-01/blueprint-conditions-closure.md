# Incremento 10 — chiusura dei residui (condizioni e sopravvivenza)

24/09/2026. Autore delle correzioni, non review indipendente. Candidato dirty nel worktree
`codex/interview-01`, nessun commit; serve una review separata sugli hash in fondo.
Base: [correzioni](blueprint-conditions-fixes.md), [integrazione](blueprint-conditions-integration.md),
[review regole](blueprint-conditions-rules-review.md), [review UX](blueprint-conditions-ux-review.md),
[flusso](../../docs/interview/CONDITIONS_FLOW.md). Regole: SRD 5.2.1 EN/IT, copie locali in
`d20-studio-experience-evidence/` (`en.txt`, `it.txt`, stessi sha256 di R194).

## Esito

- Suite completa `node --test design/blueprint/tests/*.test.mjs`: **632/632** (log
  `d20-blueprint-evidence/2026-09-24/inc10-closure/suite.log`). All'avvio erano 621; nel frattempo
  un altro agente ne ha aggiunti 6; i miei nuovi test sono 5.
- Browser, sessione `d20-inc10-closure`, cwd `d20-blueprint-evidence/2026-09-24/inc10-closure/`,
  log `<script>.log`, zero errori di pagina:

  | Script                              | Esito                                           |
  | ----------------------------------- | ----------------------------------------------- |
  | `conditions-journey`                | 11/11, nessun rilievo                           |
  | `conditions-death-journey`          | 7/7                                             |
  | `conditions-mobile-journey`         | 3/3, nessun rilievo                             |
  | `dice-correction-journey`           | 7/7, nessun rilievo                             |
  | `rest-time-journey`                 | 3/3                                             |
  | `forms-journey`                     | 2/2 (prima: timeout sul vecchio dialogo PF)     |
  | `builder-journey`                   | 5/5 (+ controllo della politica a 0 PF)         |
  | `builder-advance-journey`           | 3/3 (prima: pulsante «Correggi PF» inesistente) |
  | `conditions-fixes-journey` (extra)  | 7/7                                             |
  | `conditions-badges-journey` (nuovo) | 2/2, un rilievo fuori riserva (sotto)           |

  Immagini nuove: `badges-desktop-it.png`, `badges-desktop-inspector-it.png`,
  `badges-phone-en.png`, `badges-phone-selected-en.png`; le altre sono quelle degli script rieseguiti.

## Punti del compito

| #   | Punto                                        | Stato                    | Cosa è cambiato                                                                                                                                                                                                                                                                                             |
| --- | -------------------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Journey sul vecchio dialogo PF               | Chiuso                   | `forms-journey` e `builder-advance-journey` usano il percorso reale: ingresso `[data-conditions-entry]` → **Correggi PF e stato** → PF e motivo → Anteprima → Applica → Chiudi, con verifica del valore salvato. `forms-journey` legge i PF temporanei dal riepilogo **Condizioni e stato** dell'ispettore. |
| 2   | Politica a 0 PF per i personaggi del builder | Chiuso                   | `characterZeroHpPolicy()` in `character-rules.mjs`: `death-saves` con fonte SRD EN 17–18 / IT 19–20. Applicata a ogni personaggio creato; su avanzamento solo se manca (una correzione del DM resta).                                                                                                       |
| 3   | Nomi italiani degli incantesimi              | Chiuso (+ talenti)       | 23 nomi su 34 corretti: ora coincidono con `srd-sample.mjs` (es. «Salvare i morenti», «Artificio druidico», «Dardo incantato»). In più i talenti, verificati su IT pp. 97–98: «Aggressore selvaggio», «Tiro», «Iniziato alla magia (chierico)», minuscole. Nessun test o journey usava i vecchi nomi.       |
| 4   | Sonno dal dominio, Prono al risveglio        | Già chiuso, verificato   | Il sonno passa da `applyConditionEvent` (causa `sleep`, `restId`) e il risveglio da `{kind:"end", restId}`: resta Prono. Riprodotto di nuovo con la sonda della review. Aspettative del test spiegate sotto.                                                                                                |
| 5   | Termine del compagno rimosso nel suo turno   | Chiuso nel mio perimetro | `pendingTurnStart.previousTurnKey` registra l'identità del turno rimosso (`incontro:round:compagno`). `expireTurnEffects` usa la chiave passata anche per le forme. **Serve una riga in `state.mjs`** (richiesta 1): senza, la chiusura usa ancora la chiave del turno successivo.                          |
| 6   | P1/P2 residui delle tre review               | Nessuno aperto           | Ricontrollati sul codice attuale, sotto.                                                                                                                                                                                                                                                                    |
| 7   | Dado Vita durante un knockout                | Chiuso                   | `resolveHitDie` recupera i PF con `applyVitalityEvent` (`healing`, fonte riposo breve), come ogni cura: il knockout finisce, Prono resta, evento registrato. Anche il recupero PF del riposo lungo passa ora dallo stesso evento.                                                                           |
| 8   | Badge di stato sulle pedine                  | Chiuso (solo CSS)        | `conditions-ui.css`: un badge sul bordo della pedina, colore per stato (ambra contatore, rosso morente, verde stabile, antracite morto), glifo centrato in grassetto, ombra, niente clic sul badge; etichetta della pedina selezionata sopra il badge. L'ispettore mostra l'elenco completo.                |

### 4 — Aspettative del test del sonno

Il test `rest-time.test.mjs` «sleep has its own unconscious condition; waking preserves an
independent condition» era stato già aggiornato dalla passata di correzioni; non l'ho cambiato.
Il vecchio test confrontava la forma legacy (vedi [raccordi](blueprint-conditions-seams.md),
riga Sonno). Aspettative cambiate, una per una:

1. **Anteprima:** oltre alla riga `conditions` c'è `conditions.prone → true`. Motivo: Privo di
   sensi comprende Prono, che resta al risveglio (SRD EN 191 / IT 212).
2. **Dopo il risveglio:** resta soltanto il Privo di sensi indipendente (`other-effect`, senza
   `restId`), non più una lista identica a quella iniziale. Motivo: il sonno viene terminato per
   `restId` attraverso il dominio.
3. **Prono dopo il risveglio:** resta un'istanza `prone` con causa `unconscious-fall`. Prima
   non esisteva. Motivo: regola 2024 «When this condition ends, you remain Prone».
4. **Storico:** `conditionEvents` dell'eroe è `["apply", "end"]`. Motivo: l'API chiede un evento
   per ogni cambiamento.

In `rest-time-journey` il controllo resta «nessun Privo di sensi dopo il completamento», ancora
vero (3/3).

### 6 — P1/P2 ricontrollati

Sonda Node con le riproduzioni originali dei revisori, eseguita sul codice attuale:

- **P1 pozione:** rifiutata, «An Incapacitated creature cannot drink a potion».
- **P2-1 descrittori forgiati:** test `increment10-review` P2.
- **P2-2 chiave di turno:** indipendente dall'indice (`combatTurnKey` uguale prima e dopo la
  rimozione).
- **P2-3 sonno:** Prono presente sia durante il sonno sia dopo il risveglio.
- **P2-4 Spaventato:** con fonte in vista il tiro è in `disadvantage`.
- **UX P2-1 suite:** verde.
- **UX P2-2 journey:** punto 1.
- **UX P2-3 scritture dirette:** coperte da test e codice. `patchCharacter` si ferma a 1 PF; la
  correzione del riposo rifiuta 0 PF, l'uscita da 0 e l'Indebolimento. Aggiunta di questa passata:
  i PF del riposo lungo passano dall'evento vitale.
- **UX P2-4 ingresso unico:** verificato nel browser da `conditions-fixes-journey`.
- **UX P2-5 PF temporanei:** `previewVitalityChange` `temp-hp` si può applicare.

## Test nuovi o modificati

- `character-build.test.mjs`, 3 nuovi test:
  - politica a 0 PF: morente, nessuna riconciliazione, correzione conservata dopo l'avanzamento;
  - nomi degli incantesimi uguali a `srd-sample`;
  - nomi italiani dei talenti.
- `rest-time.test.mjs`:
  - nuovo test: Dado Vita durante un knockout;
  - test esistente del riposo lungo, **aspettativa aggiunta:** il recupero dei PF è un solo evento
    `healing` `complete:hero:hp` da 5 a 20.
- `forms-companions.test.mjs`:
  - **aspettativa cambiata:** il marker di inizio turno contiene anche `previousTurnKey: "demo:4:<cat>"`;
  - nuovo test: chiudendo il turno rimosso con quella chiave, «fine del turno corrente» scade e
    «prossimo turno» no.
- `conditions-badges-journey.js`, nuovo: misura diametro, glifo, colore e sovrapposizione con
  l'iniziale a 1440 (DM, IT) e a 390 (giocatore, EN, tocco). Verifica anche l'elenco completo
  nell'ispettore e l'etichetta della pedina selezionata.
- Gli script `conditions-*`, `forms-journey` e `builder-*` ora salvano le immagini in
  `2026-09-24/inc10-closure/`, così non sovrascrivono le prove del 23/09. Formattati con prettier,
  senza il punto e virgola finale richiesto dalla CLI.

Onestà TDD:

- **Punto 7:** la sonda ha riprodotto il difetto prima della correzione (PF 7 ancora
  `knocked-out`); il test è stato scritto dopo.
- **Punto 5:** il test fallisce se la chiave non viene passata (verificato su una copia).
- **Punto 2:** una sonda conferma che senza politica lo stato è `zero-hp` con riconciliazione.
- **Badge:** la journey falliva sul CSS di prima (14,7 px, due soli colori).
- **Punto 3:** i test sono stati scritti dopo la correzione.

## Richieste fuori riserva

1. **`state.mjs`, `reconcileFormsAfterMutation`, riga ~798.** Sostituire
   `expireTurnEffects(state, pending.previousActorId, "end");` con
   `expireTurnEffects(state, pending.previousActorId, "end", { turnKey: pending.previousTurnKey });`.
   - I marker salvati prima di questa modifica non hanno `previousTurnKey`: in quel caso vale il
     comportamento attuale.
   - Test consigliato con lo store reale: compagno corrente a 0 PF con un termine «fine del turno
     corrente» su un'altra creatura. Il termine scade una volta; «prossimo turno» no.
2. **`table.mjs` e `styles.css`:**
   - **Rilievo della journey dei badge:** come DM a 390 px la barra `.table-topline .toolbar`
     (Avvia combattimento, Scene, Riposi, Tempo, Registro) non va a capo e allarga la pagina di
     80 px. Come giocatore non succede.
   - **Proposta facoltativa:** con PF > 0 un Privo di sensi (knockout o sonno) oggi appare come
     contatore «2». Si può distinguere con `data-token-status="unconscious"` e un glifo proprio,
     ricavando lo stato da `getConditionOverview`, che ha già `knocked-out`. Il CSS relativo lo
     aggiungo io quando esiste il markup.
3. **`blueprint-checks/README.md`:**
   - aggiungere `conditions-badges-journey.js`;
   - annotare che `forms-journey` e `builder-advance-journey` usano il pannello **Condizioni e
     stato**;
   - annotare la cartella delle prove `2026-09-24/inc10-closure/` per gli script `conditions-*`,
     `forms-journey` e `builder-*`.
4. **`design/blueprint/DEVELOPMENT.md`:**
   - PF recuperati da Dadi Vita e riposo lungo via `applyVitalityEvent`;
   - `characterZeroHpPolicy` per i personaggi del builder;
   - `pendingTurnStart.previousTurnKey` e `expireTurnEffects(…, {turnKey})`;
   - stile del badge in `conditions-ui.css`.
5. **`CONDITIONS_FLOW.md` e `BLUEPRINT_STATUS.md`:**
   - dalla Frontiera togliere «politica a 0 PF per i personaggi creati dal builder» e «stile
     dedicato del badge»;
   - il limite del compagno rimosso è chiuso dopo la richiesta 1;
   - aggiungere che un Dado Vita chiude il knockout.

## Limiti

- **Punto 5:** non verificato nel browser. Serve prima la riga di `state.mjs`.
- **Punto 7:** coperto da test di dominio, non da un percorso browser. Si raggiunge quando un Dado
  Vita avviato prima del colpo viene risolto dopo.
- **CSS del badge:** usa `r` e `transform` CSS su elementi SVG. È verificato solo in Chromium
  (Playwright); Safari e Firefox no. Se non sono supportati, restano gli attributi SVG di prima.
- **Punto 2:** non tocca `conditionImmunities` né la taglia dei personaggi del builder.
  - Immunità ignote: le applicazioni da regola chiedono ancora conferma.
  - Taglia assente: il Morso del Lupo mostra la riconciliazione.
  - Primo privilegio di questo catalogo che dà un'immunità: Berserker 6 (condizionale).
- **Immagini del 23/09:** `dice-correction-journey` e `rest-time-journey` non sono miei e le
  hanno riscritte nella cartella del 23/09.
- **Nomi:** controllati solo incantesimi e talenti. Specie e sottoclassi sono state verificate solo
  a campione.

## Hash (SHA-256, 12 caratteri)

`character-rules.mjs` 34a5675a9bd2 · `character-build.mjs` 4e01bc04f564 · `rest-time.mjs`
ccdafd96e248 · `forms-companions.mjs` 1495065d390a · `combat.mjs` 96dda07d4e1d ·
`conditions-ui.css` 948966f3fc7f · test `character-build` 5680ed0848fb, `rest-time` 97d9fcdfe337,
`forms-companions` f20967458a67 · script `forms-journey` fa335a680428, `builder-advance-journey`
c10781b0f25c, `builder-journey` 5eff532bd834, `conditions-badges-journey` d0d0d07fd9fb,
`conditions-journey` d2f0d51d3963, `conditions-death-journey` 556df0b6bfeb,
`conditions-mobile-journey` e2c0867bca54, `conditions-fixes-journey` 425223bea2f1.
