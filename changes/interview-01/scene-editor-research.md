# Editor scene — importazione, calibrazione e riuso

23/09/2026. Ricerca circoscritta per il coordinatore: **11 scelte proposte su
delega**, non contratto completo o prova di funzionamento. Ownership di questa
nota soltanto; registri e flusso definitivo restano al coordinatore.

Letti [NEXT](../../docs/NEXT.md) e [Preparazione](../../docs/interview/pages/preparation.md).
Vincoli acquisiti: scena anche senza mappa, nessun muro obbligatorio,
vuoto/modello/file proprio, quote e piani 2D, separazione fra materiale e
partita, consulta/rivela/attiva distinti, sottogruppi e privacy conservati.

## Fonti primarie e confini

Tutte consultate il **23/09/2026**, senza account, installazione o runtime.
Comportamenti **pubblicati**, non osservazioni d'uso né prove di superiorità.
Screenshot incorporati nelle guide non sostituiscono una prova interattiva.

| ID  | Fonte e strato                                                                                                                 | Versione/data e limite                                                                                                                                                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1  | [Foundry — Scenes](https://foundryvtt.com/article/scenes/), core                                                               | Nessuna versione/data esposta. Configurazione, griglia, import JSON, vista/attivazione. Contiene ancora Measured Templates e una descrizione della nebbia solo individuale: **non fotografia uniforme di core 14**. S4 prevale sulle novità della generazione. |
| S2  | [Owlbear — Scenes](https://docs.owlbear.rodeo/docs/scenes/), prodotto base                                                     | Pagina corrente, nessuna build/data esposta. Scena distinta dall'immagine, ingressi con/senza mappa, più mappe, blocco e controlli della griglia. Nessuna prova del nostro protocollo di autorizzazione.                                                       |
| S3  | [Owlbear — Aligning a Map](https://docs.owlbear.rodeo/docs/aligning-a-map/), prodotto base                                     | Nessuna build/data esposta. Allineamento numerico/visivo e modifica dei valori predefiniti distinta dall'aggiornamento della scena aperta. Non documenta una fusione completa dello stato giocato.                                                             |
| S4  | [Foundry — 14.359](https://foundryvtt.com/releases/14.359), core                                                               | **01/04/2026, 14.359 Stable 1**: piani nativi, strumenti collettivi, livelli facoltativi, nebbia condivisa opzionale. Non è attestazione dell'ultima patch né delle capacità di ogni modulo.                                                                   |
| S5  | [Foundry — Tiles](https://foundryvtt.com/article/tiles/), core                                                                 | **22/09/2026, 14.368**. Scala dell'asset, posizione, quota, ordine, selezione multipla, palette, elenco degli elementi e occlusione. Il testo distingue effetti estetici da effetti meccanici.                                                                 |
| S6  | [Foundry — Compendium Packs](https://foundryvtt.com/article/compendium/), core                                                 | Nessuna build/data esposta. Copia locale e originale separati; import singolo distinto dall'import collettivo con ID preservati. Non prova ricostruzione automatica dello stato iniziale.                                                                      |
| S7  | [Roll20 — Sizing and Aligning Maps](https://help.roll20.net/hc/en-us/articles/360039243994-Sizing-and-Aligning-Maps), VTT base | **19/08/2026**. Smart Sizing e nuovo Align to Grid dichiarato **beta**, con percorso legacy separato. Nessuna build applicativa fissata; non chiamarlo flusso stabile universale.                                                                              |
| S8  | [Owlbear — Assets](https://docs.owlbear.rodeo/docs/managing-assets/), prodotto base                                            | Nessuna build/data esposta. Raccolta per tipi, ricerca per nome e tag, distinta dallo spazio condiviso. Nessun formato o limite quantitativo nostro dedotto.                                                                                                   |

Non sono state attribuite capacità di moduli al core. Non sono stati verificati
convertitori universali, estrazione geometrica da immagini o importatori di
file Dungeondraft/DungeonFog: citarne il nome non ne dimostra il supporto.

## Scelte concrete da integrare

| ID e comandi/campi                                                                                                                                   | Precedente verificato                                                                                                                                                                  | Scelta proposta, motivo e adattamento                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SC-R01 — Nuova scena; Senza mappa / Vuoto / Modello / File proprio.** Nome modificabile, destinazione, mappa facoltativa.                          | S2 permette scena vuota o importazione con mappa; S4 tiene i livelli fuori dal minimo necessario.                                                                                      | Conservare gli ingressi acquisiti e mostrare subito note/incontro anche senza superficie. Nome provvisorio modificabile; nessun muro, luce, PNG o livello supplementare richiesto per salvare o giocare. Senza scala si conduce narrativamente: soltanto i calcoli che dipendono dalla distanza restano indisponibili, senza inventare misure.                                                                                        |
| **SC-R02 — Scegli dalla Biblioteca / Carica file / Anteprima / Importa / Annulla.** File, nome, dimensioni rilevate, destinazione, esito.            | S8 distingue raccolta e scena; S2 conserva le mappe fuori dalle singole scene.                                                                                                         | Selezionare un materiale o importarlo e poi usarne un'istanza. Mostrare anteprima e ciò che verrà creato; creare non rivela né attiva. File illeggibile o upload incompleto lascia recuperabile il resto della bozza. Formati, peso massimo e cache richiedono verifica tecnica successiva: non inventare un elenco di compatibilità.                                                                                                 |
| **SC-R03 — Allinea griglia; Colonne / Righe / Scostamento X–Y.** Valori iniziali riconoscibili, modificabili.                                        | S3 accetta dimensioni note e può ricavarle dal nome del file.                                                                                                                          | Usare metadati o nome come suggerimento, mai come calibrazione certificata. Offrire input numerici e anteprima, utile per mappe già dimensionate; segnalare bordi e celle parziali. Numero di pixel e numero di celle sono campi diversi. Non tentare OCR o riconoscimento universale dei muri.                                                                                                                                       |
| **SC-R04 — Allinea visivamente; Ancora / Scala / Rifinisci / Applica / Annulla.** Zoom, spostamento fine X–Y, dimensioni.                            | S3 usa righelli e controllo della deriva ai bordi. S7 beta documenta ancora, campione, rifinitura, frecce e pulsanti; Done fissa l'allineamento e blocca la mappa.                     | Copiare la progressione guidata e offrire controlli senza trascinamento. Applica conclude la calibrazione una volta; Annulla conserva quella precedente. Non introdurre conferme ripetute. Controllare almeno una zona lontana dall'ancora; rapporto proporzionale conservato inizialmente, deformazione non uniforme solo esplicita e visibile. Non adottare automaticamente il ridimensionamento della pagina di Roll20.            |
| **SC-R05 — Scala e misure; Distanza per cella / Unità / Tipo di griglia / Mostra griglia / Aggancia.**                                               | S1 distingue pixel, griglia e scala; S2 espone visualizzazione, aggancio e misura separati.                                                                                            | Campi distinti per calibrazione dell'immagine, misura di gioco e aspetto. Nascondere le linee non elimina scala o snapping. Un'etichetta «metri» non converte da sola i dati: il raccordo con le unità dell'engine deve essere esplicito. Quadrata e uso libero sono percorsi ordinari; geometrie esagonali/isometriche documentate dai riferimenti restano da specificare, non escluse.                                              |
| **SC-R06 — Aggiungi elemento; Seleziona / Sposta / Ruota / Dimensioni / Blocca / Nascondi.** Nome, asset, posizione, dimensioni e scala dell'asset.  | S5 usa Asset Grid Size per adattare immagini con risoluzioni diverse e offre controlli precisi.                                                                                        | Ogni elemento conserva il collegamento al materiale e i propri valori di scena. Bloccare evita spostamenti accidentali; nascondere decide la visibilità autorizzata: sono stati distinti. Sblocco e selezione restano raggiungibili dall'elenco degli elementi sovrapposti. Un elemento decorativo non acquisisce statistiche, collisione o controllo di un token.                                                                    |
| **SC-R07 — Seleziona più elementi / Modifica selezione / Applica / Annulla.** Elenco, filtro per piano/tipo, quantità selezionata, proprietà comuni. | S5 documenta selezione collettiva, palette e lista; S4 introduce strumenti per più oggetti.                                                                                            | Mostrare quali elementi e campi cambiano; valori diversi restano riconoscibili finché non scelti. Applica modifica i campi indicati, non uniforma tutto accidentalmente. Gruppo persistente, collegamento padre/figlio e trascinamento solidale sono capacità ulteriori: non dedotte dalla semplice selezione multipla.                                                                                                               |
| **SC-R08 — Piani; Aggiungi piano / Nome / Quota / Assegna elemento / Mostra piano.** Ordine grafico distinto dalla quota.                            | S4 offre livelli nativi con elementi specifici o condivisi; S5 separa quota e ordinamento. S2 permette anche mappe affiancate.                                                         | Consentire un solo piano senza configurazione aggiuntiva e piani 2D nominati quando servono. Cambiare il piano osservato nell'editor non trasferisce personaggi o partecipanti. Mappe affiancate non implicano adiacenza fisica. Scale, buchi, superfici, volo e visibilità fra piani richiedono regole proprie, non una generica ordinazione dei layer.                                                                              |
| **SC-R09 — Inizia senza muri; Gestione visibilità / Aggiungi geometrie.** Stato dei dati presenti, riservatezza, destinatari.                        | S1 distingue Token Vision dalla semplice visualizzazione della scena; S5 precisa che limitazioni grafiche di luce/meteo non sono automaticamente LOS meccanica.                        | Una mappa può essere usata come supporto visivo senza simulazione delle pareti. Dichiarare cosa viene gestito manualmente; anteprima e attivazione conservano privacy. Un tetto disegnato o una zona scura nell'immagine non bloccano automaticamente vista o movimento. Aggiungere muri dopo resta possibile, senza ricreare la scena. Non confondere assenza di simulazione con autorizzazione a mostrare tutti i segreti.          |
| **SC-R10 — Salva allineamento del materiale / Aggiorna questa scena / Rivedi differenze.** Valori prima/dopo e ambito.                               | S3 applica i nuovi default agli usi futuri; per la mappa nella scena aperta chiede Update. S1 avverte che ridimensionare può disallineare gli elementi.                                | Separare default dell'asset e istanza già usata. In scena giocata, anteprima dell'effetto su mappa, token e geometrie; nessun riposizionamento silenzioso. Conservare consumi e fatti avvenuti, rivalidare la versione corrente. La trasformazione precisa di tutte le geometrie resta da definire; se non dimostrabile, mostrare il limite e consentire lavoro sulle parti indipendenti.                                             |
| **SC-R11 — Duplica preparazione / Usa in campagna / Conserva come materiale.** Origine, destinazione, contenuti inclusi, stato iniziale dichiarato.  | S6 separa copia di mondo e compendio; import singolo non sovrascrive omonimi, mentre import collettivo con ID può sovrascrivere. S1 Import Data sostituisce i dati della scena scelta. | Riutilizzo come nuova istanza indipendente, coerente con I-136. Selezionare esplicitamente ciò che si conserva dal giocato; non chiamare «ripristino iniziale» una copia di porte aperte, bottino preso o creature danneggiate. Non toccare partita originaria o altre copie. Aggiornamento di una scena esistente e sostituzione completa sono operazioni distinte, con confronto; nessuna fusione sicura attribuita ai concorrenti. |

## Raccordi ed esempi sintetici

- **Taverna improvvisata:** File proprio → anteprima → scena riservata →
  due creature e nota DM → salva → rivela/attiva ai destinatari pertinenti.
  Muri e luci non sono prerequisiti. Il documento non converte un'immagine
  in geometrie o statistiche.
- **Mappa con griglia stampata:** input 20 colonne e 12 righe dichiarate
  dall'autore → verifica dell'ancora e del bordo opposto → distanza/unità
  impostate esplicitamente → Applica. Dati mancanti non diventano una falsa
  portata precisa. Correggere solo il colore non cambia la scala.
- **Riuso dopo una sessione:** conserva il materiale scelto → anteprima
  dello stato da copiare → nuova campagna. La vecchia partita resta com'è;
  uno stato iniziale mai salvato non viene ricostruito per supposizione.

**Apri per me**, **Rivela contenuto** e **Attiva al Tavolo** continuano NAV-06.
Foundry documenta una Activate che porta tutti nella scena; non copiarne
questo effetto contro I-165. Salvare calibrazione o preparazione non attiva
iniziativa, consumo, trappola o assegnazione di tesori. Controllo della propria
scheda non concede modifica di tutti gli elementi.

Errori locali restano presso il campo/file. Un invio dall'esito incerto si
verifica prima di ripeterlo; versione e permessi si rivalidano al ritorno
della rete. Queste garanzie sono raccordi nostri con i flussi acquisiti,
non comportamenti comprovati da queste otto pagine. Nessuna promessa di
editor completo offline o fusione automatica tra DM/co-DM.

## Limiti da preservare nel contratto

Geometrie e distanza tra piani, collisioni, visione/luce e anteprima per
destinatario; gruppi persistenti e prefabbricati; formati strutturati e
conversioni; ripristino/copie e stato degli attori collegati; aggiornamenti
concorrenti; recupero dopo chiusura; asset privati e revoche; uso completo
su telefono, tastiera e tecnologie assistive. Sono approfondimenti specifici,
non motivi per bloccare la scena minima o tagli impliciti allo scopo.

Nota di accesso: `/article/grid/` e `/docs/assets/` non erano leggibili dal
lettore web. Nessuna capacità è fondata su quelle risposte fallite; griglia
verificata nelle fonti sopra, Assets raggiunta dal collegamento ufficiale a
`/docs/managing-assets/`.
