# Blueprint — review indipendente dell’incremento spaziale

23/09/2026, reviewer `review_journey`, modello e sforzo ereditati invariati.
Worktree `d20-studio-interview-01`. Unico file scritto da questo incarico:
questo report. Nessuna modifica al codice degli autori, nessun browser
condiviso usato, nessun commit o intervento in produzione.

## Esito

**Nessun P1/P2 aperto nel perimetro esaminato.** I due rilievi emersi durante
questa lettura sono stati corretti dagli autori e ricontrollati, come
riportato sotto. È chiuso anche il problema nel tiro fisico diretto scoperto
dall’altro reviewer UI e comunicato da root, riportato separatamente come R3.
È una review di un candidato locale dirty, identificato con hash dei file:
non è approvazione di un commit, dell’intera app o del contratto da parte
dell’owner.

## Perimetro e criteri

Editor e salvataggio della preparazione (`spatial-editor.mjs`, relativi stili,
raccordi `preparation.mjs`); geometria pura (`spatial.mjs`); movimento e
avvicinamento (`state.mjs`, nuovi rami di `combat.mjs`); porte e tappe
(`table-spatial.mjs`, `path-ui.mjs`, `table.mjs`); raccordi dell’avvicinamento
in `combat-ui.mjs` e `reaction-ui.mjs`.

Confronto mirato con [TABLE_MOVEMENT](../../docs/interview/TABLE_MOVEMENT.md),
[TABLE_ACTIONS](../../docs/interview/TABLE_ACTIONS.md),
[TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md),
[BLUEPRINT_CONTRACT](../../docs/interview/BLUEPRINT_CONTRACT.md),
[contratto dei moduli](../../design/blueprint/DEVELOPMENT.md) e
[ricerca spaziale](blueprint-spatial-research.md). Lettura delle evidenze di
[editor](blueprint-spatial-editor-evidence.md) e
[dominio](blueprint-spatial-domain.md), senza attribuire al reviewer le prove
runtime eseguite da root.

Controllati: separazione bozza/stato condiviso, collisioni dichiarate,
terreno e budget, tre canali movimento/vista/effetto, porte segrete,
annullamento dei gesti, input numerici, permessi e turno, indisponibilità
esplicite, gate offline condiviso, interruzioni e risorse della sequenza
avvicinamento–attacco. Non è una seconda revisione generale di tutti i rami
preesistenti dell’app.

## Rilievi chiusi

### R1 — P2: apertura di una porta attraverso un altro muro

Nel primo snapshot `previewDoorInteraction` controllava distanza e permessi
ma non il segmento di accesso. Riproduzione indipendente: Livia a (250,380),
porta a x=290 con portata configurata 1,5 m, muro solido intermedio a x=270.
La preview era disponibile a 1,2 m; il comando apriva la porta e consumava
l’interazione.

Correzione verificata: validazione della geometria e controllo del percorso
fisico verso il punto più vicino, escludendo la porta stessa. Un altro
ostacolo, anche segreto, impedisce l’operazione con motivo generico; nessun
ID o coordinata privata entra nel motivo. Il tentativo rifiutato è atomico.
La correzione ambientale esplicita del DM resta distinta dal gesto della
creatura. La regressione dell’autore passa e i cinque test porte sono verdi.

### R2 — P2: percorso preparato nascosto agli attacchi con maggiore portata

Il controllo «Passa dai punti del percorso preparato» usava inizialmente
`rangeMeters <= 1.5`: un PNG con attacco in mischia dichiarato a 3 m perdeva
il comando pur avendo tappe preparate e supporto del dominio.

Correzione verificata: disponibilità basata sulla categoria dell’attacco in
mischia. Un harness indipendente ha preparato un PNG con portata 3 m,
registrato una tappa privata, invocato il binding del comando `melee-attack`
e renderizzato l’ispettore: `data-combat-waypoints` è presente. Nessun dato
del personaggio o costo è stato cambiato da questa preparazione.

Aggiornato anche il testo «Regola e calcolo»: muri, porte e terreno risultano
collegati; metrica di griglia, ingombri e copertura parziale restano limiti
dichiarati, senza attribuzione impropria alla baseline SRD.

### R3 — P2 della review incrociata: bersaglio cambiato prima del tiro diretto

Rilievo comunicato da root, scoperto dall’altro reviewer UI: nella finestra
di tiro fisico diretto il bersaglio può diventare fuori portata; il comando
già preparato poteva allora convertirsi silenziosamente in avvicinamento
prima del tiro. Non è un nuovo consenso al movimento. Correzione verificata:
il comando diretto conserva `selection.allowApproach=false`; il dominio lo
rispetta prima di muovere o consumare risorse, anche nelle retry.

