# Forme e compagni — UI incremento 9

23/09/2026. Autore `blueprint_module_review`, modello/sforzo ereditati.
Worktree `~/Workspace/Codex/d20-studio-interview-01`. Candidato UI eseguibile;
review distinta e browser coordinati dal root, non attestati dall’autore UI.

Ownership esclusiva: `design/blueprint/forms-ui.mjs`, `forms-ui.css`,
`tests/forms-ui.test.mjs`, questo rapporto. Root possiede raccordi esistenti e
browser, `review_journey` dominio/API, `blueprint_characters` review distinta.
Nessun commit/install/deploy. [Piano UI](blueprint-forms-ui-plan.md),
[API approvata](blueprint-forms-api.md), [R193](blueprint-forms-companions-research.md).

Dialogo contestuale nel `#dialog` esistente, stesso stile dell’app (Impeccable,
Operate). Extra/capacità/scheda/Tavolo, nessuna route principale aggiunta.
Preview rivalidata prima di Apply; risorse canoniche e Undo della shell.
Ritorno della forma e rimozione della pedina non sono Undo.

## API della vista e raccordo

Export: `openForms(ctx,{actorId?,tab?})`, `openCompanion(ctx,{actorId})`,
`renderFormsSummary(ctx,actorId)`, `bindFormsSummary(root,ctx)`,
`renderFormsPanel(ctx)`, `bindFormsPanel(root,ctx)`, `refreshFormsUI(ctx)`,
`resetFormsUI()`. Tab pubbliche `forms`, `companions`, `familiar`, `known`;
passaggi locali `manual`, `wild-companion`, `casting`, `companion`.

La shell monta CSS/import, summary Extra/Tavolo, refresh dopo render e reset al
cambio ruolo. Callback usate: `openSheet`, `beginCompanionPlacement`,
`confirmCompanionAppearance`, `openGameTime`, `canUndo`, `undo`.
Nessun secondo store, nessuna scrittura di attori effettivi dalla UI.
Tutti i comandi leggono le query autorizzate e passano il metadata `commit`
del dominio. Il log condiviso ha un titolo neutro; la visibilità privata segue
il metadata, anche se l’operazione richiede sincronizzazione della scheda.

Il dialogo esistente contiene già un form: il pannello non ne annida un altro,
i pulsanti sono `type=button`, Enter non chiude implicitamente la vista.
Chiudi/Esc mantiene attività già registrate. Le scelte non applicate sono stato
locale della visita: la riapertura ricostruisce attività/forme/compagni dallo
store; non dichiara salvato un modulo ancora non applicato.

## Percorsi e conseguenze

- **Forma Selvatica:** ricerca e filtri note/ammissibili/recenti/catalogo;
  profili e limiti pubblicati dal dominio. Scelta esplicita dei PF temporanei
  già presenti; oggetti fusi/caduti/indossati distinti. L’attestazione della
  decisione del DM compare solo per gli oggetti da indossare. Preview con
  durata, PF temporanei offerti, CA, velocità, caratteristiche, TS, abilità,
  sensi, costi, fonte e dati conservati; nessuna regola ricalcolata dal consumer.
- **Ritorno:** comando distinto da Undo; conserva danni e risorse vivi.
  Correzione motivata del ritorno e correzione CA/velocità della sola forma
  usano API differenti dal ritorno volontario. Tempo personale esplicito,
  disabilitato durante l’iniziativa; nessun avanzamento dal tempo reale.
- **Forme note:** scelta iniziale, sostituzione dopo un proprio lungo,
  correzione motivata. Conteggio rispetto al limite proiettato. Un riferimento
  fuori catalogo resta rimovibile, senza mostrarne l’ID come nome ordinario.
- **Compagno manuale:** acquisisce uno dei profili disponibili e consente
  override motivati dei valori. Campi non toccati acquisiscono il profilo;
  svuotare un campo modificato registra `null`. Nessun cast, costo, token o
  ingresso automatico in iniziativa.
