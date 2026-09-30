# Condizioni e stato vitale — rapporto UI, incremento 10

23/09/2026. Autore del modulo UI (worktree `d20-studio-interview-01`, ramo
`codex/interview-01`). Base: [piano UI](blueprint-conditions-ui-plan.md),
[API](blueprint-conditions-api.md), [dominio](blueprint-conditions-domain.md),
[R194](blueprint-conditions-research.md). Nessun commit. Nessun file fuori
dalla mia riserva è stato modificato. Il dominio `conditions.mjs` non è stato
toccato (SHA invariato `eaccc01b…bbd7`).

| File                                            | SHA-256 al rapporto                                                |
| ----------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/conditions-ui.mjs`            | `9f2c833545a43c150a11a500614681518d7b1bbe0c2102c4997ff4a53a0797af` |
| `design/blueprint/conditions-ui.css`            | `739378d6d8e486ea78cfac9eeced2b8c53beb38d19884e0092f1936657a38853` |
| `design/blueprint/tests/conditions-ui.test.mjs` | `00b7c5df516d9607ab66e77804fcf588ff6a4c77840f9f5ff85de7ef5161bf2a` |

## Che cosa esiste ora

Un **riepilogo compatto** accanto ai PF e un **unico dialogo contestuale**
“Condizioni e stato”, nel modulo ES `conditions-ui.mjs` (import solo dal
dominio). Stile provvisorio sui token di `styles.css`, stessa struttura di
rest-ui/forms-ui.

Export: `openConditions(ctx,{actorId,tab?})`, `renderConditionsPanel(ctx)`,
`bindConditionsPanel(root,ctx)`, `renderConditionsSummary(ctx,actorId)`,
`bindConditionsSummary(root,ctx)`, `refreshConditionsUI(ctx)`,
`resetConditionsUI()`. `tab` preseleziona un comando: `add`, `exhaustion`,
`damage`, `heal`, `correct`, `stand`, `aid`.

### Riepilogo (scheda e inspector del Tavolo)

Nome, badge dello stato vitale, PF attuali/massimi, PF temporanei se presenti,
conteggi TS morte quando sta morendo, condizioni attive come chip raggruppati
(`Avvelenato ×2`, `Indebolimento 2`), avviso “Tiro in attesa”, **un solo**
ingresso `Condizioni e stato`. Una creatura non leggibile dal ruolo corrente
non produce markup.

### Dialogo, in ordine di lettura

1. **Stato vitale**, distinto dalle 15 condizioni: Cosciente, Privo di sensi
   (knockout), Morente, Stabile, Morto, A 0 PF, Scomparso, PF non registrati.
   Se la creatura dorme con PF sopra 0 il badge dice Privo di sensi, non
   Cosciente. Poi PF, PF temporanei, Velocità effettiva e livello di
   Indebolimento.
2. **Tiri contro la morte**: testo “Successi n/3 · Fallimenti n/3” più indicatori
   (cerchi per i successi, rombi per i fallimenti: il colore non è l’unico
   segnale). Se esiste una richiesta dovuta, il pulsante la **riapre**; fuori
   iniziativa `Tira contro la morte` crea la richiesta tipizzata una sola volta;
   in combattimento senza richiesta spiega che il tiro arriva all’inizio del
   turno. “Stabile” mostra il recupero 1d4 ore (riapre o crea la richiesta
   `stable-recovery`) oppure il tempo residuo.
3. **Comandi** in una barra: Danno, Cura, Aggiungi condizione, Indebolimento,
   Rialzati (solo se Prono), Stabilizza/Pronto soccorso/Soccorri un alleato
   (solo se esiste una coppia valida), Correggi PF e stato. Il comando aperto è
   `aria-pressed`. L’evidenza primaria va ad Aggiungi condizione, oppure al
   soccorso quando la creatura aperta ne ha bisogno. Cura disabilitata **con
   motivo visibile** (morto, PF non registrati).
4. **Area di lavoro** sotto la barra: modulo a sinistra, anteprima a destra;
   una colonna sotto i 780 px. Per i comandi di una singola origine (Termina,
   Correggi termine, Registra oggetti caduti) l’area si apre **dentro quella
   riga**, vicino a dove si è cliccato.
5. **Condizioni attive** raggruppate per definizione. Ogni origine ha causa
   (o “riservata”), termine leggibile, fonte, note (registrazione precedente,
   oggetti caduti, riconciliazioni) e il suo `Termina`. Più origini: “Terminando
   un’origine, la condizione resta attiva per le altre”. Le origini vincolate
   non offrono Termina e spiegano perché: da 0 PF con Cura/Correggi; sonno del
   riposo con `Apri Riposo`. “Effetti e fonte” mostra ciò che l’app calcola e
   ciò che resta al tavolo.
6. **Effetti in vigore** calcolati dal dominio: Velocità, penalità d20,
   Incapacitato, fallimenti automatici FOR/DES, vantaggi/svantaggi con motivo
   (e il requisito, per esempio “se vede la fonte della paura”), regola del
   Prono a 1,5 m, critici ravvicinati, effetti da gestire al tavolo.
7. **Storico** a scomparsa (renderizzato solo quando aperto) e
   `Annulla ultima modifica`, con la nota che Undo non termina una singola
   origine, non resuscita e che Chiudi/Esc non tira né annulla richieste avviate.

### Flussi dei comandi

- **Aggiungi condizione**: ricerca fra le 15 voci ufficiali IT/EN (i nomi
  compaiono in entrambe le lingue), scelta, scheda con fonte SRD 5.2.1 e pagina
  per lingua, effetti automatizzati e manuali. Poi origine (causa dichiarata,
  creatura leggibile, “origine riservata” sulle creature condivise), termine in
  linguaggio umano: manuale, dopo un tempo di gioco (round/minuti/ore sul clock
  della creatura), inizio/fine del turno corrente o prossimo di una creatura,
  riposo breve/lungo/qualsiasi, durata di una concentrazione attiva. Selezioni
  solo tra soggetti leggibili. Per Privo di sensi: oggetti tenuti in mano;
  un’armatura indossata non è un oggetto tenuto. Se ignoti, resta la
  riconciliazione del dominio.
- **Etichetta manuale**: dichiara in chiaro che non applica regole né effetti,
  qualunque sia il nome; motivo obbligatorio.
- **Indebolimento**: selezionarlo dal catalogo apre lo stepper sul livello
  canonico (−/+, input 0–6), effetto del livello scelto (−2×L d20, −1,5×L m,
  morte al 6), motivo, fonte SRD. Nessuna etichetta duplicata.
- **Danno / Cura / Correggi**: importi, “da colpo critico” per il danno a 0 PF,
  causa obbligatoria. Anteprima con assorbimento dei PF temporanei, PF persi o
  recuperati, eccedenza. La correzione modifica solo i campi cambiati (PF, PF
  massimi, PF temporanei, successi/fallimenti, stabile, morto, politica a 0 PF)
  e l’anteprima ripete l’avviso “non è una resurrezione”.
- **Rialzati**: anteprima immediata con costo e movimento residuo (9 m → 4,5 m),
  “non usa azioni né Scatto”, motivo del blocco (Velocità 0, non è il suo turno,
  movimento insufficiente). Strisciare resta sulla mappa del Tavolo.
- **Soccorso con Medicina**: chi riceve (morente o KO) e chi aiuta (solo
  creature controllate, coscienti, diverse dal bersaglio). L’anteprima mostra
  CD 10, dadi, modificatore con fonti, svantaggio da Avvelenato e costo
  dell’azione in iniziativa. `Avvia prova di Medicina` chiama
  `beginConditionRoll({kind:'medicine',…,reviewKey})` e apre la richiesta; se ne
  esiste già una in attesa la riapre, senza crearne un’altra.
- **Anteprima → Applica**: righe prima/dopo con fonte, costi, avvisi, errori,
  riconciliazioni, conseguenze nello stesso passo (fine concentrazione,
  richiesta 1d4, scadenza richieste…), ambito del commit (personale privato,
  condiviso, condiviso con registro riservato). Qualsiasi modifica dopo
  l’anteprima la rende obsoleta e disabilita Applica sul posto. Applica
  ricontrolla `reviewKey`, usa un solo `operationId` e chiama
  `ctx.applyConditionFollowUps(draft,result)` nello stesso commit. Un errore
  (offline, conflitto, dominio) conserva tutti gli input e la revisione. Annulla
  prima di Applica non cambia nulla e riporta il focus al comando d’origine.

## Pattern di riferimento usati

Nessuna interazione nuova. I pattern sono quelli pubblicati e già raccolti in
R194 (P01–P09), non osservati da me nel runtime dei prodotti:

- pannello unico PF + TS morte + condizioni + livello di Indebolimento da D&D Beyond;
- catalogo completo attivabile da scheda e pedina da Foundry, con effetti
  calcolati distinti dal testo;
- origine e durata esplicite per applicazione da Fantasy Grounds;
- area contestuale vicino alla riga da Roll20;
- stato persistente leggibile e feedback prima/dopo da BG3, senza sostituire
  le regole 2024.

## Decisioni prese entro il mio mandato

- **Fonte delle applicazioni.** Condizioni del catalogo e Indebolimento usano la
  fonte SRD della definizione. Etichette, danno, cura e correzioni usano
  `{kind:"manual",revision:"conditions-panel-1"}`, mai una citazione SRD
  inventata.
- **Non esposti di proposito.** Knockout: resta una scelta del comando di
  attacco in mischia del root, come dice il piano. Applicazione interamente
  privata (`visibility:"private"`): le regole la calcolerebbero comunque e
  confonderebbe; resta disponibile solo “origine riservata”. Modalità `rule`:
  il pannello registra fatti con `mode:"record"`; la regola sourced resta agli
  adapter fidati.
- **Esc/Chiudi scarta le bozze**, come da `DEVELOPMENT.md`, e non tocca le richieste.
- **Cambio ruolo**: il pannello non rende nulla per un’altra identità e
  `refreshConditionsUI` lo azzera e chiude il dialogo, anche su una creatura
  condivisa che il DM potrebbe leggere.

## Richieste fuori dalla mia riserva

1. `index.html`: `<link rel="stylesheet" href="conditions-ui.css" />`.
2. `app.mjs`: callback concordati su `ctx`: `conditionActor`,
   `beginConditionRoll`, `openConditionRoll`, `conditionRolls`,
   `applyConditionFollowUps`. Aggiungere `ctx.openConditions(actorId,tab)`;
   `conditionsUI.refreshConditionsUI(ctx)` in `render()` accanto a rest/forms;
   `conditionsUI.resetConditionsUI()` dove oggi si azzerano rest/forms, cioè
   cambio ruolo e ripristino dell’esempio.
3. **Callback facoltativo nuovo** `ctx.conditionBlocking(actorId,state)`, che
   restituisce il risultato di `hasBlockingConsequences` per quell’attore. Il
   dominio accetta `blocking` in `previewStand/standUp` e nel `reviewKey`; senza
   questo callback, Rialzati non è bloccato da una richiesta causale pendente.
4. `characters.mjs`: `renderConditionsSummary(ctx,actor.id)` vicino a
   `renderVitals` e `bindConditionsSummary(content,ctx)`. `table.mjs`: stesso
   riepilogo nell’inspector (può sostituire `health-line`) più il bind.
5. Fixture (`state.mjs`): `vitalityPolicy`, `conditionImmunities` con fonte,
   `heldItemIds` e dati di Medicina (`skills`, `proficiencyBonus` o
   `skillModifiers.medicine`) per Livia/Doran. Probe nel browser: Livia che
   stabilizza Mira mostra correttamente “Modificatore di Saggezza (Medicina)
   non registrato” e Applica resta disabilitato.
6. **Dominio, richiesta**: un comando “PF temporanei” distinto dalla
   correzione (`{kind:"temp-hp",amount,reason,source}`, 2024: non si sommano,
   si sceglie se tenerli o sostituirli). Oggi li cambia solo Correggi.
7. `conditionRolls(actorId)` deve proiettare le richieste in cui l’attore tira
   o è bersaglio, con `kind` death-save/medicine/stable-recovery. La UI tratta
   come chiusi gli stati `resolved`, `expired`, `cancelled`, `reversed`,
   `declined`.
8. `DEVELOPMENT.md`: sezione incremento 10 (coordinatore).

## Verifica

- **TDD.** Il file di test parziale falliva 6/6 per il modulo assente. I 6 test
  originali sono rimasti invariati; ho solo estratto il parser DOM del
  harness in `parse()` per riusarlo. Ho aggiunto 13 test: riepilogo e ingresso
  unico, etichetta senza regole, stepper, termini e soggetti autorizzati,
  origini vincolate, Rialzati, Stabilizza, cura negata e correzione, pip e
  riuso della richiesta, anteprima obsoleta e storico, oggetti tenuti, italiano,
  cambio ruolo su creatura condivisa.
- `node --test design/blueprint/tests/conditions-ui.test.mjs`: **19/19 PASS**.
- **Suite completa**: `node --test design/blueprint/tests/*.test.mjs`
  → **524/524 PASS**.
- **Mutazioni mirate**, ognuna fa fallire almeno un test: redraw al blur del
  testo, niente anteprima obsoleta, TS morte sempre nuovo, Medicina sempre
  nuova, controllo di ruolo rimosso (catturato dal nuovo test), follow-up non
  chiamati, opzioni di commit perse, tipo di riposo ignorato, Termina sempre
  offerto.
- **Browser** su `http://127.0.0.1:8879/`. Il root non ha ancora integrato il
  modulo, quindi ho montato il pannello nella pagina reale con uno store in
  memoria separato e un `dialog` identico a quello di `app.mjs`; lo stato
  locale dell’app non è stato toccato. Controllato:
  - desktop 1280 e telefono 375 senza overflow orizzontale;
  - ricerca che conserva focus e testo a ogni carattere;
  - selezione da tastiera (Tab + Invio) con focus sul titolo dell’area;
  - un cambio del select conserva il testo già scritto;
  - digitare un campo e cliccare subito Anteprima funziona al primo clic;
  - Applica aggiunge l’origine e chiama i follow-up, focus sull’esito;
  - Rialzati in combattimento: 9 → 4,5 m, azione e Scatto invariati;
  - Soccorso bloccato con motivo per dati di Medicina mancanti;
  - Esc chiude senza modifiche e la riapertura è pulita;
  - riepilogo in inglese con chip ×2 e livello, che apre il dialogo.
- **Non verificato**: integrazione reale in scheda/Tavolo, coda dadi
  fisici/digitali del root, reload JSON nell’app, offline e revoca nel
  browser (coperti solo dai test), lettore di schermo reale, tocco reale.
  Serve una review indipendente.

## Limiti dichiarati

Pannello e riepilogo dipendono dagli adapter root ancora da collegare
(richieste 2–5). Nessuna geometria nel soccorso (portata non verificata dal
dominio), nessuna immunità ai danni, resurrezione, effetti periodici o TS
ripetuti. Lo stile è provvisorio e non approvato. Gerarchia, reperibilità dei
comandi, stati ed errori sono invece la parte proposta come contratto.