Oltre alla lettura del nuovo test, eseguito un harness indipendente del
callback UI effettivo: binding → selezione dadi fisici → attacco col bastone
→ clic sul bersaglio inizialmente entro portata → bersaglio spostato →
`dialog.onSubmit`. Il risultato è `approach-not-authorized` e lo stato JSON
rimane identico: nessun movimento, consumo o dado accettato. Questa prova
senza browser non viene attribuita alla review che ha scoperto il problema.

### R4 — P2 rilevato dal browser: focus che sposta il canvas durante il drag

Rinnovo mirato successivo alla prima chiusura. Root ha segnalato dal proprio
percorso browser che portare il focus al canvas durante `pointerdown`
scorreva la pagina: la destinazione y=200 della pedina diventava circa
y=310. L’autore ha aggiunto `focus({preventScroll:true})` nei soli handler
pointerdown di pedine e geometrie.

Verifica indipendente: ripristinando soltanto le due chiamate precedenti in
memoria, gli SHA-256 tornano esattamente a quelli del primo snapshot; non ci
sono altre modifiche di codice nei due moduli. Il focus resta attivo e
precede la conversione delle coordinate; cambia soltanto il divieto di
scorrimento implicito. La navigazione esplicita e i comandi tastiera sono
invariati. Letti i due controlli spy pertinenti e rieseguita la suite
`spatial-editor.test.mjs` + `preparation.test.mjs`: **43/43 pass**.

Rilievo chiuso per il delta di codice e gli handler simulati. La ripetizione
del drag reale nel browser resta a root; questo rinnovo non la dichiara
eseguita dal reviewer. Aggiornati sotto soltanto gli hash dei due moduli e
del relativo file test.

## Verifica indipendente

Prima del successivo fix R4, suite pertinente eseguita nuovamente dal reviewer dopo R3 e la formattazione: **129/129 pass**, con i test di
spatial, spatial-combat, spatial-editor, doors, preparation, combat-ui,
reactions, combat e state. Comprende regressioni dei consumi e delle evidenze
durevoli precedenti, non soltanto test che riproducono la nuova struttura.

Durante la prima esecuzione concorrente con il fix R1, due vecchie fixture
porte erano temporaneamente prive della nuova distanza obbligatoria:
17/19 pass. Le fixture sono state corrette esplicitamente; l’esito finale
sopra deriva dall’ultima esecuzione, non da quell’istantanea intermedia.

Esempi verificati dalla suite e dalla lettura dei rami pertinenti:

- Terreno sovrapposto resta a costo doppio; tappe, soglia del budget e
  movimento già compiuto mantengono distanza e costo distinti.
- La preview non usa geometrie segrete per suggerire una deviazione;
  l’esecuzione controlla tutta la geometria prima di spendere risorse.
  Una geometria cambiata durante la pausa non riscrive il percorso accettato.
- Salvataggio della sola geometria conserva le posizioni aggiornate dal
  Tavolo e i consumi; solo metadati conserva lo stato corrente di una porta.
  Conflitti geometrici o conseguenze pendenti impediscono sostituzioni indebite.
- Due clic, drag, Esc e calibrazione da tastiera sono esercitati da handler
  simulati. I punti della calibrazione non muovono pedine o attori.
- La sequenza in mischia impossibile non parte parzialmente e non sceglie
  Scatto. L’arrivo fisico lascia l’azione libera fino al vero tentativo;
  reload e retry non generano un secondo tiro.
- Opportunità e danno mantengono Continua/Cambia: il cambio conserva quanto
  già percorso e risolto. Un bersaglio cambiato non causa un secondo
  inseguimento automatico. La prosecuzione digitale usa l’autorità originaria.
- Vista ed effetto restano distinti. Due creature reciprocamente non viste
  hanno cause di vantaggio e svantaggio che si annullano; la cecità di una
  sola creatura non viene resa simmetrica. Dardo incantato e opportunità
  conservano il requisito specifico di vista.

## Limiti e verifica runtime da mantenere distinta

Nessuna nuova prova browser di questo reviewer. Root possiede in esclusiva
le prove del percorso reale; gli harness dei gesti non attestano touch,
focus, ridimensionamento, lettore schermo o usabilità. Prima di consolidare
la consegna dell’incremento devono restare tracciati i percorsi browser
editor→Salva→Tavolo, porta→costo→turno, tappe→terreno→Esc/undo e
avvicinamento→opportunità→Continua/Cambia→richiesta fisica o esito digitale,
con EN/IT e offline pertinenti.

