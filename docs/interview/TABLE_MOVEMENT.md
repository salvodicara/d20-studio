# Tavolo — movimento manuale e controllo dei PNG

**Stato:** definizione dell'agente adottata su delega, aggiornata il 22/09/2026.
**Tracciabilità:** I-196/I-199/I-201, R164/R166–R168; feedback owner I-200
distinto dalle scelte ordinarie dell'agente.
È un contratto concettuale in Markdown: non prova di implementazione o test d'uso.

## Selezione e controllo

- Clic/tocco sul token seleziona la creatura e rende leggibili nome, controllore,
  movimento disponibile e comandi pertinenti. Selezionare non esegue una mossa.
- Il DM seleziona uno o più PNG controllabili; l'aggiunta o rimozione dalla selezione
  ha un comando visibile. Shift-clic può accelerare il gesto su computer.
- Selezione per controllo e scelta del bersaglio sono distinte: un nemico indicato
  come bersaglio non diventa controllabile. I permessi precedono qualsiasi comando.
- Se i token si sovrappongono, una scelta esplicita fra i nomi evita di muovere
  quello sbagliato; non si includono creature nascoste a chi usa la selezione.

## Movimento semplice: il rilascio conferma

Precisazione I-198/I-199: la destinazione è un punto liberamente indicato
sulla mappa, entro i vincoli applicabili, non una scelta fra pulsanti o
posizioni predefinite. Quelli di movement-area-v1 erano scorciatoie illustrative.

- Il DM trascina un PNG: durante il gesto vede origine, destinazione candidata,
  percorso, distanza e costo previsto. Il movimento reale non parte ancora.
- Rilasciare su una destinazione valida conferma ed esegue quel movimento.
  Non compare un secondo pulsante obbligatorio per confermare la stessa scelta.
- Se il punto indicato supera soltanto il budget, la destinazione effettiva
  è la fermata raggiungibile mostrata prima della conferma, come precisato sotto.
- Prima del rilascio può cambiare destinazione o annullare il gesto. La preview
  non spende risorse, non rivela la mappa e non cambia la posizione reale.
- L'alternativa senza trascinamento è scegliere **Muovi**, individuare una
  destinazione e attivarla: quel gesto conferma. Comandi e destinazioni devono
  essere raggiungibili da tastiera, con indicazione del punto prima dell'attivazione.
- La variante touch deve permettere di distinguere consultazione ed esecuzione;
  il gesto preciso e la leggibilità della preview restano da verificare sul telefono.
- Il righello libero misura senza comandare la creatura. Movimento più attacco
  conserva I-016: puntare prepara, cliccare il bersaglio esegue la sequenza mostrata.

## Percorso preparato, quando serve

- **Pianifica percorso** è facoltativo: si aggiungono tappe per passare dalla porta,
  aggirare una colonna o indicare un cambio di quota, senza eseguire lo spostamento.
- Ogni tappa è modificabile; **Togli ultima tappa** torna al passaggio precedente.
  **Esegui** conferma il percorso; **Annulla** abbandona soltanto la preparazione.
- La destinazione e il costo si aggiornano modificando le tappe. Non si promette
  un percorso automatico ottimale né si riscrivono le tappe senza renderlo evidente.
- L'esempio ordinario è: seleziona la guardia, indica il passaggio dalla porta,
  controlla la destinazione dietro la colonna, esegui. L'attacco resta una scelta distinta.

## Puntare oltre il movimento disponibile

I-201/R167 adotta un precedente di arresto al budget con preview segmentata.
Vale per il movimento semplice, non come ripiego silenzioso di una sequenza d'attacco.

- Il percorso consentito è continuo; il tratto eccedente è rosso e tratteggiato.
  Una sagoma della pedina indica la fermata effettiva, distinta dal punto richiesto.
  Costo e messaggio «Arrivi qui con il movimento disponibile» restano leggibili
  anche senza distinguere i colori e senza hover.
- Esempio su terreno libero: 9 m disponibili, destinazione indicata a 15 m.
  La preview mostra l'arrivo a 9 m e gli ultimi 6 m non eseguibili con quella scelta.
  Confermare esegue solo il tratto consentito; non cambia di nascosto il tragitto.
- La soglia usa il costo cumulativo, non un cerchio di distanza: terreno,
  modalità di movimento, griglia e posizioni ammissibili possono anticipare
  la fermata. Arrotondamento e ingombro delle creature richiedono ancora specifica.
- Non si sceglie né si consuma Scattare automaticamente. Se la persona lo
  seleziona, la portata e la conferma seguono I-017. Il tratto eccedente non
  viene eseguito in seguito o al prossimo turno senza un nuovo comando.
- Con movimento esaurito non si cambia posizione. La preparazione di alternative
  resta disponibile, con il motivo del limite. Un ostacolo o un costo ignoto
  non sono trattati come semplice eccedenza: valgono i controlli di errore sotto.
- Se lo stato cambia prima della conferma, aggiornare la preview e rendere
  riconoscibile il nuovo limite; un comando su dati superati non autorizza
  una fermata diversa da quella che la persona ha potuto valutare.

