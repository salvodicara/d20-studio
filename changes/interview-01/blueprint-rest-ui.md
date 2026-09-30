# Riposi e tempo — UI incremento 8

23/09/2026, autore `blueprint_module_review`, modello/sforzo ereditati.
Worktree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Stato: UI implementata; verifica handler eseguita, browser del coordinatore
superato e recheck indipendente senza P1/P2 residui nel perimetro, in attesa
della registrazione degli hash finali nel rapporto del reviewer. Non è una dichiarazione di
completezza del prodotto o del catalogo.

Ownership esclusiva: `design/blueprint/rest-ui.mjs`, `rest-ui.css`,
`tests/rest-ui.test.mjs` e questo rapporto. Dominio/API di `review_journey`;
root integra shell, store, schede, Tavolo, combattimento e possiede il browser.
Nessun edit nei file altrui, commit, installazione o servizio esterno.

## Autorità e piano

Usare [piano incremento 8](blueprint-build-plan.md),
[ricerca R192](blueprint-rest-time-research.md) e
[API concordata](blueprint-rest-api.md). Rest/time è un solo dominio sullo store
comune; nessun recupero dedotto da nome o prosa, nessun orologio reale.

1. Concordare API/proiezioni e hook del pannello prima dei consumer.
2. Test handler: avvio senza cura, destinatari controllati, tempo esplicito,
   preview/applica, interruzione/ripresa e recuperi individuali.
3. Dadi fisici/digitali, richiesta durevole, facce conservate su errore/render,
   recupero rapido esplicito con ordine/tetto, Recupero Arcano separato.
4. Correzione motivata, fonti e prima/dopo; normale Undo atomico della shell,
   nessuna barriera o cancellazione dello storico.
5. Verifica mirata, formattazione e handoff con hash a browser/reviewer distinti.

## Integrazione UI concordata

Dialogo contestuale nel `#dialog` esistente, nessuna pagina separata.
`openRest(ctx,{actorId?,restId?})`, `openGameTime(ctx)`,
`renderRestPanel(ctx)`, `bindRestPanel(root,ctx)`, `refreshRestUI(ctx)`,
`resetRestUI()`. Root espone `ctx.openRest(actorId?)`/`ctx.openGameTime()`,
chiama refresh a fine render e reset a cambio identità/reset demo.

Il contenitore `data-rest-panel` viene aggiornato senza chiudere il dialogo;
i campi incompleti vivono nel controller della vista. Chiudi/Esc lascia intatti
riposo, richieste e facce già accettate; riaprire interroga lo stato proiettato.
Undo usa soltanto `ctx.undo()` e il ledger centrale, senza percorso parallelo.

Impeccable, modalità Operate: sistema visivo esistente, righe con stato/durata,
controlli nativi e risultati per risorsa, focus e gesti touch. Nessun ridisegno
della shell, animazione ornamentale o dipendenza nuova.

## Verifica e limiti

L’autore ha eseguito 22 test UI con comandi del dominio e `createStore` reali:
il piccolo harness ricrea i nodi da ogni nuovo markup e riesegue il bind, per
non riusare input staccati dal rendering. I primi quattro test sono stati
scritti prima del consumer; il primo RED era l’import del modulo ancora
assente. Le regressioni aggiuntive verificano conseguenze, non solo markup.

- Avvio/annullamento preview senza cura, tempo o consumo; scelta esplicita
  dei controllabili, testo escaped e diniego del DM su schede personali altrui.
- Orologio condiviso avanzato dal DM, completamento distinto e before/after;
  sonno/concentrazione espliciti e dati parziali ignoti lasciati da verificare.
- Dado fisico speso una volta, faccia invalida mantenuta su nuovo rendering,
  richiesta fisica dopo reload; Undo riapre la stessa faccia accettata e
  Undo della spesa conserva una registrazione `reversed` senza nuovo consumo.
- Rapido digitale con tetto totale comprensivo dei dadi già spesi; cambio
  tetto richiede nuova preview, arresto sotto media. Rapido fisico attende
  ogni risultato senza generare la faccia o spendere subito il prossimo dado.
- Lungo interrotto: breve maturato e applicato dal dominio, dadi facoltativi,
  durata residua e ripresa individuale. Recupero Arcano resta una scelta
  distinta con slot espliciti.
- Correzione con motivo, preview invalida senza perdita input, normale Undo;
  uso personale offline, applicazione condivisa disabilitata offline;
  revisione invalidata da mutazioni rilevanti o campi cambiati.
- Lungo personale ripetuto richiede ore trascorse dichiarate. Il campo resta
  raggiungibile nei lunghi condivisi per riconciliare un cambio di contesto;
  il dominio mantiene il clock della stessa campagna come autorità.
