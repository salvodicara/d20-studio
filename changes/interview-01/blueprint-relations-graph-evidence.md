# B58 — Grafo delle relazioni: prove

24/09/2026 (cartella prove datata 2026-09-25). Area B58 del blueprint, costruita nel worktree
`codex/interview-01` in parallelo con le altre aree. Inclusione delegata del 23/09/2026 (I-233,
conflitto C11 riaperto): il grafo si aggiunge all'elenco delle relazioni di B43, non lo
sostituisce (F-014). Dati sintetici, simulazione locale a due identità (giocatore e DM nello
stesso browser): le proiezioni non sono un controllo d'accesso di un server.

## File

Nuovi (tutti di B58): `design/blueprint/relations-graph.mjs` (modulo d'ingresso: proiezione del
grafo, disposizione, sezione di stato, interfaccia e registrazione),
`design/blueprint/relations-graph.css`, `design/blueprint/tests/relations-graph.test.mjs`,
`changes/interview-01/blueprint-checks/relations-graph-journey.js`, questo rapporto.

**Una modifica aggiuntiva a un file condiviso** (consentita dal compito quando manca un
aggancio): `design/blueprint/journal-plus.mjs` (B43), funzione nuova `relationsPart` subito
prima di `renderArchive` e una riga di `renderArchive` che la usa per la parte «Relazioni».
Segue la convenzione già usata da `campaign.mjs` per i blocchi `.entry`, `.editor`, `.sessions`:
un contributo `campaign-section` con id che finisce in `.relations` riceve `{kind: "relations",
list}` (il markup dell'elenco B43) e presenta la parte. Senza un'area così la parte è l'elenco
da solo, identico a prima (provato dal test «Without the B58 area…» e dai 61 test di B43 e del
registro). Nessun altro file condiviso toccato; `extensions.mjs` elencava già B58. Il
coordinatore può riportare la convenzione `.relations` nel piano del registro. Controllo nel
browser (sessione `d20-b58`, contesto nuovo): in modalità «Elenco» il modulo B43 dentro il nuovo
spazio aggiunge una relazione con Invio, «Rimuovi relazione» la toglie e «Rivela…» apre la sua
finestra, senza errori di pagina (i gestori di `bindArchive` coprono ancora la parte).

## Dove si trova (B61 e regola del registro §5.2)

| Punto                           | Contributo                                                                                                                                                                                   |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campagna › Archivio › Relazioni | Interruttore **«Elenco \| Grafo»** in testa alla parte (`relations-graph.relations`). «Elenco» è l'elenco B43 invariato e resta il predefinito; «Grafo» è la vista nuova.                    |
| Pagina di una voce Diario/Mondo | Riquadro **«Nel grafo delle relazioni»** (`relations-graph.entry`): grafo locale della voce, solo se ha almeno un collegamento leggibile, e «Apri nel grafo delle relazioni».                |
| Palette dei comandi (B23)       | **«Apri il grafo delle relazioni»** (`relations-graph.open`, contesto globale, solo membri e solo se l'Archivio B43 è caricato).                                                             |
| Barra laterale della campagna   | Nessuna voce nuova: i due blocchi hanno `when(ctx, arg)` vero solo con il loro argomento, quindi l'elenco delle sezioni (che non passa argomenti) non li mostra. Nessun pulsante in testata. |

Raggiungibilità provata: pagina della campagna → Archivio → Relazioni → Grafo = **3 clic**; la
scelta «Grafo» resta per quell'identità su questo dispositivo, quindi le volte dopo bastano 2
clic. Da una voce del Diario o del Mondo il grafo locale è già sulla pagina e quello completo è
a 1 clic. Il grafo sta nell'Archivio perché lì vivono le relazioni di B43; le voci del Mondo
del core entrano nel grafo come nodi e hanno il proprio riquadro locale.

## Capacità → percorso → prove

Comandi (dal worktree): `node --test design/blueprint/tests/relations-graph.test.mjs` → **11/11**;
B43 e registro dopo l'aggancio (`journal-plus`, `factions`, `quests`, `quests-review`,
`registry`, `registry-shell`) → **61/61**; suite completa `node --test design/blueprint/tests/*.test.mjs` → **1777/1777** (24/09, dopo le
modifiche di B58); ultima corsa, con altre aree nel frattempo aggiunte al worktree, **1886/1887**:
l'unico fallimento è in `tests/knowledge.test.mjs` di un'altra area in costruzione (la corsa
precedente aveva due fallimenti transitori in `tests/spells-plus.test.mjs`, spariti alla
ripetizione); i test di B58 e B43 insieme → **49/49**. Percorso nel
browser, dalla cartella prove `…/d20-blueprint-evidence/2026-09-25/B58/`:
`playwright-cli -s=d20-b58 --raw run-code --filename=…/blueprint-checks/relations-graph-journey.js`
→ `ok: true`, **10 gruppi di controlli**, nessun `pageerror` (esito in `journey-result.json`
nella stessa cartella). Solo Chromium.

| Capacità (censimento)                                                                              | Percorso nell'app                                                                                  | Comandi ed esito provato (test Node · controllo del percorso)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Regola / fonte                                                                                                                    | Pattern adottato (prodotto, ID)                                                                                                                                             | Prova visiva                   |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| CA-36 Relazioni rappresentate a grafo, **in aggiunta all'elenco** (scheda B58)                     | Campagna › Archivio › Relazioni › «Grafo»                                                          | Giocatore: 3 clic dalla campagna; «Elenco» predefinito con le 3 relazioni B43; «Grafo» le mostra come nodi e linee; tornando su «Elenco» la relazione aggiunta dal grafo è nell'elenco. · test «UI: the Archive's Relations part…»; percorso A, E2                                                                                                                                                                                                                                                                                                         | I-233 (C11), F-014: l'elenco resta il predefinito                                                                                 | Kanka Connections: vista tabella o «Connection Map», «View web» (CMP-29)                                                                                                    | b58-00, b58-01                 |
| Relazioni segrete visibili solo a chi le può leggere (regola 1)                                    | Grafo del DM e del giocatore; clic sulla linea «paga in segreto»                                   | DM: linea tratteggiata dorata marcata «segreta», dettagli «Connessione segreta · solo DM». Giocatore: linea **assente** (non mascherata), anche il nodo «Il forziere che morde» (missione nascosta) e le schede dei goblin. «Rivela…» a Doran: il giocatore (Livia) non la vede; a Livia: la vede marcata «rivelata», in sola lettura, senza l'elenco dei destinatari; «Nascondi di nuovo» la toglie. · test 1–2; percorso A, E1                                                                                                                           | Proiezioni B43 `listRelations`/`relationReadable`/`reaches` (legge chi controlla un personaggio destinatario)                     | Scabard connessioni segrete fino alla rivelazione (CMP-83); Kanka visibilità della relazione (CMP-29)                                                                       | b58-04, b58-05, b58-06         |
| Filtro per tipo (regola 2)                                                                         | Chip dei tipi sopra il grafo, con conteggio                                                        | «Missioni» premuto: spariscono missioni e le loro linee (committente); di nuovo con Invio da tastiera; al telefono con un tocco su «Characters». Il centro di un grafo locale resta anche se il suo tipo è nascosto. Tipi presenti: missioni, persone, organizzazioni e fazioni, luoghi, negozi, eventi, elenchi, pagine, personaggi, creature, Diario, scene. · test «view…»; percorso D, I                                                                                                                                                               | —                                                                                                                                 | Obsidian graph view: filtri e «Orphans» (CMP-89); tipi di voce di Kanka                                                                                                     | b58-01, b58-08                 |
| Clic su un nodo apre la voce (regola 3)                                                            | Nodo del grafo; Invio sul nodo; tocco al telefono                                                  | Pagina dell'archivio (Tessa, Casa Varro), missione nel registro Missioni, scheda del personaggio, voce del Diario/Mondo, scena. Indietro del browser torna al grafo. Un trascinamento non apre; una pressione lunga al telefono mostra l'anteprima senza aprire. · test «UI handlers…»; percorso B, G, I                                                                                                                                                                                                                                                   | —                                                                                                                                 | Obsidian: clic apre la nota (CMP-89); Kanka: anteprima della voce senza lasciare la pagina (CMP-29)                                                                         | b58-02                         |
| **Nessuna relazione dedotta dal testo** (regola 4)                                                 | Selettore «Mostra» (tre modi)                                                                      | «Solo relazioni»: solo le relazioni B43. «Relazioni e voci collegate» (predefinito): più committente, pagina superiore, elementi, collegamenti delle voci del Diario. «…e collegamenti [[]]»: più i soli `[[link]]`scritti dall'autore. La menzione semplice «Casa Varro» nel testo dell'osservatorio **non** crea linee in nessun modo; un`[[Tessa Varro]]` in un blocco segreto non rivelato è una linea marcata solo per il DM e compare al giocatore dopo la rivelazione del blocco. · test 3; percorso D                                              | Censimento conflitto S3: niente estrazione dal testo; le menzioni non collegate restano suggerimenti di B43 da confermare         | Kanka 1.12, tre modi dell'esploratore «Relations / + related / + mentions» (CMP-29); Obsidian: le linee sono i link interni (CMP-89)                                        | b58-03                         |
| Nodi = voci della campagna, PNG, fazioni, missioni (da B43 e dai collegamenti di campaign-content) | Grafo completo; pagina di una voce                                                                 | Tutte le pagine leggibili dell'Archivio e le voci del Mondo (anche senza collegamenti, disattivabili con «Voci senza collegamenti»), più schede, scene e voci del Diario raggiunte da una linea. Una voce del Mondo «Il guado delle lanterne» con collegamenti a Doran e al resoconto entra con tipo Luogo e due linee, per DM e giocatore; un appunto «Solo io» di Livia con un collegamento compare solo al suo giocatore, mai al DM. · test 4                                                                                                           | Accesso di `campaign-content.mjs` (`listCampaignEntries`, `resolveCampaignLinks`); «Solo io» mai leggibile dal DM (I-044–I-048)   | Kanka «Related elements» di una voce (CMP-29, CMP-32)                                                                                                                       | b58-01, b58-04                 |
| Grafo locale con profondità                                                                        | «Centra su» o «Solo i suoi collegamenti» nell'anteprima; cursore «Profondità» 1–3                  | Tessa: 2 voci a profondità 1, 3 a profondità 2 (cursore spostato con la freccia); «Torna al grafo intero». Il grafo locale si dispone da solo. · test «view…»; percorso D                                                                                                                                                                                                                                                                                                                                                                                  | —                                                                                                                                 | Obsidian local graph con cursore della profondità (CMP-89)                                                                                                                  | b58-03                         |
| Evidenziare i collegamenti e anteprima                                                             | Passaggio del mouse o Tab su un nodo                                                               | Il nodo e i vicini restano accesi, il resto si attenua; il riquadro «Dettagli» mostra tipo, numero di collegamenti ed elenco (in uscita/in entrata, con «segreta» o «rivelata»); ogni riga porta alla linea. «Evidenzia» per nome: «varro» accende Casa Varro e Tessa Varro senza togliere il fuoco dal campo. · percorso B, D                                                                                                                                                                                                                             | —                                                                                                                                 | Obsidian: hover evidenzia i collegamenti, gruppi colorati da una ricerca (CMP-89); Kanka anteprima (CMP-29)                                                                 | b58-02, b58-05                 |
| Disporre le voci sulla lavagna                                                                     | Trascinamento (mouse o dito) o frecce (Maiusc = passo lungo) su un nodo del grafo completo         | Il rilascio conserva l'intera disposizione visibile, così nessun'altra voce si sposta. La disposizione è **personale** (modifica locale di quell'identità, consentita anche senza rete), per campagna e per formato (computer / telefono). «Annulla ultima modifica» rimette la voce dov'era senza toccare lo spostamento precedente; il ricaricamento la conserva; «Riordina automaticamente» torna al layout automatico e Annulla lo ripristina; freccia e poi Tab salva e porta il fuoco alla voce seguente. · test «arrangement…»; percorso B, C, F, I | Annulla di gioco a istantanea (`undo: "snapshot"`); la pila di Annulla resta della sessione (DEVELOPMENT.md)                      | LegendKeeper Boards (CMP-72); Obsidian Canvas: schede disposte a mano, «zoom to fit» (CMP-90)                                                                               | b58-02, b58-09                 |
| Aggiungere e gestire una relazione dal grafo (DM)                                                  | «Aggiungi relazione» (parte dall'ultima voce in anteprima) o «Relazione da qui»; clic su una linea | Maestro Oben «ha addestrato» Livia aggiunta con Invio; dalla linea «Rimuovi relazione» → avviso con «Annulla ultima modifica» → Annulla la rimette. Rivela / Cambia a chi è rivelata / Nascondi di nuovo. Il giocatore non ha questi comandi e il dominio lo rifiuta («Solo il DM…»). Senza rete la relazione è rifiutata dentro la finestra, nulla salvato. · test «UI handlers…»; percorso E2, F                                                                                                                                                         | Comandi B43 `addRelation`, `revealRelation`, `hideRelation`, `removeRelation` (DM); modifica condivisa bloccata senza rete (core) | Kanka: «+» per aggiungere, clic sulla linea per vedere e modificare la relazione (CMP-29)                                                                                   | b58-05                         |
| Grafo di una voce sulla sua pagina                                                                 | Diario › resoconto › «Nel grafo delle relazioni»                                                   | Il resoconto elencato tra gli Elementi di «La lanterna riaccesa» mostra il suo grafo locale; clic sulla missione la apre; «Apri nel grafo delle relazioni» apre l'Archivio centrato sulla voce. · test «entry page…»; percorso G                                                                                                                                                                                                                                                                                                                           | —                                                                                                                                 | Kanka Connection Map della singola voce (CMP-29)                                                                                                                            | b58-07                         |
| Zoom, spostamento, adatta                                                                          | Pulsanti + / − / Adatta sotto la lavagna; trascinamento dello sfondo; Ctrl o Cmd e rotella         | Ingrandire cambia la vista, «Adatta» torna alla lavagna intera; le aree di tocco dei nodi restano ≥ 44 px a ogni zoom. · percorso D, H                                                                                                                                                                                                                                                                                                                                                                                                                     | WCAG 2.5.8 (bersagli), alternativa a un solo puntatore per il trascinamento (frecce)                                              | Obsidian: rotella o + / − e trascinamento (CMP-89); D&D Beyond Maps: rotella, widget di zoom, pressione per trascinare al tocco (DDB-120); Owlbear zoom con + / − (VTL-209) | b58-01                         |
| Lingue, telefono, tocco, tema                                                                      | Preferenze › English; 390 × 844 con tocco; tema chiaro                                             | Etichette inglesi («Relations and related entries», «Entries without links», «Recap» per un resoconto senza titolo); nessun trabocco orizzontale a 390 e 1440; tutti i controlli dell'area ≥ 40 px; al telefono tocco su «Graph», sul tipo, pressione lunga (anteprima), trascinamento col dito (salvato nel formato telefono), tocco che apre. Colori con forma e nome, variante per il tema chiaro. · percorso H, I                                                                                                                                      | EN/IT con italiano predefinito                                                                                                    | —                                                                                                                                                                           | b58-08, b58-09, b58-10, b58-11 |

## Regole e dati

- Nessuna regola di D&D è coinvolta: relazioni, collegamenti e disposizione sono dati narrativi
  dell'archivio. Nessuna citazione SRD è stata aggiunta o inventata.
- Nessun seme nuovo: il grafo usa le pagine, le relazioni e le connessioni segrete di B43
  (Tessa Varro, Casa Varro, Gilda delle lanterne, Maestro Oben, goblin del cortile, missioni), gli
  attori esistenti (Livia, Doran, goblin), la scena «Il cortile dell'osservatorio» e il resoconto
  della campagna `lanterns`. Una relazione aggiunta dal grafo compare nell'elenco B43 e nelle
  pagine delle voci perché è la stessa relazione.
- Sezione di stato `state.ext["relations-graph"]` = `{layouts: {<campagna>: {<identità>: {wide,
narrow}}}}` con frazioni 0–1 per nodo; normalizzazione che scarta dati non validi e rifiuta
  una versione futura. Le scelte di vista (elenco o grafo, modo, tipi, voci isolate, nomi sulle
  linee, centro, profondità) sono comodità del dispositivo (`localStorage`
  `d20-studio-relations-graph-v1`), per identità e campagna; «Ripristina esempio» le dimentica.

## Scelte delegate (dentro la scheda)

- L'elenco resta la vista predefinita; il grafo è a un clic e viene ricordato per identità.
- La disposizione è personale, non una lavagna condivisa: il DM non vede come il giocatore ha
  sistemato le voci e viceversa. Una lavagna comune del gruppo resta una scelta di prodotto.
- Una disposizione per formato: una lavagna sistemata su un computer non si legge schiacciata a
  390 px (controllato: le voci si sovrapponevano), quindi telefono e computer hanno la propria.
- Il grafo locale si dispone da solo (come quello di Obsidian) e non si sistema a mano.
- Il nome di una linea corta si vede solo mentre è evidenziata, per non coprire i nomi delle
  voci; i nomi lunghi sono accorciati sul grafo e interi nell'anteprima e nel nome accessibile.
- Le linee non sono tappe della tastiera: da tastiera si raggiungono dall'elenco dei
  collegamenti nell'anteprima della voce.
- «Evidenzia» colora invece di filtrare, così il campo conserva il fuoco mentre si scrive.

## Limiti onesti

- Simulazione locale a due identità: le proiezioni non sono sicurezza di un server.
- Layout deterministico a forze (Fruchterman–Reingold) con separazione dei nomi, calcolato a
  ogni visualizzazione: nessuna fisica continua né animazione come in Obsidian. Con 16 voci il
  telefono è pieno; lo zoom aiuta, ma non c'è pizzico a due dita (solo pulsanti e rotella).
- Non costruiti perché fuori dalla scheda: esportazione PNG/PDF (Kanka CMP-30), alberi
  genealogici (CMP-31/80), lavagne libere con schede di testo, gruppi e frecce disegnate a mano
  (Canvas/Boards completi): qui si dispongono solo le voci esistenti. Una relazione non si
  rinomina (B43 non ha il comando: si rimuove e si aggiunge); atteggiamento e colore per
  relazione di Kanka non ci sono.
- La lista del Mondo del core non ha un pulsante verso il grafo (nessun aggancio lì): le voci
  del Mondo sono nel grafo e hanno il loro riquadro locale sulla pagina.
- L'area dipende da B43: senza l'Archivio caricato il comando della palette si nasconde e la
  parte «Relazioni» non esiste.
- Solo Chromium; il tocco è emulato (contesto `hasTouch`, eventi CDP) e non su un dispositivo
  reale; nessuna prova con lettore di schermo.
- Osservato durante il lavoro, non di B58: l'avviso a comparsa del core in basso copre la parte
  bassa della lavagna finché non scompare; un modulo di un'altra area (B37) non si caricava in
  un momento del lavoro parallelo (errore transitorio, poi un altro file con una dichiarazione
  doppia già risolto dal suo autore). Nessuno dei due è stato toccato.

## Review and fixes

Revisione indipendente del 24/09/2026 (cartella prove datata 2026-09-25), sessione del
browser `d20-b58-rf`, prove in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B58-rf/` (sonde
`rf-*.png`, percorso completo in `journey/`). Il revisore non ha costruito B58. Controllati:
scheda B58 del censimento (CMP-29, CMP-89, CMP-72/90, regole 1–4), funzionamento reale nel
browser (DM e giocatore, 1440 e 390 px con tocco, IT/EN, tema chiaro, senza rete, palette),
aderenza ai pattern, comandi inerti, coerenza con Archivio/Diario/schede, privacy, Annulla,
test e collocazione (B61: nessun contributo al Tavolo, nessun pulsante in testata; blocchi del
registro nascosti dalla barra laterale).

### Difetti trovati e corretti (prima il test, poi la correzione)

| #   | Gravità | Riproduzione                                                                                                                                                                                                                                                                                                                                                                                                             | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | P2      | DM, 1440: clic sulla linea segreta «paga in segreto», poi il mouse va dritto verso «Rivela…» nel riquadro Dettagli. Passando sopra Doran il riquadro diventa l'anteprima di Doran e «Rivela…», «Nascondi di nuovo» e «Rimuovi relazione» spariscono (sonda: `afterMove: "Doran"`, `revealStill: 0`). Qualunque voce attraversata sostituiva la selezione.                                                                | **Corretto.** Hover intent: il passaggio del puntatore accende subito i collegamenti (Obsidian) ma l'anteprima arriva solo se il puntatore si ferma sulla voce per 300 ms (`PREVIEW_DELAY`, come i tooltip del Compendio a 250 ms, CRP-172; anteprime di Kanka). Uscire prima annulla. Fuoco da tastiera e pressione lunga restano immediati. Percorso J: la linea resta selezionata attraversando 3 voci; fermarsi su Maestro Oben lo mostra. Test «review: … touch instructions» controlla la costante.                                                                           |
| R2  | P2      | Telefono 390 × 844, giocatore: pressione lunga su «Gilda delle lanterne». Si accendono i collegamenti, ma l'anteprima (con «Apri la voce», «Solo i suoi collegamenti») è sotto la lavagna, fuori schermo (titolo a y = 970 su 844; `rf-04-phone-longpress.png`). Al tocco era l'unico modo di vedere i collegamenti di una voce senza aprirla, e il risultato era invisibile.                                            | **Corretto.** Sollevato il dito (dopo il clic di compatibilità del browser), il fuoco va al titolo dell'anteprima come già succede toccando una linea, quindi l'anteprima entra nello schermo. Percorso I: titolo dentro la finestra, nessuna apertura della voce, il trascinamento col dito successivo funziona ancora (`b58-rf-04-phone-longpress-preview-en.png`).                                                                                                                                                                                                               |
| R3  | P2      | Pagina dell'Archivio di Tessa Varro (persona con 3 relazioni, anche una segreta): nessun grafo e nessun «Apri nel grafo». Il grafo locale esisteva solo per le voci del Diario/Mondo, non per le pagine dell'Archivio (persone, organizzazioni, missioni), che sono proprio quelle con le relazioni. Kanka «View web» dalla voce (CMP-29) e il grafo locale di Obsidian (CMP-89) partono dalla voce che si sta leggendo. | **Corretto.** Nuovo blocco `relations-graph.archive-page`: dopo il riquadro «Relazioni» di B43 la pagina mostra «Nel grafo delle relazioni» (grafo locale, profondità 1, solo ciò che quell'identità legge) e «Apri nel grafo delle relazioni», centrato sulla pagina. Stesso componente del riquadro delle voci (`localPanel`), nascosto se la pagina non ha collegamenti leggibili. Test «review: an archive page…»; percorso J (DM: linea segreta presente, clic su Casa Varro la apre, «Apri nel grafo» centra Tessa) e I (giocatore EN 390: nessun segreto, bersagli ≥ 40 px). |
| R4  | P3      | «Aggiungi relazione» senza un'anteprima valida: «Da» e «Con» partivano entrambi sulla prima voce (Casa Varro), quindi l'invio dava «Una voce non si collega a sé stessa»; con in anteprima una voce del Diario/Mondo (non ammessa da B43) «Da» diventava in silenzio Casa Varro.                                                                                                                                         | **Corretto.** Entrambe le liste partono da «Scegli una voce» (valore vuoto, obbligatorio), come il modulo di relazione di Kanka; «Da» è preselezionato solo se la voce in anteprima è una pagina o una scheda. `addDialogBody` esportato e testato; percorso J: invio con estremi vuoti rifiutato, nulla salvato.                                                                                                                                                                                                                                                                   |
| R5  | P3      | Testi al tocco: il riquadro diceva solo «Passa sopra… o raggiungila con Tab», l'aiuto sotto la lavagna solo «Ctrl o Cmd e rotella» (niente pressione lunga, niente pulsanti + / −). In inglese i pulsanti erano «Open «Tessa Varro»» con le virgolette italiane.                                                                                                                                                         | **Corretto.** Il riquadro nomina puntatore fermo, Tab e pressione lunga; l'aiuto nomina i pulsanti + e −; in inglese «Open “Tessa Varro”». Test «review: English quotation marks and touch instructions…».                                                                                                                                                                                                                                                                                                                                                                          |

Test aggiunti in `design/blueprint/tests/relations-graph.test.mjs` (3, falliti prima delle
correzioni: «Tessa's page has no local graph», «Italian guillemets in English», il modulo
senza segnaposto). Percorso aggiornato: `changes/interview-01/blueprint-checks/relations-graph-journey.js`
(E2 e F attendono l'anteprima e scelgono gli estremi; I controlla l'anteprima a schermo e la
pagina di Tessa; nuovo gruppo J). Nel percorso originale la sostituzione della selezione non
era vista perché Playwright sposta il mouse in un solo passo.

### Modifica aggiuntiva a un file condiviso

`design/blueprint/journal-plus.mjs` (B43): funzione nuova `pageBlocks` accanto a
`relationsPart` e `${pageBlocks(ctx, page)}` subito dopo `env.pagePanels` in `pageView`. Come i
blocchi `.entry` delle voci del core: un contributo `campaign-section` con id che finisce in
`.archive-page` riceve `{kind: "archive-page", page}`. Senza un'area così la pagina è identica
(test «review: an archive page…», harness senza B58). I blocchi sono legati dal
`bindSlots` di `campaign.mjs` come quello `.relations`. Il coordinatore può aggiungere le
convenzioni `.relations` e `.archive-page` al piano del registro.

### Verificato, non difetti

- **Collocazione (B61).** Il grafo è uno strumento della Campagna (Archivio › Relazioni,
  pagine delle voci, palette): nessuna barra del Tavolo, nessun pulsante in testata; i blocchi
  hanno `when(ctx, arg)` vero solo col loro argomento e non compaiono nella barra laterale.
- **Privacy.** Giocatore: nessuna linea segreta, nessuna missione nascosta, nessuna scheda del
  DM, né nel grafo né nel grafo locale della pagina; «Solo io» mai nel grafo del DM; rivelata a
  Doran la linea resta invisibile a Livia. La disposizione personale conserva solo id di voci
  (nessun testo) nello stato locale simulato: in un prodotto reale va tenuta per utente.
- **Senza rete.** Relazione nuova rifiutata dentro la finestra; spostare una voce e annullare lo
  spostamento funzionano (modifica locale). **Annulla**: rimozione della relazione e
  spostamenti tornano indietro; lo spostamento entra nella pila comune «Annulla ultima
  modifica» per scelta (Annulla a istantanea, DEVELOPMENT.md).
- **Palette.** «>grafo» → «Apri il grafo delle relazioni» → Invio apre Archivio › Relazioni in
  modo Grafo (controllato nel browser). **Tema chiaro** leggibile (`rf-05-light.png`).
  **Tastiera**: dopo ogni filtro il fuoco resta sul controllo usato.
- **Colore dei cerchi (P3, non corretto).** Persone, organizzazioni, luoghi, negozi, eventi,
  elenchi e voci del Diario sono cerchi distinti sulla lavagna dal colore; il tipo è scritto
  nell'anteprima, nel nome accessibile e nei filtri con conteggio. Obsidian usa gli stessi
  gruppi colorati; un simbolo per tipo sarebbe un'invenzione senza fonte nella scheda.
- **Legenda completa in ogni modo**: mostra tutti gli stili di linea anche quando un modo non
  ne disegna alcuni, come una legenda fissa. Nessun comando inerte trovato.
- **Regressioni.** Test B43 e registro con B58: nessun fallimento. Percorso di revisione di B43
  (`quests-review-journey.js`) `ok: true`. Il percorso `quests-journey.js` di B43 si ferma a
  «Coins not in Livia's purse»: il percorso si aspetta 50 mo dopo la consegna della
  ricompensa, ma in uno stato nuovo Livia ora parte già con 30 mo (monete seminate da
  un'altra area; controllato nel browser), quindi il totale non è 50. È il registro Missioni,
  non l'Archivio, e non dipende da B58. Segnalato al coordinatore, non toccato.

### Comandi ed esiti dopo le correzioni

- `node --test design/blueprint/tests/relations-graph.test.mjs` → **14/14**.
- B58 + B43 + registro (`relations-graph`, `journal-plus`, `factions`, `quests*`, `registry*`)
  → **75/75**.
- Suite completa `node --test design/blueprint/tests/*.test.mjs` → **1966/1973**; i fallimenti
  sono in `damage-tray.test.mjs` e `regions.test.mjs`, aree di altri in costruzione in quel
  momento (la corsa precedente falliva invece in `quickbar`, `damage-tray` e prima ancora
  `generators`): nessuno importa `journal-plus` o `relations-graph`.
- Percorso `relations-graph-journey.js` (copia con cartella immagini `B58-rf/journey/`),
  sessione `d20-b58-rf` → `ok: true`, **11 gruppi (A–J)**, nessun `pageerror`
  (`journey/journey-result.json`). Solo Chromium; tocco emulato via CDP.
