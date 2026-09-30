# Editor spaziale — incremento 4

23/09/2026. Autore `blueprint_module_review`, stesso modello/effort del
coordinatore. Worktree `d20-studio-interview-01`, branch coordinato esistente.
Il precedente reviewer UI è autore di questo incremento: la review finale
deve provenire da un altro agente.

## Obiettivo e proprietà

Editor DM di muri, porte e terreno difficile disegnati liberamente; scala
calibrata su due punti con distanza nota. Tutte le modifiche restano nella
bozza fino a Salva preparazione. Nessuna inferenza dall'illustrazione.

File riservati: `design/blueprint/preparation.mjs`, `preparation.css`, nuovo
`spatial-editor.mjs`, test pertinenti e questo documento. Root possiede Tavolo,
shell e combat UI; `blueprint_characters` possiede dominio spaziale/stato.

## Piano breve

1. Verificare i confini della bozza e definire operazioni pure testabili per
   segmenti, rettangoli, calibrazione e annullamento.
2. Inserire strumenti mappa e proprietà contestuali accessibili da puntatore,
   touch e tastiera, con anteprima e annullamento del gesto.
3. Integrare salvataggio atomico, validazione condivisa e conflitti geometrici;
   preservare gli aggiornamenti live di pedine/attori e i segreti nelle anteprime.
4. Eseguire test mirati, consegnare percorsi browser al coordinatore, correggere
   i rilievi della review distinta e registrare evidenza/limiti reali.

## Implementato

- Barra sopra la mappa: Pedine, Seleziona, Muro, Porta, Terreno difficile,
  Calibra scala. Segmenti/rettangoli si disegnano con due clic o trascinamento.
  Frecce muovono il mirino, Maiusc riduce il passo, Invio fissa ciascun punto;
  Esc abbandona il gesto senza salvare il punto al successivo rilascio.
- Selezione sulla mappa o nell'elenco, trascinamento degli estremi dei segmenti,
  modifica numerica delle coordinate, eliminazione e annullamento dell'ultima
  modifica geometrica. Gli hit target dei segmenti e degli estremi mantengono
  uno spessore di 40 px sullo schermo. Il terreno rettangolare si modifica
  numericamente; non si deduce da colori o contenuto dell'immagine.
- Proprietà indipendenti `blocksMovement`, `blocksSight`, `blocksEffect`,
  `secret`. Una porta aggiunge `doorState` (closed/open/locked),
  `playerOperable` e `interactionRangeMeters`, inizialmente 1,5 m espliciti.
  Gli effetti dei flag sul movimento/attacco e il comando d'uso al Tavolo
  appartengono alle implementazioni dei rispettivi autori.
- Calibrazione: due punti, distanza nota in metri, metri per cella.
  `gridSize = distanzaPixel / distanzaNotaMetri * metriPerCella`; sono ammessi
  pixel per cella frazionari. La griglia temporanea resta visibile durante la
  preview anche se quella della scena è nascosta. Applica cambia soltanto
  `gridSize` e `metersPerCell` nella bozza; coordinate di pedine, muri e terreno
  non si spostano. Annulla calibrazione scarta la proposta; Undo ripristina
  la scala precedente, preservando le altre proprietà. Salva preparazione
  richiede prima di applicare o annullare una proposta/gesto ancora aperti.
- Tutte le geometrie portano `source.kind=authored-demo`, revisione distinta
  e titolo della configurazione originale. Nessuna falsa citazione SRD.
- La vista giocatore della preview e l'overlay condiviso filtrano `secret`;
  nessuna proprietà o ID di quella geometria entra nell'HTML proiettato.
- Save integra la validazione `validateSceneGeometry` del dominio, verifica
  conflitti sulle geometrie e preserva stato live non modificato dalla bozza:
  pedine, PF, consumi, stato di porte aggiornato durante un solo edit di note.
  Una sostituzione concorrente della geometria fallisce conservando la bozza.
  Cambiare geometria/scala della scena attiva con conseguenze pendenti è
  bloccato e spiegato; metadati indipendenti restano salvabili.