## Costi, ostacoli, quote e più PNG

- Distanza geometrica e costo di movimento sono distinguibili. Il costo usa i dati
  effettivi della scena e regole verificate; non si inventano terreno o penalità dalla grafica.
- La preview mostra movimento richiesto e residuo. Se serve Scattare o un'altra
  capacità, rende esplicita la risorsa prevista e segue il relativo contratto d'azione.
- Una parete o porta configurata come impedimento rende evidente il tratto non
  percorribile. La normale conduzione manuale del DM non equivale a ignorare le regole.
- La quota appartiene ai punti del percorso ed è leggibile insieme alla destinazione.
  Cambiare un numero non concede automaticamente volo, arrampicata o passaggio fra piani.
- Più PNG selezionati possono preparare uno spostamento comune; ciascuno conserva
  percorso, costo, permessi e vincoli propri. Le destinazioni proposte restano visibili.
- Questo non introduce formazione intelligente, turno comune o movimento gratuito.
  Un PNG già non idoneo è segnalato: il DM corregge il piano o lo esclude esplicitamente.
- L'esecuzione di gruppo deve rispettare l'ordine di gioco. Le regole di arresto
  degli altri PNG quando uno viene interrotto sono ancora da definire.

## Segreti, errori e rete

- Token, percorso, quota e indicatori di una creatura nascosta mantengono gli stessi
  destinatari autorizzati. Una linea o un messaggio non deve rivelarne indirettamente la posizione.
- La preview usa la conoscenza consentita all'utente: non svela stanze, trappole
  o creature ignote attraverso il percorso suggerito o spiegazioni troppo precise.
- Una destinazione impossibile non esegue il comando. L'interfaccia spiega quanto
  può mostrare senza divulgare segreti e conserva la preparazione da correggere.
  L'eccedenza di budget è distinta: si conferma la fermata raggiungibile già
  mostrata, non la destinazione irraggiungibile indicata oltre il limite.
- Se mancano dati necessari, il costo resta dichiarato incompleto: nessuna cifra
  presentata come certa. Il DM può risolvere il caso con un intervento esplicito e registrato.
- Alla conferma si rivalidano permessi e stato corrente. Se la scena è cambiata,
  si mostra il problema; non si esegue silenziosamente una mossa diversa da quella confermata.
- In attesa della rete il comando è riconoscibile come pendente. Non si dichiara
  eseguito finché non è accettato; ritentare non deve duplicare movimento o consumo.

## Cambiare, fermare e annullare uno spostamento

- I-042 resta il confine: durante il movimento ordinario, senza eventi pendenti,
  un nuovo comando valido confermato sostituisce soltanto il tratto ancora da percorrere.
- La preview di un altro controllore non interferisce. Quanto già percorso e le
  conseguenze avvenute restano acquisiti; la seconda destinazione non si accoda alla prima.
- **Annulla preparazione / Esc:** elimina il gesto o percorso non ancora
  eseguito, senza spesa. Annulla anche il gesto sospeso, così il rilascio
  successivo non conferma una destinazione appena abbandonata.
- **Ferma movimento:** interrompe solo il tratto ancora da percorrere.
  Posizione raggiunta, costo già maturato e conseguenze restano. Esc può
  richiamarlo quando il contesto attivo è la mossa in esecuzione; con una
  finestra attiva ne chiude prima il contesto. Non ripristina l'origine.
- **Annulla spostamento:** dopo la propria mossa semplice, il controllore
  ripristina posizione e budget precedenti, senza approvazione preventiva DM.
  Il pulsante è visibile; Ctrl+Z/⌘Z accelera il comando nel contesto mappa.
  Non intercetta l'annullamento del testo in un campo e non annulla mosse altrui.
- È una correzione registrata, non una nuova camminata: non attraversa di nuovo
  pericoli e non spende altri metri. Scegliere invece una nuova destinazione
  coincidente con l'origine resta un movimento ordinario con i suoi costi.
- Dopo altri eventi la correzione non scompare. Il comando apre il riepilogo
  delle dipendenze anziché ripristinare alla cieca: danni, reazioni, azioni
  collegate, altri turni, risorse e modifiche di altri controllori.
  L'utente corregge quanto gli compete; il DM gestisce le conseguenze condivise
  secondo I-028/I-029. Nessun rimborso implicito di Scatto o altre capacità.
- Le informazioni già rivelate non possono essere fatte dimenticare. L'esito
  originale e quello corretto restano nel registro con autore e collegamento.
  Quando serve il DM, lo stato della richiesta deve essere esplicito e la sua
  preparazione annullabile; non fingere che la correzione sia già stata applicata.
- Permessi e stato vengono rivalidati anche per l'undo. Se un altro controllore
  ha spostato il token, non lo si teletrasporta cancellando il suo intervento.
  Senza rete si può preparare la correzione, ma il risultato condiviso resta
  pendente fino all'accettazione, senza doppio rimborso al ritentativo.
