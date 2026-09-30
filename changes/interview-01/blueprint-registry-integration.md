# Registro delle estensioni — B11 parte B: le aree compaiono nell'app

24/09/2026. Applicato il piano degli hook (`blueprint-registry-plan.md` §3). Ora un'area
registrata con `registry.mjs` + `extensions.mjs` appare e funziona dentro l'unica app,
senza toccare i file condivisi. Nessuna area B12–B60 è ancora costruita: con l'app normale
"Cosa è pronto" dice "0 pronte · 48 da costruire · 0 con errori".

## In breve, per il proprietario

- All'avvio l'app cerca i 48 moduli pianificati (circa 30 ms, una richiesta `HEAD` ciascuno;
  la console mostra un 404 per ogni area non ancora costruita: non è un errore della pagina).
- Un'area pronta aggiunge da sola pagine, voci di menu, sezioni, strumenti del Tavolo,
  impostazioni, notifiche, risultati di ricerca e scorciatoie.
- Un'area rotta non blocca niente: nel suo spazio compare "X non è disponibile in questo
  momento. Il resto dell'app continua a funzionare."; nella barra della dimostrazione compare
  "Aree aggiuntive: N con avvisi", che apre "Cosa è pronto".
- "Cosa è pronto" ora elenca le aree in tre gruppi: **Con errori · non caricate** (frase
  semplice + dettaglio tecnico), **Pronte** (contributi e avvisi circoscritti di ciascuna),
  **Ancora da costruire** (codice e nome, es. "B12 · Tavolo: menu della pedina…").
- Solo per sviluppo, su `127.0.0.1`/`localhost`: `?fixture=sample-extension` carica l'area di
  prova, `?fixture=failing-extension` quella che fallisce; si possono unire con la virgola.

## File

Modificati (solo aggiunte agli hook, firme invariate): `design/blueprint/app.mjs`,
`table.mjs`, `characters.mjs`, `preparation.mjs`, `library.mjs`, `campaign.mjs`,
`index.html` (link a `registry.css`), `registry.mjs` (solo `reportHTML`, vedi sotto).
`extensions.mjs` non è cambiato.

Nuovi: `design/blueprint/registry.css`, `design/blueprint/tests/fixtures/failing-extension.mjs`,
`design/blueprint/tests/registry-shell.test.mjs` (6 test),
`changes/interview-01/blueprint-checks/registry-smoke-journey.js`, questo rapporto.

## Dove compare ogni punto d'estensione

| Punto                           | Nell'app                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route`                         | pagina `#<id>`; con `nav: true` voce della navigazione principale e del menu "App" del Tavolo, ordinata con le voci del core; anche nella ricerca. Pagina registrata ma non visibile al ruolo: "Pagina non disponibile per questo ruolo". Un sostituto di un core (`home`, `characters`, `campaigns`) riceve solo il proprio `bind`.                          |
| `service`                       | con `header: true` pulsante icona nell'intestazione; sempre via `data-service="<id>"`. Il sostituto di `search`/`notes`/`requests`/`preferences` prende il posto del servizio (anche `ctx.openNotes`).                                                                                                                                                        |
| `campaign-section`              | voce della barra laterale della campagna (stato attivo compreso) e contenuto in `#campaign?tab=<id>`; solo per i membri, come le sezioni del core.                                                                                                                                                                                                            |
| `sheet-tab`, `sheet-section`    | scheda nella barra della scheda personaggio (con `when(ctx, actor)`); riquadro in fondo alla scheda `tab`.                                                                                                                                                                                                                                                    |
| `preparation-section`           | solo DM: con almeno una sezione compaiono le schede "Scene / …"; `#preparation?tab=<id>`. Senza sezioni la pagina è identica a prima.                                                                                                                                                                                                                         |
| `library-section`               | scheda accanto a Disponibili / La mia Biblioteca / Campagna, `#library?tab=<id>`.                                                                                                                                                                                                                                                                             |
| `home-widget`                   | blocco di Inizio, ordinato con `resume` (10), `summary` (20), `appointment` (30); solo quando la campagna è accessibile, come i blocchi del core.                                                                                                                                                                                                             |
| `table-tool`                    | pulsante nella barra degli strumenti della mappa; attivo, riceve `onPointerDown/Move/Up`, `onClick`, `onKeyDown` (gestori assenti: resta il comportamento del core); `activate`/`deactivate` solo quando lo strumento cambia davvero.                                                                                                                         |
| `table-panel`                   | `inspector`: riquadro con titolo nell'ispettore; `drawer`: pulsante in alto (`aria-expanded`) e cassetto sotto la barra di combattimento, con "Chiudi pannello". Il sostituto di `log` prende il posto del registro.                                                                                                                                          |
| `map-layer`                     | dentro l'SVG della scena: `order` < 60 sotto `#tokens`, ≥ 60 sopra, prima delle porte. Senza `interactive` non riceve il puntatore; se è interattivo, i gestori del core ignorano gli eventi che lo colpiscono (così il suo `bind` non fa anche muovere una pedina).                                                                                          |
| `token-menu`                    | nessun menu nel core (lo costruisce B12). Pronti per B12: `table.menuTarget(actorId)` → `{actorId, tokenId, sceneId}` e `table.tokenMenu(actorId)` → voci visibili; `table` arriva a `bind` dei livelli e dei pannelli e agli strumenti.                                                                                                                      |
| `search`                        | risultati in coda alla ricerca dell'app (titolo, estratto o nome del fornitore), massimo 20 per fornitore.                                                                                                                                                                                                                                                    |
| `command`                       | scorciatoie attive in tutta l'app (non durante un dialogo o mentre si scrive senza Ctrl/Cmd/Alt); i tasti del Tavolo restano del core. Per B23: `ctx.registry.list("command", ctx)` (con `shortcut` o `shortcutConflict`), `ctx.registry.run(c, ctx)`, `ctx.registry.conflicts()`.                                                                            |
| `settings`                      | dentro Preferenze, in tre gruppi: "Su questo dispositivo", "Personali", "Campagna" (il giocatore la legge, solo il DM la cambia). Tutti i valori sono controllati prima di cambiare qualcosa; senza rete le impostazioni della campagna non si salvano.                                                                                                       |
| `notifications`                 | nella campanella Richieste: numero sul pulsante (anche nel nome accessibile, es. "Richieste · 3 notifiche") e sezione "Notifiche" in cima al dialogo dei tiri, con "Apri" verso la destinazione.                                                                                                                                                              |
| `draft-guard`                   | chiede conferma prima di lasciare la vista: link interni, cambio di hash/Indietro del browser, cambio di ruolo, chiusura della scheda (`beforeunload`). Un `confirm` che fallisce non blocca l'utente.                                                                                                                                                        |
| sezioni di stato, stili, eventi | sezioni inizializzate prima del primo render, nel salvataggio, nell'istantanea di Undo (`preserve` resta com'è), rigenerate da "Ripristina esempio". Il `<link>` di un'area solo se si registra. Eventi derivati dopo commit e Undo riusciti (`correction: true` per l'Undo), più `navigate`, `role-changed`, `language-changed`, `offline-changed`, `reset`. |