- L'avvio di un incontro preparato ripristina `objectInteractionUsed=false`
  soltanto per la prima creatura, insieme alle sue altre disponibilità.

## API di integrazione

`spatial-editor.mjs` esporta `renderSpatialOverlay(scene, ctx,
{players=false, editable=false, selectedId=null})`, che restituisce un gruppo
SVG. Il Tavolo lo chiama con `players: ctx.role !== 'dm'`; i controlli delle
porte sono di `table-spatial.mjs`, fuori dalla proprietà di questo autore.
Gli stili dell'overlay e dell'editor sono in `preparation.css`, già caricato
dal blueprint. Nessuna dipendenza o browser aggiunto.

Le altre API pure sono `createSpatialDraft`, `addSpatialShape`,
`updateSpatialShape`, `deleteSpatialShape`, `undoSpatialDraft`,
`calibrateSceneScale`, `applyScaleCalibration`, `spatialPreviewScene`.
`bindSpatialEditor` si collega al contenitore della mappa e alle callback
capture/redraw/render della preparazione; la modalità Pedine mantiene i
gesti preesistenti. Le operazioni pure modificano soltanto la bozza fornita;
il salvataggio condiviso rivalida il ruolo DM.

## Fonti e adattamento

Ricerca distinta: [blueprint-spatial-research.md](blueprint-spatial-research.md),
S01/S02 per scala, offset e preview visuale; S05/S07 per segmenti, restrizioni
indipendenti e porte; S17 per distanza di interazione configurabile.
Le fonti sono capacità pubblicate, non test runtime dei prodotti. La coppia
di punti con metri noti, l'undo di bozza e il valore iniziale 1,5 m sono
adattamenti espliciti. Non si attribuiscono al core Foundry funzionalità
appartenenti ai moduli o alle estensioni Owlbear.

## Verifica e consegna alla review

`node --test design/blueprint/tests/spatial-editor.test.mjs
design/blueprint/tests/preparation.test.mjs`: **42/42 pass** il 23/09/2026.
Otto nuovi test verificano mutazioni atomiche, undo circoscritto, salvataggio
collegato agli attori, calibrazione pura/applicata, privacy dell'overlay,
conflitto concorrente, blocco di geometria durante sequenze pendenti,
gesti click-click/drag/Esc e due punti da tastiera. Due assert aggiunti al
test d'avvio incontro verificano il reset della sola prima interazione.

`node --check` sui due moduli modificati: pass. Prettier sui file di proprietà:
pass. Impeccable detector eseguito una volta sui tre file UI: `[]`.
I test dei gesti chiamano gli handler con un contenitore simulato; non sono
spacciati per prove di puntatore/touch nel browser.

Percorso consegnato al coordinatore: DM → Preparazione → scena → Muro/Porta
con due clic e drag → proprietà → Salva (conferma scena attiva); Calibra scala
→ due punti → distanza nota → preview → Annulla/Applica/Undo; Anteprima →
Giocatori per verificare il segreto. Poi rientro al Tavolo per la prova
collegata con i controlli delle porte del coordinatore.

Stato: implementazione e test dell'autore completati; verifica browser e
review distinta in corso presso il coordinatore. Nessuna attestazione di
completezza del blueprint o approvazione del prodotto. Rotazione dell'immagine,
deformazione prospettica, poligoni di terreno e inferenza di muri dall'arte
non sono capacità implementate da questo editor.

### Correzione del focus durante il gesto

La prova browser del coordinatore ha rilevato uno spostamento involontario
della pagina: il focus alla mappa durante `pointerdown` cambiava la posizione
visuale del canvas rispetto alle coordinate del trascinamento. Il movimento
diretto verso y=200 arrivava così a circa y=310,03. Nei due handler (pedine e
geometrie) il focus usa ora `{preventScroll:true}`. La navigazione esplicita
dai pulsanti e da tastiera conserva il proprio comportamento precedente.

Regressione verificata con spy del focus in entrambi gli handler: prima della
correzione i due controlli fallivano, dopo passano. Test mirati aggiornati:
**43/43 pass**; la ripetizione del percorso browser resta al coordinatore.