- Revoca durante una preview: nuove proiezioni eliminano etichette cached.
  Cinque Undo fino alla rimozione del riposo lasciano accessibile il risultato
  `reversed`, con faccia/COS/minimo e indicazione di non applicazione. Il registro
  personale autorizzato resta leggibile anche senza accesso alla scheda live;
  il DM non proprietario non lo vede. Nessun controllo di riapplicazione.
- Trance mostra tempo effettivo/richiesto; due ore di Trance e due leggere
  non bastano. Riconciliazione personale→campagna senza alterarne il clock;
  lo storico personale conserva audience privata, mentre la scheda ora
  condivisa richiede connessione per applicare conseguenze.

Checkpoint eseguito: `node --test design/blueprint/tests/rest-ui.test.mjs`
(22/22); gruppo `rest-{ui,time,profile,store,integration}.test.mjs` (70/70).
Prettier sui quattro file riservati; detector Impeccable `[]`.

Nessun browser condiviso usato dall’autore UI. Root riferisce 4 percorsi browser
PASS, 11 gruppi: condiviso/fisico/reload/Undo/digitale/Arcane (3),
sonno/iniziativa/lungo/clock round (3), EN/touch/personale/offline/rapido/correzione
(4), cinque Undo reali/reload/registro orfano read-only (1). Screenshot
desktop/mobile ispezionati dal root, nessun pageerror rilevato. Queste sono
prove del coordinatore, non esecuzioni o osservazioni proprie dell’autore UI.
Il reviewer `blueprint_characters` ha ripetuto indipendentemente la regressione
del registro orfano e del DM non proprietario; nessun P1/P2 UI residuo comunicato.
Il campione locale non dimostra sincronizzazione remota, collaborazione
simultanea o completezza del catalogo dei recuperi.

## Controlli e confini dimostrabili

Nel pannello: tipo breve/lungo, contesto, partecipanti, attività iniziale,
preview → avvia; nella singola riga: stato, tempo, attività da applicare,
interruzione/ripresa/termine e preview → completamento. Per le schede personali
si registra il tempo effettivo; per il gruppo si usa il tempo narrativo del DM.
Nessun timer reale, avanzamento automatico o modifica di appuntamenti.

Il beneficio breve mostra i recuperi deterministici già applicati e mantiene
separati Dado Vita, rapido, Recupero Arcano e chiusura della finestra. Si
vedono faccia naturale, COS, totale, minimo 1, PF applicati, eccedenza e fonte.
Il limite rapido è esplicito e aumentabile con una nuova scelta. Le richieste
persistono nel dominio; chiudere, Esc e reload non equivalgono a risolverle.
Enter in un campo non chiude il dialogo. I campi incompleti si conservano
durante errori/render; chiusura intenzionale permette di abbandonare solo
il testo non ancora registrato.

Le fonti vengono dalle proiezioni del dominio; nessun recupero viene ricavato
dal nome della capacità o da una descrizione libera. I contatori parziali
ignoti non diventano zero. Le correzioni applicano soltanto i campi ammessi
dal comando, con motivo, senza riscrivere facce accettate. Non sono presenti
controlli finti per alba, riposo personalizzato o recuperi privi di regola
eseguibile verificata. Queste coperture restano aperte nel piano generale.

Selettori stabili per i percorsi browser: `data-rest-preview-start`,
`data-rest-start`, `data-rest-complete`, `data-rest-apply`,
`data-rest-time-value`, `data-rest-time-unit`, `data-rest-preview-time`,
`data-rest-dice-mode`, `data-rest-hit-die`, `data-rest-face`,
`data-rest-resolve`, `data-rest-quick-preview`, `data-rest-quick-run`,
`data-rest-preview-arcane`, `data-rest-preview-correction`, `data-rest-undo`.

## Snapshot finale

Hash effettivi dei file dirty, nessun commit. Snapshot sotto prodotto dopo
formattazione e ricontrollo; gli hash non sono un’approvazione del proprio lavoro.

- `design/blueprint/rest-ui.mjs`: `b4b36be487aff1cbe5fc12be52a93be468bed668670224e5adb29980b422d502`
- `design/blueprint/rest-ui.css`: `bb389cb797c397f9057acfe53c7148b466b4b7c70d5e7da998fb44c98ee56c44`
- `design/blueprint/tests/rest-ui.test.mjs`: `f14d04585b2d44f18e57e567a19d534aaddacd1494ee062b0653cb91a8ceb557`

Ultimo ricontrollo dopo formattazione: **70/70** nel gruppo sopra, inclusi
**22/22** handler UI. Fonti della durata all’avvio, breakdown della
concentrazione, progresso Trance effettivo/richiesto e registro orfano sono
inclusi in questo snapshot.