## Scelte rispetto al piano (adottate dall'agente)

1. `?fixture=` accetta un elenco con la virgola (massimo 4 nomi), solo su host locale, e i
   moduli di prova si caricano nello stesso lotto parallelo delle 48 aree.
2. Dopo una navigazione confermata da una bozza, il successivo `hashchange` non richiede di
   nuovo conferma (evita un ciclo se un'area non cancella subito la propria bozza).
3. Il cassetto sta dopo la barra di combattimento: è la stessa posizione che il Tavolo gli
   darebbe spostando la barra; ha titolo e pulsante di chiusura.
4. Le pagine d'area di Preparazione e Biblioteca hanno l'intestazione della pagina ospite
   (h1 "Preparazione"/"Biblioteca" e nome della sezione) e le schede di navigazione.
5. `registry.mjs`: corretto solo `reportHTML` perché fosse leggibile dal proprietario (gruppi,
   frase semplice, dettaglio tecnico, avvisi per area); invariate le stringhe già verificate
   dai test ("N pronte · N da costruire · N con errori", "B99 · Sample", "Avvisi circoscritti").
6. I pulsanti icona dell'intestazione hanno anche un `title` uguale al nome accessibile.
7. Le sezioni di stato si salvano già al primo caricamento se sono state create o migrate
   (come nel piano). Lettura e scrittura avvengono nello stesso passo sincrono, quindi non
   possono sovrascrivere dati scritti nel frattempo da un altro script.

## Prove

- `node --test design/blueprint/tests/*.test.mjs`: **632/632** all'ultima esecuzione: i 6
  nuovi test di `registry-shell.test.mjs` più quelli presenti (621 all'inizio; altri 5
  aggiunti in parallelo da un'altra sessione). I nuovi test provano che senza aree il markup di
  Tavolo (giocatore e DM), scheda, raccolta personaggi, Preparazione, Biblioteca e Campagna
  è **identico byte per byte** al core; che ogni contributo della fixture compare al suo posto
  e con il ruolo giusto; che lo strumento attivo riceve il clic sulla mappa tramite il vero
  `bindTable`; che `tokenMenu` restituisce le voci; che ogni guasto della fixture che fallisce
  resta nel proprio spazio; il rapporto raggruppato.
- Browser reale (Playwright CLI, sessione `d20-b11b`, cwd
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B11b/`, server
  `http://127.0.0.1:8879/`), eseguiti uno dopo l'altro:
  - `registry-smoke-journey.js`: **18/18**. Senza fixture: 0/48/0, nessun foglio di stile
    d'area. Fixture di prova: pagina "Prova" tra Personaggi e Campagne, attiva, CSS applicato;
    nota da pulsante e da Ctrl+Shift+N; reload conserva; Undo dal Tavolo toglie la nota e
    conserva la sezione `preserve` con correzione registrata; campanella "Richieste · 3
    notifiche" con i tiri del core e apertura della destinazione; servizio d'intestazione;
    ricerca (pagina e fornitore); blocco di Inizio tra 10 e 20; sezione di campagna tra Diario e
    Mondo; scheda "Scheda di prova" su Livia e riquadro su Extra; raccolta della Biblioteca;
    Tavolo del giocatore: strumento riceve il clic senza muovere pedine, livello sopra le
    pedine senza puntatore, nessun cassetto DM; DM: cassetto apri/chiudi, sezione di
    Preparazione e ritorno a Scene; Preferenze nei tre ambiti (DM campagna, dispositivo,
    giocatore personale; campagna non modificabile dal giocatore); "Ripristina esempio"
    rigenera le sezioni; nessun overflow orizzontale a 1440 e 390 su Inizio, pagina d'area,
    Tavolo, sezione di campagna. Fixture che fallisce + un modulo sintetico che fallisce la
    registrazione: pagina, blocco, pannello e livello circoscritti; servizio, comando e
    strumento danno un avviso breve; registrazione fallita assente (niente voce né CSS) e
    spiegata in "Cosa è pronto"; ricerca, movimento, Undo e navigazione del core funzionano.
    Area sintetica di controllo: eventi `navigate, commit, commit*, role-changed ×2,
language-changed ×2`; pagina solo DM bloccata per il giocatore, presente per il DM, in
    IT/EN; bozza d'area che protegge link, hash e cambio di ruolo (annulla resta, conferma
    prosegue una volta). Nessun `pageerror`.
  - Regressioni richieste: `core-journey` 13/13, `combat-journey` 10/10, `library-journey`
    3/3, `campaign-integration-journey` 2/2, `rest-shared-journey` 3/3, `conditions-journey`
    11/11.
  - `preparation-journey` **fallisce prima di questo lavoro**: cerca `.shared-scenes
.item-row` e il pulsante "Consulta", che non esistono più in nessun file del codice (la
    campagna ora mostra `.campaign-row` con "Consulta mappa"). Una copia nella scratchpad con
    solo quei due selettori aggiornati passa tutti i 9 controlli, quindi il resto del percorso
    non è regredito.
  - Controlli in più: `back-guard-journey` 4/4 e `companion-map-journey` 2/2 passano.
    `measure-journey` e `gestures-and-views` cercano testi non più presenti nel codice
    ("Misura:" invece di "Misura diretta:", "supera il movimento"): obsolescenza preesistente.
- Tempi: 48 sonde `HEAD` in 27–31 ms (tre caricamenti).
- Immagini (evidenza di percorsi già verificati, non prova da sola):
  `sample-home-390.png`, `dm-table-drawer-1440.png`, `dm-table-drawer-390.png`,
  `failing-home-1440.png`, `report-dialog-1440.png`, `table-areas-1440.png`,
  `preferences-settings-1440.png` nella cartella di evidenza sopra.
- Nota: i percorsi esistenti scrivono le loro immagini in percorsi fissi di
  `2026-09-23/` e `2026-09-24/inc10-closure/`; eseguirli le ha sovrascritte.

## Limiti noti

- La console mostra un 404 per area non costruita (48 oggi): sono risorse, non errori.
- Il dialogo Richieste mostra le notifiche d'area quando si apre dalla campanella; se si
  riapre da solo dopo una reazione (logica di `combat-ui.mjs`, non toccata) mostra solo i tiri.
- Blocchi d'area di Inizio solo con campagna accessibile, come i blocchi del core.
- Il Tavolo del DM a 390 px aveva già un overflow orizzontale (544 px: barra in alto che non
  va a capo e azioni di combattimento); il pulsante di un cassetto d'area lo allunga (653 px con
  la fixture). Non corretto qui: riguarda `styles.css`/`combat.css`.
- Eventi e impostazioni restano locali a questo browser; nessun backend o sincronizzazione.
- Nessuna area reale B12–B60 è stata provata: solo le fixture.

## Modifiche suggerite a file non riservati (per il coordinatore o i loro autori)

1. `blueprint-registry-plan.md`, righe 4–6: la parte B ora è applicata; rimandare a questo
   rapporto.
2. `design/blueprint/DEVELOPMENT.md`, nuova sezione breve "Areas and registry (B11)":
   `ctx.registry` è il registro condiviso; ogni area è un modulo con `register(registry)`
   elencato in `extensions.mjs`; riferimento API nel piano §1–2 e comportamento nell'app in
   questo rapporto; `?fixture=` solo per sviluppo locale; `table.menuTarget`/`table.tokenMenu`
   per B12.
3. `blueprint-checks/README.md`: aggiungere `registry-smoke-journey.js` all'elenco e segnalare
   che `preparation-journey`, `measure-journey` e `gestures-and-views` hanno selettori/testi
   obsoleti da aggiornare (`.campaign-row` + "Consulta mappa"; "Misura diretta:"; testo
   attuale del movimento oltre il budget).
4. `styles.css`, `@media (max-width: 720px)`: `.table-topline > .toolbar { flex-wrap: wrap; }`
   (e verifica delle `.combat-action`) per l'overflow preesistente del Tavolo DM a 390 px.
