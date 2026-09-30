# Condizioni e sopravvivenza — piano UI incremento 10

23/09/2026. Autore `blueprint_module_review`, modello/sforzo ereditati.
Worktree `d20-studio-interview-01`. **Solo piano delle interazioni:** la
scrittura dei consumer attende l'API unica approvata da dominio e root.

> Per l'esecuzione: ciclo Superpowers già scelto dal coordinatore, TDD degli
> handler, verifica nel browser del root e review indipendente. Nessun altro
> giro di scelte estetiche o approvazione del proprietario è necessario per
> i raccordi già autorizzati.

**Obiettivo.** La stessa creatura mostra condizioni e stato vitale nella
scheda e nel Tavolo; applicare, terminare, rialzarsi, stabilizzare e correggere
espone conseguenze e costi prima di applicarli. I dadi usano la coda esistente.

**Architettura e tecnologie.** Modulo ES, HTML escaped, controlli nativi e CSS
del blueprint. Dialogo `#dialog` contestuale e piccolo riepilogo riusabile,
senza pagina principale, secondo store o coda privata. Modalità Impeccable
Operate: continuità con riposi/forme, gerarchia leggibile e controlli diretti.

**Specifica.** [Piano 10](blueprint-build-plan.md),
[R194: N01–17, P01–09, T01–16](blueprint-conditions-research.md),
[raccordi osservati](blueprint-conditions-seams.md),
[contratto blueprint](../../docs/interview/BLUEPRINT_CONTRACT.md).
I pattern sono pubblicati e verificati dalla ricerca, non osservati da questo
autore nel runtime dei prodotti. Riuso: proiezione di base/effetto Foundry;
condizioni condivise fra token e scheda D&D Beyond; area PF contestuale
Roll20; origine/termine espliciti Fantasy Grounds; persistenza/feedback BG3.
Nessuna meccanica del videogioco sostituisce il SRD 2024 EN/IT.

## Proprietà e confine del consumer

- Questo autore: nuovi `design/blueprint/conditions-ui.mjs`,
  `conditions-ui.css`, `tests/conditions-ui.test.mjs`, piano e rapporto UI.
- `review_journey`: dominio/API condizioni; root: sorgenti esistenti,
  coda dadi, shell/scheda/Tavolo/movimento/clock; `blueprint_characters`:
  review distinta. Conservare gli edit altrui, nessun browser condiviso.
- Export UI proposti al root, non ancora funzioni implementate:
  `openConditions(ctx,{actorId,tab?})`, `renderConditionsSummary(ctx,actorId)`,
  `bindConditionsSummary(root,ctx)`, `refreshConditionsUI(ctx)`,
  `resetConditionsUI()`. Il contesto originario resta nella pagina aperta.
- Il consumer richiede proiezioni autorizzate di stato vitale, condizioni
  effettive e singole origini, termine leggibile, effetti supportati/limiti,
  permessi, richieste dovute e preview con righe prima/dopo, costi, motivi e
  metadata commit. Non legge payload privati per ricostruirli da sé.
- Creazione/apertura dei tiri passa attraverso callback root **tipizzati dal
  contratto API**. Nessuna formula calcolata dalla UI; nessun lancio casuale
  nel renderer o faccia generata per un fallimento automatico.

## Ingressi, struttura e comandi

| Contesto                                              | Interazione prevista                                                                                                                                                                                                                                                                                             |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Vicino ai PF della scheda e nell'inspector del Tavolo | Nome, PF/PF temporanei autorizzati, stato vitale e condizioni compatte. `Condizioni e stato` apre lo stesso dialogo. La sola selezione del token non cambia turno o autorità.                                                                                                                                    |
| Dialogo: stato corrente                               | Stato vitale distinto dalle quindici condizioni SRD. Mostrare conteggi TS morte e tiro dovuto solo se proiettati. Nessun conto presentato come pubblico per deduzione. `Apri richiesta` riapre l'identità già esistente, senza crearne una seconda.                                                              |
| Condizioni attive                                     | Raggruppare la definizione, espandere le origini effettivamente consultabili. Ciascuna istanza mantiene termine e comando di rimozione autorizzato; la rimozione di una origine mostra se la condizione resta attiva. Fonti non leggibili non diventano nomi, ID o conteggi indiretti.                           |
| Aggiungi condizione                                   | Ricerca delle 15 voci EN/IT ufficiali, descrizione/fonte e stato reale dell'automazione. `Etichetta manuale` è dichiarata priva di effetti inferiti. Indebolimento usa il livello canonico, senza duplicare un contatore nella lista.                                                                            |
| Origine e termine                                     | Campi umani: origine dichiarata; termina manualmente, dopo tempo di gioco, al pertinente inizio/fine turno, riposo o concentrazione. Selezionare soltanto soggetti/effetti autorizzati. Termine ignoto resta “Non registrato”; nessuna scadenza universale. Niente percorsi tecnici, ID o editor di espressioni. |
| Preview → Applica                                     | Mostrare ciò che cambia, costo, fonte, limiti e ragioni di indisponibilità. Applicazione unica e rivalidata dal dominio; errore conserva tutti gli input. Annulla prima di Apply non modifica la creatura.                                                                                                       |
| Prono                                                 | `Rialzati` apre costo/residuo proiettati e causa del blocco: metà Velocità effettiva, nessuna azione o Scatto implicito. Strisciare usa il movimento della mappa root con distanza e costo distinti; il pannello non crea una seconda modalità di tracciamento.                                                  |
| Stabilizza / primo soccorso                           | Nominare chi aiuta e chi riceve l'aiuto, selezionando solo candidati consentiti. Preview dell'Aiuto e prova Medicina; dopo l'avvio aprire la richiesta nella coda comune. Successo non promette PF; eventuale d4 di recupero è una richiesta distinta e il termine usa tempo narrativo.                          |
| Danno, cura, correzione                               | Esporre i comandi realmente supportati dall'API, con importi/conseguenze leggibili. Correzione motivata di PF/stato/conteggi non è danno, cura o resurrezione. Se Morto, la cura ordinaria è negata con motivo. PF temporanei non sono cura.                                                                     |
| Storia e Undo                                         | Origine, fine/correzione, risultati autorizzati e fonte. `Annulla ultima modifica` usa `ctx.undo/canUndo`; non equivale a rimuovere un'istanza o resuscitare. Risultati noti restano consultabili anche se annullati.                                                                                            |

