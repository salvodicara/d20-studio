# Provenienza delle scelte di interfaccia

**Direzione prevalente D-013/I-218, 23/09/2026:** l'owner valuta un unico
[blueprint visuale navigabile](BLUEPRINT_CONTRACT.md) completo; il Markdown
rimane sincronizzato per gli agenti, senza lettura obbligatoria dell'owner.
Prototipo locale e codice dimostrativo sono ora autorizzati prima dell'accordo
sul contratto; l'implementazione reale segue la baseline approvata. Grafica
provvisoria consentita, copertura funzionale da verificare. I precedenti divieti
di prototipazione nei passaggi storici sotto sono superati in questo perimetro.
[NEXT](../NEXT.md) conserva il solo punto operativo e il Goal aggiornato.

23/09/2026, I-209. Questo registro rende verificabile la sintesi dell'agente:
scelta concreta, comportamento del riferimento, motivo e adattamento. Mostrare
il risultato non equivale a chiedere all'owner di progettare o votare ogni
schermata. Ricerca e selezione dei pattern restano responsabilità dell'agente.

## Regola operativa

Per ogni nuovo gruppo di comandi o scelta di presentazione, registrare:

1. Il percorso e il comportamento adottato, non soltanto il nome della funzione.
2. Prodotto e componente esatti: per esempio Foundry core, sistema dnd5e o
   modulo di terzi, senza attribuire ogni estensione a Foundry nativo.
3. Fonte, data/versione e natura dell'evidenza: documentazione, codice o prova
   d'uso. Un video, una guida e un test eseguito non sono la stessa prova.
4. Perché il comportamento serve qui e cosa si conserva fedelmente.
5. Adattamenti necessari per le decisioni già acquisite e lacune ancora aperte.

Non creare un pattern alternativo dove il precedente pertinente soddisfa già
il compito. Quando i prodotti differiscono, selezionare la soluzione compatibile
con i requisiti e spiegarla; non chiedere all'owner di arbitrare dettagli ordinari.
La presenza sul mercato è evidenza del comportamento, non prova automatica
di un confronto empirico fra tutte le alternative o dell'ottimo universale.

Le regole eseguibili seguono fonti normative 2024, revisioni e varianti scelte.
La UI di BG3 non cambia per deduzione le regole dell'app. Dadi fisici/digitali,
libertà del DM, correzioni e riservatezza conservano le decisioni dell'owner.

## Base delle sei aree già composte

Questa è la prima mappa esplicita delle principali scelte condivise, non
l'attestazione che ogni singola decisione storica sia già stata ricontrollata.
Le fonti puntuali dei comandi restano nelle pagine e nei flussi collegati.

