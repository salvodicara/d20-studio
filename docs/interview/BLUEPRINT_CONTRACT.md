# Contratto visuale navigabile e riferimento per gli agenti

23/09/2026, D-013/I-218. Richiesta esplicita dell'owner: definire l'app completa
anche in Markdown, ma renderla valutabile attraverso una visita visuale
interattiva. L'owner non deve analizzare il corpus documentale. La grafica
provvisoria è ammessa; presenza, reperibilità e comportamento delle funzioni
sono il centro del lavoro. Questo documento è il brief operativo aggiornato,
non il blueprint già costruito o approvato.

## Risultato da consegnare

**Un'unica app dimostrativa navigabile**, con la stessa struttura fra pagine,
menu, pannelli e finestre. Si può visitare liberamente oppure seguire brevi
percorsi giocatore, DM e uso personale. I dati di esempio collegano le aree:
il personaggio aperto dal Tavolo è quello della raccolta; usare un oggetto
aggiorna il suo inventario; tornare alla campagna non crea un'altra partita.

Non una serie di miniature slegate, una presentazione o un indice cliccabile
che termina in schermate generiche. Le illustrazioni precedenti restano prove
storiche e fonti di feedback, non si concatenano per dichiarare concluso il
nuovo blueprint. Guado/design-01 rimangono ritirati.

La sede prevista è un prototipo locale nel worktree, `design/blueprint/`,
aperto nel browser della task. HTML/CSS/JavaScript e logica locale necessari
alla navigazione e alle simulazioni sono autorizzati da I-218. La scelta del
supporto è delegata: si può adeguarla se un limite concreto lo rende necessario,
senza trasformarla in una scelta tecnica per l'owner. Nessun hosting o servizio
esterno richiesto. Codice e commenti in inglese; interfaccia EN/IT con italiano
iniziale per la visita dell'owner.

## Fedeltà richiesta e confine della simulazione

| Aspetto             | Deve essere valutabile nel blueprint                                                                                       | Non è ancora dimostrato                                                            |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Struttura           | Destinazioni, sezioni, gerarchia, ricerca, accessi contestuali e ritorni coerenti.                                         | Tempi e robustezza dell'applicazione distribuita.                                  |
| Comandi             | Posizione, etichetta, disponibilità/motivo, input, risultato, conferma quando prevista e annullamento/correzione.          | Collegamenti a database, servizi e account reali.                                  |
| Funzioni e dati     | Esperienze complete con esempi realistici e conseguenze collegate tra aree.                                                | Motore eseguibile esaustivo per ogni contenuto/regola e persistenza di produzione. |
| Permessi e rete     | Viste distinte dei ruoli, contenuti privati/pubblici e scenari di errore/offline/revoca mostrati con stato comprensibile.  | Sicurezza e sincronizzazione reali: una simulazione non le prova.                  |
| Movimento e tattica | Gesti diretti proposti, preview, bersagli, cambi idea, ESC/correzioni, dadi fisici/digitali e breakdown nei casi previsti. | Un motore geometrico o multiplayer completo certificato da un esempio locale.      |
| Aspetto             | Gerarchia leggibile, continuità sito/Tavolo, densità utilizzabile e atmosfera provvisoria coerente.                        | Stile artistico, branding, asset finali e rifinitura estetica approvati.           |

La simulazione usa dati sintetici e casi verificabili. Può rappresentare un
esito complesso con stato predisposto, ma il comando deve far vedere input,
conseguenza e alternative pertinenti; non fingere che esista un servizio reale.
Gli strumenti per scegliere scenari di prova o ruoli restano fuori dai comandi
dell'app rappresentata. L'indicazione «prototipo con dati dimostrativi» è chiara;
non invadere i percorsi con gergo sugli strumenti o dettagli del codice.

## Tutte le funzioni, nei contesti corretti

Il perimetro parte dalle decisioni acquisite e rimane aperto alla ricerca.
[REFERENCE_COVERAGE](REFERENCE_COVERAGE.md) controlla dai prodotti esterni
verso l'app; [COVERAGE](COVERAGE.md) e [NAVIGATION_COVERAGE](NAVIGATION_COVERAGE.md)
controllano definizione e ingressi interni. Le 65 voci attuali non limitano
nuove capacità pertinenti e non misurano la completezza.

Per ogni funzione inclusa l'agente deve tracciare, nella matrice di verifica
del blueprint, **funzione → percorso → ruolo/stato → comandi e risultato →
regola Markdown → riferimento del prodotto → prova eseguita**. Automatismi
senza pulsante hanno innesco, conseguenza e superficie di lettura/correzione;
non si inventa un pulsante per ogni regola. Una voce non è coperta solo perché
il nome compare nel menu o perché un link apre un testo descrittivo.