- **Compagno Selvatico:** una scelta esplicita tra uso Forma, slot canonico e,
  se disponibile, slot del Patto. Folletto, azione di Magia, niente materiale;
  termine collegato al lungo del genitore. Preview e dominio mantengono la
  singola identità del famiglio esistente.
- **Trova Famiglio:** nome, profilo, tipo, slot/rituale, oggetto-incenso,
  quantità, valore unitario e attestazione del materiale. Avvio separato dal
  completamento; sostituzione della concentrazione precedente esplicita.
  Attività durabile, progresso 60/70 minuti, prosecuzione con azione nei turni,
  annullamento motivato, stato fallito/completato consultabile. Slot e incenso
  sono rivalidati e spesi solo al completamento; la fase del materiale è
  dichiarata come adattamento del prototipo, non attribuita tacitamente al SRD.
- **Gestione della creatura:** scheda, collocazione, congedo temporaneo,
  ricomparsa, rilascio definitivo, controllori proiettati con owner mantenuto,
  correzione di un dato con motivo e archiviazione. I controlli dipendono dai
  permessi e dallo stato restituiti dal dominio. Un registro leggibile mostra
  fonte e motivo delle operazioni senza payload o ID interni degli attori.

La comparsa usa prima della preview il callback root:
`confirmCompanionAppearance({parentActorId,companionActorId?,rangeMeters},done)`.
Esito `{kind:'map',sceneId,point}` oppure `null` alla cancellazione. Soltanto
`appearanceContext.needsAttestation` espone l’alternativa narrativa esplicita;
non è una scorciatoia se esiste il token del genitore. Il dominio rivalida al
commit distanza e spazio. Callback obsolete dopo cambio pannello, ruolo o
scelte vengono ignorate. La collocazione successiva rappresenta una creatura
esistente: chiama `beginCompanionPlacement`, non ripete evocazione o spesa.

## Errori, privacy e accessibilità

La preview visualizzata viene ricalcolata dalla proiezione corrente. Il key
originario resta quello da confermare: variazioni rilevanti o input cambiato
disabilitano Apply fino a nuova preview. Nessun consumo per selezione/cancel.
Errore di dominio o commit mantiene i campi locali; il render ricrea i nodi
senza perdere valori, details aperti, focus, selezione del testo e scroll.
La preview porta al proprio titolo solo dopo il gesto esplicito di richiesta.
Revoca di lettura restituisce una vista neutra prima di esporre campi/errori
precedenti. Testi utente e fonti sono escaped, link fonte solo HTTPS.

Offline condiviso disabilita Apply; personale segue `commit.local`.
Non ci sono barriere Undo o history-clear. I pulsanti hanno area minima 44 px,
campi con label, messaggi `aria-live`/alert, layout a una colonna sotto 780 px.
EN/IT nei controlli e breakdown; valori localizzati e non JSON ordinario.
La resa reale laptop/touch rimane competenza del browser del root.
I limiti meccanici proiettati dal dominio compaiono sia nella preview sia
con forma attiva: profilo acquisito non significa anatomia interamente automatizzata.

## Prove effettive

`node --test design/blueprint/tests/forms-ui.test.mjs`: **23/23** sul candidato
qui documentato. Harness con store e dominio reali, fixture sintetica, nuovi
nodi ricercati dopo ogni render: forma/ritorno/tempHP, equipaggiamento,
manuale/reload/collocazione, privacy/revoca, costi alternativi, famiglio
personale start/reload/tempo/completion, errori materiale, cancellazione,
controllori/correzione/archiviazione, tempo personale/expiry, stale preview,
correzione forma, forme note, callback mappa tardiva, offline/retry,
concentrazione/prosecuzione in iniziativa, rituale IT, riferimenti mancanti,
blocco del salto di tempo personale durante i turni e conservazione del target
di click quando il nome o un numero perde il focus; nuova trasformazione dopo
oggetti lasciati a terra e righe inventario esaurite; reset del contesto mappa
fra gestione di una creatura e nuova comparsa.