Knockout resta una scelta esplicita del comando di attacco in mischia root:
il pannello mostra l'origine a 1 PF e la sua fine pertinente, senza creare
un secondo pulsante d'attacco o riusare Stabile a 0 PF. Incoscienza da sonno,
knockout e PF zero restano origini distinte; risveglio non promette Rialzati.
Se mancano dati sugli oggetti tenuti, mostrare la conseguenza da riconciliare:
non indovinare cosa cade né trattare un'armatura indossata come oggetto in mano.

## Comportamento, errori e accessibilità

- Dialogo centrato sulla creatura e sul comando scelto. Riga principale con
  nome/stato; dettagli di fonte, automazione e storico espandibili. Un'azione
  primaria per il passo corrente; nessun pulsante dimostrativo senza handler.
- Laptop: formulario e preview affiancati quando lo spazio basta; telefono:
  colonna unica, comandi raggiungibili, target almeno 44 px, testo a capo e
  stato leggibile senza affidarsi al colore. Stessi token/stili dell'app.
- Input conservati in errore e refresh. Il blur di testo/numero non ricrea il
  DOM tra pointerdown e click; un cambio strutturale mantiene details aperti,
  focus e scroll. La preview diventa obsoleta quando cambiano dati pertinenti.
- Esc/Chiudi minimizza: non declina, non tira, non cancella richieste già
  avviate. Una richiesta concorrente aggiorna l'avviso, senza sostituire il
  formulario aperto. Aprire un tiro è un gesto esplicito verso la coda root.
- Controllo e sola lettura sono distinti. Revoca/cambio ruolo rivalidano le
  proiezioni e chiudono/resettono il contesto privato; il DM non legge schede
  personali altrui. Offline segue `commit.local/visibility`, senza aggirare
  il blocco sul gioco condiviso. Nessun nome privato nei log condivisi.
- IT/EN completi, label per ogni campo, focus iniziale/titolo e restituito al
  comando d'origine; errori associati al campo e annunci di esito sobri.

## Sequenza breve e prove

- [ ] **Fissare API prima dei consumer.** Raccordare export/proiezioni e
      callback con dominio/root; verificare che tutti i comandi nella tabella
      corrispondano a operazioni concrete. Nessuna firma alternativa inventata.
- [ ] **TDD proiezione e stato.** Render con due origini della stessa
      condizione, una riservata, più stato Stabile/Morto: niente dati privati,
      niente duplicazione di penalità, automazione e limiti veritieri.
- [ ] **TDD editor e rimozione.** Handler reali con nuovi nodi dopo render:
      anteprima senza commit; annulla invariato; Apply una volta; rimozione della
      sola istanza; revisione/permesso cambiati con input ancora presenti.
- [ ] **TDD comandi e coda.** Rialzati senza risorse extra; Stabilizza usa
      attore/bersaglio corretti; apertura di richiesta tipizzata una volta;
      Esc e notifica concorrente conservano contesto; dati ignoti non diventano
      zeri o facce digitali. JSON reload usa lo stato centrale, non memoria UI.
- [ ] **Handoff verificabile.** `node --test design/blueprint/tests/conditions-ui.test.mjs`,
      hash/report e selector `data-conditions-*` al root; browser root su scheda→
      Tavolo, fonti/termini, morte/stabilità/cura, fisico/digitale, Undo/reload,
      revoca, offline, EN/IT, tastiera/touch. Review distinta prima della chiusura.

Le prove UI controllano intenzioni e payload verso l'API; formule, eventi
simultanei, immunità e transizioni normative appartengono al dominio e ai
test dei raccordi root. Nessuna di queste prove è dichiarata eseguita nel
presente piano. Le capacità ancora manuali restano esplicite e tracciate,
senza presentare il catalogo di quindici etichette come motore completo.