Tutti i comandi pertinenti devono essere reperibili dal contesto naturale,
compresi quelli avanzati, facoltativi, rari e riservati al DM. Semplicità
significa gerarchia, ricerca, raggruppamenti e disclosure progressiva mutuati
dai riferimenti, non taglio delle funzioni. Non esporre contemporaneamente
ogni comando nella stessa schermata. La collocazione va verificata con i
percorsi, non dichiarata intuitiva perché sembra ordinata all'autore.

Una funzione in corso può essere esplicitamente incompleta durante le
iterazioni, ma non conta come finita. Un controllo disabilitato ha un motivo
di prodotto reale; «non implementato nel prototipo» resta una lacuna del
blueprint, non un modo di completare la matrice. Nessun finto Salva o comando
che risponde soltanto «funzionalità prevista» nella consegna completa.

## Metodo di costruzione e verifica

1. **Comporre subito l'insieme:** utilizzare NAV e APP_BLUEPRINT per il telaio
   comune e gli accessi delle sei aree, poi ampliare il medesimo artefatto.
   Non attendere che ogni pagina Markdown sia terminata prima di mostrare
   il primo percorso visuale collegato.
2. **Completare per percorsi:** ricerca pertinente → definizione dei dettagli
   mancanti → implementazione dimostrativa → confronto col Markdown → prova.
   Riutilizzare CRE/ADV/INV/MAG/HB/TABLE; scene e incontri restano il prossimo
   ramo sostanziale con la ricerca già salvata, integrati nella visita comune.
3. **Ampliare dal mercato:** studiare anche strumenti non nominati dall'owner,
   distinguendo core, sistemi, moduli, comportamento attuale/storico e annunci.
   Ogni scelta conserva fonte, motivo e adattamento. Non importare regole BG3
   al posto della baseline 2024 o falsi segreti solo per imitare una schermata.
4. **Verificare i comportamenti:** navigazione libera, tasti e gesti diretti,
   salvataggi/annullamenti, ritorni e dipendenze; stati vuoti/popolati, errori,
   autorizzazioni e rete simulati. Laptop prioritario, poi dispositivi e input
   previsti, EN/IT, tastiera/touch e accessibilità. Screenshot da soli non bastano.
5. **Review distinta:** controllare lacune, attribuzioni e divergenze fra
   artefatto, decisioni e Markdown. Correggere rilievi concreti, senza giri
   indefiniti di rifinitura estetica; continuare invece sui rami non coperti.
6. **Owner nel loop:** mostrare risultati brevi e visitabili, indicando cosa
   è rappresentato e cosa è ancora in costruzione. Domande solo su dubbi
   sostanziali non risolti; nessun obbligo di testare ogni comando o leggere
   il registro. L'agente è responsabile della verifica di copertura.

Quando si verifica un gesto, deve essere quello proposto: selezionare un punto
libero sulla mappa non può essere sostituito da un pulsante «vai qui» se è la
libertà di movimento a essere oggetto della decisione. I-016 e gli altri
comportamenti acquisiti restano vincoli, non dettagli da ridisegnare per comodità.

## Accordo e fissazione della versione

La prima consegna completa è **una candidata da valutare**, mai autoapprovata.
L'owner può attraversarla con percorsi brevi guidati e navigazione libera,
commentare quello che vede e chiedere correzioni. Le funzioni avanzate hanno
esempi raggiungibili senza una visita obbligatoria infinita.

Dopo le correzioni e un'approvazione esplicita della versione presentata,
l'agente conserva una baseline identificabile: versione dell'artefatto,
Markdown corrispondente, matrice di copertura, fonti, decisioni, casi ed evidenze
della review. Quell'insieme è **il contratto dell'app**. Non ci sono due
contratti concorrenti: le divergenze devono essere risolte prima della baseline,
non lasciate all'interpretazione degli agenti implementatori.

L'approvazione riguarda struttura, informazioni e interazioni rappresentate.
Grafica provvisoria e brand non diventano finali per deduzione; la fase estetica
successiva deve preservare il contratto funzionale. Cambi sostanziali alla
baseline vanno dichiarati e concordati, non introdotti silenziosamente durante
l'implementazione. Navigare, fare clic o non rispondere non approva la versione.

La costruzione del prodotto reale segue il normale piano, test e review dopo
questo accordo. Il prototipo non viene automaticamente promosso a produzione.
Rimangono distinti permessi per pubblicazione/deploy, dati reali, spesa e
impegni esterni; d20 Folio esistente resta invariato.

## Completamento autonomo e Goal