Gruppo `forms-ui.test.mjs` + `forms-companions.test.mjs` + `state.test.mjs`: **66/66**
al checkpoint dopo il fix B1. Non è una dichiarazione sulla suite completa dell’app.

TDD osservato: import dominio inizialmente assente (scaffold, non prova
comportamentale); quindi funzioni UI mancanti; gruppi successivi RED per
controllori/tempo personale, correzione forma, rimozione riferimento non
disponibile e bypass del tempo in iniziativa, poi GREEN dopo il consumer.
Prettier sui soli file riservati. Detector Impeccable: nessun finding nelle
due sorgenti UI al checkpoint eseguito. Nessun browser o playtest umano
eseguito da questo autore; non si attribuiscono runtime ai prodotti studiati.

### B1 — click perso dopo l’uscita dal nome

Il root ha riprodotto nel browser `manuale → nome Muschio → click Gatto → preview`:
la preview segnalava profilo mancante; un secondo click funzionava. La causa
era `change` del testo che ridisegnava il pannello tra pointerdown e click.
Test handler RED riproduce il distacco del pulsante; il fix aggiorna testo,
numeri e stale senza render al blur. SELECT/checkbox mantengono il render
strutturale. GREEN conserva i nodi Cat/Preview e verifica la singola scelta.
Il rerun del percorso browser è riservato al root; non viene dedotto dal test.

### Raccordo equipaggiamento dopo un ritorno

Il reviewer distinto ha riprodotto Cat con mantello lasciato a terra → ritorno
→ Rat: UI inviava anche righe `location:ground` o `quantity:0`, mentre il
dominio richiede soltanto gli oggetti trasportati. Un helper unico filtra
render e payload con `quantity>0 && location!==ground`; nessuna modifica
all’inventario canonico. Test handler/store RED→GREEN copre due trasformazioni,
scelta dei PF temporanei, persistenza della posizione a terra e quantità zero.

### Raccordo contesto della comparsa

Secondo finding del reviewer: gestire A sulla mappa e poi avviare la creazione
di B conservava `companionId:A`, escludendo A dalle collisioni del picker,
mentre la successiva preview del dominio negava quel punto occupato.
Cambiare tab pulisce il contesto; `companionActorId` viene inviato soltanto
dalla gestione del compagno pertinente. Test RED→GREEN con handler reali e
`previewTokenPlacement`: punto di A non disponibile, punto libero coerente
con la preview, A invariato. Nessuna modifica al callback o alla geometria root.

## Frontiera dichiarata

Tre profili acquisiti (gatto, topo, lupo), non catalogo completo. Registrazione
manuale da questi profili più override, non editor universale di mostri.
Nessun automatismo inventato per capacità prive di dominio collegato:
telepatia/sensi remoti/consegna di incantesimi a contatto, altri tipi di
trasformazione, cavalcature e controller reali multipartecipante restano
obblighi aperti. Due identità demo esistenti, senza impersonazione aggiunta.
Il tempo, il combattimento, le correzioni di fonte e la geometria dipendono
dagli adapter del root e dalle API verificate separatamente.

Snapshot SHA-256 del candidato UI sottoposto alla review distinta:

| File                      | SHA-256                                                            |
| ------------------------- | ------------------------------------------------------------------ |
| `forms-ui.mjs`            | `d6bd59e26a5ed7ed3119f4778c7106fa8f95ce3d436a1436658c0699fbfad7a6` |
| `forms-ui.css`            | `6d4576fd51f4388df551968ebda9d79d384b5fa541dc9de56e032e8d400022d1` |
| `tests/forms-ui.test.mjs` | `69a7c183792051b417baa847a7b9ff62c43274bc5b5dfd00ecbde87e6cbd7309` |

Il rapporto non pretende di approvare il proprio commit o tutta l’app.