Il modello corrente è 2D continuo, euclideo e basato sui centri delle pedine.
Non dimostra ingombri, regola delle diagonali a griglia, illuminazione,
visione speciale, copertura parziale, dislivelli o completezza del pathfinding.
Le geometrie e la scala sono autoriali; nessuna regola deriva dalla grafica.
Le fonti di concorrenti sono documentali e i moduli restano distinti dai core.
Le proiezioni locali non dimostrano sicurezza o sincronizzazione di produzione.
Questi limiti non escludono requisiti dal goal completo.

## Snapshot dei file

SHA-256 rilevati dopo la formattazione coordinata; i tre file di R4 sono
aggiornati dopo il rinnovo mirato da 43 test. Nessuna
approvazione è implicita per modifiche semantiche successive. Tutti i percorsi
seguenti sono relativi a `design/blueprint/`. I file test elencati costituiscono
il comando `node --test` della suite pertinente sopra riportata.

| File                            | SHA-256                                                            |
| ------------------------------- | ------------------------------------------------------------------ |
| `spatial.mjs`                   | `6ef9c613b6de585ce1ef8132935497b34d07e635fb500d4e6bf78c4eba818e95` |
| `combat.mjs`                    | `0ff6325d7f276dee344562e14330d88478feb3823883f61443db0dce9c82c7a6` |
| `state.mjs`                     | `134605792960edc2e58760ee586eb34fd9cf5d703176f128ab6bb8379ed76543` |
| `spatial-editor.mjs`            | `566369405728fad1d4c1a3e8c9bca32bd84f28a6be84735e2fb188f9016b6cc0` |
| `preparation.mjs`               | `b950a9fd75bee84ee25b4c64e188466783b9cbf04f22c38dd892dc53492647b8` |
| `preparation.css`               | `ff31ce7f28563a9da6c339cf30e95194012bf5fedb8cf899b22bf58608377a70` |
| `table-spatial.mjs`             | `d44e95d3af7a12a76abe35d50646715fb4e713e4d0390f2803ca029e2112a1bc` |
| `path-ui.mjs`                   | `25ed082537920aadf0f09b6d7da7d3d567fd26905156fd4d4fba1033d355f15c` |
| `table.mjs`                     | `60143852c7c95cffcd0b9fe2ed31bf9beee856c4e4c45fef672a9bef320b4007` |
| `styles.css`                    | `228cfa92d4dd090fc2508abb4f4494c2616e9d5103d451bfdfe53072a0dd1765` |
| `combat-ui.mjs`                 | `dcb8a1c2a96638e37aef433b67a994a97fd5a5df85178b32b581c6cd0b36a29b` |
| `reaction-ui.mjs`               | `0bd8387b4d6ed34fc3aebb6ed5ad6a3417d37f5180cd656ef8cefd7a904e616c` |
| `tests/spatial.test.mjs`        | `299bb98439b75f82c7545557dea821fa69eb963e7a52e9be1a04818d31bbb13d` |
| `tests/spatial-combat.test.mjs` | `ec7fbb996b3f19dec49e71709ba3fb0067e50dc22aef7a18bd013a79277c0b44` |
| `tests/spatial-editor.test.mjs` | `a2e4a51d3760e44450f65b194b44360414ca1f78df3f42876c192801acb6f42b` |
| `tests/doors.test.mjs`          | `83ccf8619d0c9495208568f414249cd7b26fbbb54a11eeefd5d76d1f03e7d2fe` |
| `tests/preparation.test.mjs`    | `8c63eb194db1eee1109defbc5e21c8a269a29b227d428419bb5ceb341afe7e16` |
| `tests/combat-ui.test.mjs`      | `2c4fa6518df0934129aca4394494eadbbe726a5796f9755bfc5ee8e704406046` |
| `tests/reactions.test.mjs`      | `2a6935975654c89d2b4b7a4cfb6bf160788be18f5c30f46f72c8fe76e0b4501e` |
| `tests/combat.test.mjs`         | `c67c3a9b2472b1b53decf7702930352cbe20cffb9b66ddee3cd3a756c7d14fbb` |
| `tests/state.test.mjs`          | `107ada583c5322031c327f58aa87184f46b7bbf7ddbc42d4579ee2a622d20fda` |