L'obiettivo autonomo è produrre la candidata visuale completa, verificata e
sincronizzata con il Markdown, pronta per la valutazione dell'owner. Non si
chiude perché il telaio, una visita o l'elenco dei pulsanti sono pronti.
Conflitti sostanziali che richiedono l'owner vengono posti uno alla volta,
proseguendo sui rami indipendenti; non rimossi per raggiungere una fine fittizia.

Il [Goal pronto](../../changes/interview-01/goal-draft.md) sostituisce quello
centrato sulla sola lettura del contratto Markdown. La richiesta di preparare
il comando non è l'attivazione: verificare lo stato dello strumento e attivare
soltanto su richiesta esplicita. L'approvazione e la baseline conseguente
avvengono dopo la consegna candidata, quando l'owner le esprime realmente.

## Stato operativo del 23/09/2026

Il Goal risulta ora attivo. Gli incrementi integrati di navigazione, schede, preparazione e primi casi
di combattimento sono visitabili;
[BLUEPRINT_STATUS](BLUEPRINT_STATUS.md) conserva la matrice delle prove
e delle lacune. Il completamento autonomo e il gate di approvazione qui
definiti restano invariati.

## Stato operativo del 30/09/2026 — sincronizzazione con il Markdown

La candidata comprende tutte le aree B11–B62, i passaggi visivi, gli audit per area, i re-audit e
le correzioni delle tre revisioni finali
([completezza](../../changes/interview-01/final-review-completeness.md),
[privacy](../../changes/interview-01/final-review-privacy.md),
[UX](../../changes/interview-01/final-review-ux.md);
[correzioni finali](../../changes/interview-01/final-fixes.md)). Il
[censimento](CAPABILITY_CENSUS.md) dà per ogni capacità lo stato corrente e il posto naturale nel
blueprint; ogni pagina concettuale ha la sezione «Dove si trova ogni funzione nel blueprint».
Restano aperte le decisioni Q164–Q168 di [OPEN](OPEN.md).

## Stato operativo del 01/10/2026 — candidata pronta per la valutazione dell'owner

La candidata completa è pronta per la valutazione dell'owner. È identificata dal
[manifest](../../changes/interview-01/blueprint-candidate-manifest.json) del 01/10/2026 (sha256 di
ogni file di `design/blueprint/`, di `docs/interview/*.md` e di `docs/NEXT.md`): identifica la
versione, **non la approva**. Sintesi, visita, numeri, limiti e simulazioni:
[BLUEPRINT_STATUS](BLUEPRINT_STATUS.md); stato di ogni capacità con il file di prova:
[censimento](CAPABILITY_CENSUS.md); scelte delegate da preservare: I-237–I-242 in
[DECISIONS](DECISIONS.md#i-237--architettura-dellinformazione-copiata-dai-leader).

Il gate di [Accordo e fissazione della versione](#accordo-e-fissazione-della-versione) resta
invariato: visitare, fare clic o non rispondere non approvano. Dopo le correzioni chieste
dall'owner e un'approvazione esplicita di una versione, si fissa la baseline (manifest della
versione approvata, Markdown, censimento, prove e decisioni) e solo dopo si pianifica il prodotto
reale, con i permessi distinti per deploy, dati reali, spesa e impegni esterni. Le decisioni
dell'owner ancora aperte sono elencate in [NEXT](../NEXT.md).

## Regola per il prodotto reale: ogni identità riceve solo la propria proiezione

«Nessuna sicurezza di backend è implicita» (DEVELOPMENT) descrive il blueprint; per chi lo
implementa vale questa regola, prescrittiva: **il server manda a ogni identità soltanto la sua
proiezione**. I dati privati di un'altra identità, le creature non viste o nascoste, gli export e
i profili personali non arrivano mai al suo client, e l'anonimato vale anche per il registro di
controllo. Quattro meccanismi del blueprint da non copiare alla lettera:

1. la nebbia e la visione nascondono le pedine non viste con il CSS e ne elencano gli id in
   `data-fv-hidden-tokens` (in un prodotto reale non vanno spedite);
2. l'export della campagna del DM, segreti compresi, resta per 120 minuti nello stato condiviso
   (`ext["campaign-data"].exports[].content`);
3. un segnale di sicurezza anonimo non registra chi lo manda, ma la voce di registro del commit
   porta il controller `player` a circa 1 ms dal segnale;
4. i profili di sicurezza di ogni membro e i token dei calendari ICS stanno nello stato condiviso.

Nell'app di oggi nessuno di questi dati compare a chi non deve vederlo (revisione della privacy);
la regola riguarda la trasmissione, che il blueprint non ha.