| ID e scelta adottata                                                     | Comportamento del riferimento e fonte                                                                                                                                                                                                                                                                        | Motivo e adattamento dichiarato                                                                                                                                                                                          |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| UI-01 — raccolte personali distinte                                      | [Beyond Creations](https://www.dndbeyond.com/creations): accessi separati a personaggi, campagne, raccolta e creazioni homebrew. R175, pagina 17/02/2019 con navigazione corrente.                                                                                                                           | Ritrovare il proprio materiale anche senza entrare al tavolo. I nomi Inizio/Personaggi/Campagne/Biblioteca sono la nostra composizione; il numero e la posizione esatta delle voci non sono un layout Beyond copiato.    |
| UI-02 — creazione per sezioni e riepilogo                                | [Beyond Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections), 27/08/2025: sezioni del builder e accessi finali a scheda/campagna. R172/R175.                                                                                                            | Cambiare sezione e rivedere il personaggio senza una pagina monolitica. Bozze, regole 2024 e input manuali seguono le decisioni dell'app; non si importano default della guida.                                          |
| UI-03 — invito con scelta del personaggio                                | [Beyond Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign), 27/08/2025: personaggio esistente, nuovo, pronto o disponibile dal DM. R172.                                                                                              | Collegare il lavoro personale alla campagna senza ricopiarlo. Il precedente non decide la nostra matrice dei poteri, il consenso al controllo o il trasferimento fra gruppi.                                             |
| UI-04 — scena principale e pannelli di supporto                          | [Foundry Player Orientation](https://foundryvtt.com/article/player-orientation/): scena, navigazione, directory, registro, turni e hotbar. R161/R175, nessuna build unica indicata.                                                                                                                          | Mantenere visibile la partita mentre si raggiungono le informazioni. I-190 sceglie questo impianto; i tre pulsanti della visita app-journey non sono una replica del layout finale.                                      |
| UI-05 — scheda completa aperta dalla scena                               | Stessa [guida Foundry](https://foundryvtt.com/article/player-orientation/): apertura della scheda dagli attori e modifica mentre la scena resta aperta. R175.                                                                                                                                                | Ritrovare lo stesso personaggio in sessione, senza una seconda scheda. Pannello fissabile e comportamento su schermi stretti richiedono composizione compatibile con I-190/I-129, non una parità già dimostrata.         |
| UI-06 — configurare, vedere e attivare una scena sono operazioni diverse | [Foundry Scenes](https://foundryvtt.com/article/scenes/): directory, configurazione, Save Changes, View Scene e Activate. R172/R175.                                                                                                                                                                         | Preparare senza spostare automaticamente il gruppo. La scelta dei sottogruppi e le note Solo io conservano i nostri requisiti; non si importa indiscriminatamente l'effetto di Activate su tutti.                        |
| UI-07 — materiali riutilizzabili distinti dalla copia in partita         | [Foundry Compendium Packs](https://foundryvtt.com/article/compendium/), [Adventure Documents](https://foundryvtt.com/article/adventure/). R172, data/build e discontinuità editoriale conservate in Preparazione.                                                                                            | Riutilizzare materiali senza confondere modello e progressi. Nessuna sincronizzazione universale o ripristino intelligente del pre-partita dedotti.                                                                      |
| UI-08 — compendio consultabile dentro e fuori dal tavolo                 | [Roll20 Compendium](https://help.roll20.net/hc/en-us/articles/360039178694-Compendium), 05/09/2023; R103/R171.                                                                                                                                                                                               | Cercare contenuti e riportarli al contesto. Il nome Biblioteca e l'accorpamento con raccolte personali sono composizione di precedenti, non copia di una pagina unica.                                                   |
| UI-09 — creazione, raccolta, uso privato e pubblicazione distinti        | Beyond [Creation and Collection](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238519700-Homebrew-Creation-and-Collection-Basics) e [Sharing and Publishing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content), 29/09/2025; R172. | Homebrew personale senza pubblicazione obbligatoria. Abilitazione della campagna e revisioni in uso conservano I-066/I-067; non si copiano limiti commerciali o si dichiara risolta la moderazione R105.                 |
| UI-10 — riepilogo recente e collegamenti alla prossima sessione          | [Kanka Prep](https://kanka.io/learn/prep), 10/04/2026; R172.                                                                                                                                                                                                                                                 | Riprendere la storia, come fa già il gruppo dell'owner. Diario nella Campagna e accesso al Tavolo sono il raccordo con I-117, non una narrazione generata o un obbligo di compilazione.                                  |
| UI-11 — richiesta facoltativa di reazione                                | BG3 [Patch 2](https://baldursgate3.game/news/patch-2-now-live_89) e [Patch 7](https://baldursgate3.game/news/patch-7-now-live_121), fonti e date R170.                                                                                                                                                       | Riprendere Ask e scelta consapevole; tempi e consumi seguono la capacità 2024. Riduzione, stato pendente e richieste concorrenti non vengono attribuiti integralmente a BG3.                                             |
| UI-12 — condivisione e abilitazione della campagna separate              | [Shard Player Content Sharing](https://www.shardtabletop.com/howto/player-content-sharing), 17 novembre senza anno esposto; R046/R047/R172.                                                                                                                                                                  | Chi condivide rende disponibili contenuti; il GM seleziona quelli attivi. Riprendere la distinzione, conservando il singolo contenuto e la privacy dell’app, senza rendere obbligatori pacchetti o condivisione globale. |

Per UI-01/UI-02/UI-04/UI-05/UI-06 le pagine primarie sono state rilette il
23/09/2026, solo documentazione. Per le altre righe sono riutilizzate le
verifiche datate nei record indicati, non dichiarate ripetute oggi.

## Inventario e magie: tracciabilità dei comandi

- [INVENTORY_FLOW](INVENTORY_FLOW.md), INV-01 e seguenti, R173/I-210:
  Biblioteca → aggiunta/manuale → inventario → equipaggiamento/uso/scambio
  → conseguenze e correzione. Ogni gruppo riporta il precedente pertinente.
- [SPELLCASTING_FLOW](SPELLCASTING_FLOW.md), MAG-01 e seguenti, R174/I-211:
  Biblioteca → magia del personaggio/preparazione → scelta e lancio
  → risorse, tiri ed esito → correzione. Regole e UI sono evidenze distinte.

La tabella di ciascun flusso è il dettaglio autorevole delle relative scelte;
questo indice non duplica tutti i comandi o una seconda versione dei requisiti.

## Creazione e avanzamento del personaggio

- [CHARACTER_CREATION](CHARACTER_CREATION.md), I-213/R179: ingressi per
  creare, ricostruire, importare o partire da una base; sezioni, scelte e
  riepilogo che portano alla stessa scheda. Fonti, dati mancanti e deroghe
  rimangono riconoscibili, senza conversione implicita di una scheda esistente.
- [CHARACTER_ADVANCEMENT](CHARACTER_ADVANCEMENT.md), I-214/R180: livello,
  multiclasse, revisione e piano futuro, con differenze e risorse correnti
  distinte dalla bozza. I precedenti di interazione non sostituiscono le
  regole SRD 5.2.1 o stabiliscono da soli i nostri permessi.

Le matrici CRE/ADV attribuiscono le scelte ai riferimenti pertinenti e
separano gli adattamenti necessari a dati manuali, offline e gioco condiviso.
I due flussi dettagliano la pagina Personaggi; non aggiungono aree principali.

## Navigazione precisata e limiti del layout

[NAVIGATION](NAVIGATION.md), I-212/R176–R178, adotta undici gruppi NAV con
origine e motivo: barra globale, contesto della campagna, sezioni locali,
ingresso/rientro dal Tavolo, pannelli e accessi trasversali. Gli ingressi delle
65 voci attuali sono in [NAVIGATION_COVERAGE](NAVIGATION_COVERAGE.md).

La verifica corrente precisa UI-01/UI-04/UI-05: Beyond usa PLAY D&D, non il
vecchio menu Collections; Maps pubblica la scheda nella sidebar dal 09/04/2026.
Foundry13.341 documenta menu scene e sidebar richiudibili, e il core14 supporta
pop-out. Queste evidenze versionate prevalgono sulle immagini delle guide più
vecchie quando si descrive la disposizione corrente; le ricerche storiche
restano conservate. Fissaggio e raccordi sono adattamenti dichiarati.

Restano da sviluppare/verificare dimensioni e composizione visiva precisa,
pannelli simultanei, priorità dettagliate dell'Inizio e dispositivi. La scelta
di architettura informativa non prova già ergonomia, persistenza o usabilità.
Lo schema illustrativo degli ingressi non è un mock del prodotto e non elenca
tutte le scorciatoie o i ritorni. Nessun voto ordinario richiesto.

## Copertura senza un tetto artificiale

[COVERAGE](COVERAGE.md) contiene 65 voci già inventariate; non rappresenta una
prova di parità completa con Foundry, Beyond o ogni loro estensione. La ricerca
continua ad aggiungere capacità D&D pertinenti e a collegarle a pagine e comandi.
Distinguere core, sistema dnd5e, moduli e servizi esterni nel confronto.

Per ogni capacità trovata serve uno stato: già coperta e dove, parzialmente
definita e cosa manca, nuova da approfondire, esclusione esplicita dell'owner
oppure eccezione sostanziale. Nessuna omissione silenziosa perché una funzione
non entra nel primo disegno. Chiamate interne, musica per ora esterna e 3D
conservano le decisioni precedenti; «tutto» non le riattiva per deduzione.

Il controllo del contratto verifica percorso, accesso, comando, input,
conseguenza, permessi, salvataggio/annullamento, errore e rete; un link alla
fonte o a una pagina non equivale a funzione completa o implementata.

## Homebrew e verifica dal mercato

[HOMEBREW_FLOW](HOMEBREW_FLOW.md), I-216/R184, conserva dodici gruppi HB:
origine, campi e progressione; attività/effetti; prova e bozza; accessi e
abilitazione; nuove revisioni, confronto e applicazione conservativa.
Beyond, Shard e Foundry sono distinti; il confronto dei consumi è un nostro
adattamento esplicito, non una funzione concorrente integralmente verificata.

[REFERENCE_COVERAGE](REFERENCE_COVERAGE.md), I-215/R181–R183/R185, verifica
anche dall'esterno verso l'interno: tre audit dettagliati e una mappa del
mercato più largo. Macro e materiali diventano F-064/F-065 su delega I-217;
le altre lacune mantengono identificativi GAP e destinazione di lavoro.
Nessuna chiusura del contratto o nuova esclusione dedotta dalla navigazione.