- La verifica automatica delle dipendenze, il riepilogo completo e la correzione
  delle sequenze composte restano da dettagliare. Il caso semplice non li dimostra.

## Manuale e delegato; lacune dichiarate

- I-187 mantiene la conduzione manuale come normale. La delega tattica è facoltativa
  per singolo PNG; lo stato delegato è visibile al DM insieme a **Riprendi controllo**.
- Riprendere il controllo impedisce nuove scelte delegate. Il punto sicuro per
  interrompere una sequenza già avviata resta da definire; selezionare non equivale a revocare.
- Non sono implicate pattuglie autonome in esplorazione o inizi automatici degli scontri.
- [TABLE_REACTIONS](TABLE_REACTIONS.md) precisa opportunità, richieste, consumi e ripresa
  ordinaria, I-203/I-204. Restano aperti i casi speciali di concorrenza,
  arresti parziali, taglie e collisioni, volo e altre modalità, scale e piani sovrapposti.
  Le reazioni seguiranno il testo della capacità; questo documento non ne inventa i tempi.

## Consultare la mappa senza muovere creature

Spostamento della vista e zoom sono distinti dal movimento del PNG, I-199/R166.
Su computer la base è trascinare con il pulsante destro e usare la rotella;
comandi visibili e tastiera offrono accesso alternativo, senza spesa di risorse.
Un gesto della vista non conferma una destinazione o una magia preparata.
Trackpad, touch simultaneo e mantenimento della preview fuori campo richiedono
verifica specifica. Nessuna rotazione 3D o telecamera automatica dedotta.

## Provenienza e limiti delle fonti

Fonti ufficiali consultate il 21–22/09/2026; capacità pubblicate, senza prova interattiva.
I gesti qui adottati sono un adattamento per d20 Studio, non una copia attestata dei prodotti.

- [Foundry Measurement](https://foundryvtt.com/article/measurement/), testo V13:
  misura durante il drag, tappe, costo e quota; nel percorso CTRL il clic finale esegue.
- [Foundry Controls](https://foundryvtt.com/article/controls/), intestazione 13.350,
  20/10/2025: drag-and-drop. Alcune scorciatoie discordano da Measurement; non le fissiamo qui.
- [Foundry Tokens](https://foundryvtt.com/article/tokens/): selezione multipla limitata
  al controllo; la sezione righello conserva indicazioni che Measurement attribuisce a V12.
- [Owlbear Measure](https://docs.owlbear.rodeo/docs/measure/), build non dichiarata:
  movimento e righello durante il drag, senza conferma successiva; non prova tappe o costi automatici.
- [Owlbear 2.0 Beta Patch 6](https://blog.owlbear.rodeo/owlbear-rodeo-2-0-beta-patch-6/),
  17/11/2022: righello nascosto insieme al personaggio; precedente storico, non test attuale.

R167/R168 aggiungono DnD5e 5.1.0 per i colori, Mindful Encounters 1.3.2 per
il movimento limitato al budget in esplorazione, Foundry 13.344 per ripristinare
movimenti registrati e Crucible 0.9.2 per rimborsare le sue risorse di movimento.
Non attribuire al core capacità viste soltanto in sistemi o estensioni. Queste
fonti non provano automazione completa D&D o riavvolgimento generale delle conseguenze.

## Raccordo visuale costruito — incremento 4, 23/09/2026

I-221/R188 collegano nella stessa app Preparazione e Tavolo. **Pianifica
percorso** aggiunge punti con clic/tocco o frecce+Invio; l’elenco permette
modifica/rimozione, Esegui applica e Annulla/Esc scarta senza spostare.
La modalità semplice conserva clic/drag. La preview distingue distanza,
costo del terreno, destinazione raggiungibile e tratto oltre il budget.
Misura rimane una misura diretta indipendente dal costo e senza movimento.

Una porta nota apre il dettaglio senza spese: stato, creatura, distanza e
costo del comando. Apri/Chiudi rivalida controllo, turno, incapacità,
pendenze, accesso e ostacoli; una porta a chiave non si apre con il semplice
comando. Il DM può correggere lo stato esplicitamente e senza attribuire
un’azione a un personaggio. Le porte segrete non hanno controllo giocatore.

L’attacco in mischia mostra **Avvicinati e attacca** e costo del percorso.
Le tappe preparate sono un’opzione esplicita, anche per armi con portata
personalizzata. Il clic autorizza la sequenza disponibile; dadi fisici
soltanto all’arrivo. Esc su una richiesta la riduce; Cambia mossa chiude
il seguito senza restituire movimento o danni già avvenuti. Il draft
combattimento è separato anche per scena, evitando tappe di un’altra mappa.

Le prove effettive sono in [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md). Restano
incluse le parti del contratto sopra non ancora costruite: gruppi, selezione
fra sovrapposizioni, collisioni per taglia, diagonali/altre metriche, volo,
sensi/luci, spostamenti speciali e controllo completo delle conseguenze.
Questo raccordo non approva una riduzione di perimetro o l’aspetto finale.
