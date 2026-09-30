# Goal proposto — blueprint visuale completo con contratto sincronizzato

23/09/2026, D-013/I-218. Sostituisce il precedente Goal centrato sulla sola
consegna Markdown. L'owner vuole vedere e provare l'app; gli agenti mantengono
il dettaglio documentale. Il comando è stato prima preparato; il Goal è ora **attivo**, confermato
con get_goal il 23/09/2026. Obiettivo: candidata completa verificata, non il
solo primo incremento. Nessun budget numerico imposto.

## Comando pronto

```text
/goal Realizza il blueprint visuale navigabile dell'intera app d20 Studio, completo e pronto per la mia valutazione, seguendo D-013/I-218 e docs/interview/BLUEPRINT_CONTRACT.md nel worktree interview-01. Mantieni modello e sforzo selezionati. Costruisci un'unica app dimostrativa coerente, con tutte le funzioni, pagine, sezioni, pulsanti, input, risultati, annullamenti, permessi ed errori pertinenti; grafica provvisoria ammessa. Riprendi pattern verificati da tutti i prodotti rilevanti, preserva ricerche e decisioni e non limitarti alla checklist esistente. Mantieni il Markdown sincronizzato per gli agenti, senza chiedermi di leggerlo. Itera autonomamente fra ricerca, costruzione, prove dei percorsi e review indipendente; aggiorna copertura e NEXT e mostrami progressi brevi e collegati. Coinvolgimi solo sui dubbi sostanziali irrisolti, continuando il lavoro indipendente. Non dichiarare coperta una funzione per la sola presenza di un menu o di un pulsante senza comportamento. Presentami la candidata completa da navigare e correggere: dopo la mia approvazione esplicita congeleremo quella versione visuale e il Markdown corrispondente come contratto per l'implementazione. Usa dati sintetici e simulazioni dichiarate; nessun prodotto di produzione, deploy, spesa o modifica a d20 Folio.
```

## Risultato verificabile

Il dettaglio di copertura, fedeltà, simulazione e accordo è nel
[brief operativo](../../docs/interview/BLUEPRINT_CONTRACT.md). La candidata
è pronta quando tutti i percorsi inclusi e i comandi pertinenti sono
raggiungibili e provati, la review non lascia difetti materiali irrisolti e
le rappresentazioni visuale/Markdown coincidono. Un nome nel menu, uno stato
predisposto senza interazione o un pulsante inerte non provano la copertura.
Le capacità nuove emerse dalle fonti devono avere un trattamento esplicito;
non chiudere il Goal riducendo arbitrariamente lo scopo.

La candidata pronta per valutazione è il traguardo autonomo. L'approvazione
non è autoassegnata: correzioni e fissazione della versione seguono il feedback
reale dell'owner. Modello e sforzo invariati; nessun budget numerico inventato.
Worktree autorevole: /Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01.

## Meccanismo verificato

[Using Goals in Codex](https://developers.openai.com/cookbook/examples/codex/using_goals_in_codex),
letto il 23/09/2026: obiettivo persistente e continuazione fra turni quando
attivo, nei limiti applicabili. /goal pause, /goal resume, /goal clear
restano controlli dell'utente. La richiesta di dare un comando non equivale
all'ordine di attivarlo. Il risultato di get_goal, non una memoria del plugin,
stabilisce lo stato corrente. Nessuna automazione periodica sostitutiva.
