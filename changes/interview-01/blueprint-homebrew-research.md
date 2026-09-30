# Blueprint — ricerca Libreria, homebrew e revisioni

23/09/2026, `review_journey`, modello/sforzo ereditati. Ricerca documentale
indipendente per l'incremento6; unico file scritto nell'incarico. Nessuna
implementazione, prova runtime dei concorrenti, pubblicazione, importazione
in account o lettura di materiale privato. Non attesta il completamento del
blueprint né dell'intero catalogo homebrew.

Riferimenti interni riletti: [HOMEBREW_FLOW](../../docs/interview/HOMEBREW_FLOW.md),
[Biblioteca](../../docs/interview/pages/library.md), I-061–069/I-216 e
R045–050/R104–105/R184 in [RESEARCH](../../docs/interview/RESEARCH.md).
Riutilizzati anche [CRE/ADV e fonti builder](blueprint-character-builder-research.md).
Le fonti pertinenti sono state riaperte online: la consultazione attuale di
un documento storico non ne rende attuale ogni comportamento.

## Indicazioni utilizzabili nell'incremento

1. **Crea da zero, Usa come base e Nuova revisione sono comandi distinti.**
   Il primo produce una nuova definizione, il secondo una variante indipendente
   con origine riconoscibile, il terzo una nuova revisione della stessa
   definizione. Nome uguale non significa identità uguale. Precedenti S04/S06/S12;
   identità immutabili e uso privato sono precisazioni I-067/I-068.
2. **Salvare una definizione non la concede.** Dal builder, il ritorno deve
   riprendere personaggio, sezione e concessione interessata; la scelta entra
   nella bozza e viene applicata attraverso CRE/ADV. Dalla scheda si entra
   nel percorso INV/MAG/capacità pertinente. Al Tavolo si usa l'istanza già
   acquisita, con la sua revisione e i suoi consumi. S01/S08/S10/S19 documentano
   parti di questa continuità, non il nostro insieme di garanzie.
3. **Separare base, correzioni locali e stato di gioco.** La revisione salvata
   contiene definizione e regole; l'istanza conserva collegamento alla revisione,
   scelte e correzioni; risorse, preparazione, equipaggiamento, condizioni e
   tiri appartengono allo stato corrente. S06 sostiene la distinzione fra
   modello e copia; il confronto e la fusione rispettosa della partita
   derivano da HB-09/10 e ADV, non da una funzione concorrente verificata.
4. **Rendere visibili cinque permessi diversi:** leggere, modificare la
   definizione, condividere, abilitare una revisione in campagna, applicarla a
   una scheda controllata. L'export è un'ulteriore capacità del materiale.
   S02/S15/S18 mostrano perché l'accesso non implica tutte le altre facoltà.
   Nessun permesso DM ordinario per ogni tiro viene aggiunto.
5. **Mostrare l'impatto prima di aggiornare l'istanza.** Revisione attuale e
   proposta, testo cambiato, correzioni conservate o in conflitto, concessioni
   perse/ottenute, massimi e usi spesi. Applica rivalida stato e autorità;
   Mantieni versione lascia tutto com'è. Non presentare il ripristino della
   definizione come un undo dell'intera partita: S07/S09/S20 sono controesempi
   utili, non modelli di fusione da copiare.
6. **Testo e automazione hanno stati separati.** Una descrizione può essere
   salvata e consultata senza eseguire una regola. I controlli meccanici
   espongono solo operazioni realmente supportate, con origine e versione;
   campi ignoti rimangono visibili come manuali. S08/S10/S11/S13/S19 forniscono
   precedenti per concessioni, attività, risorse e domande contestuali.
7. **Export/import locale con riepilogo, senza scrittura silenziosa.** S06
   documenta JSON, S16 HTML/DOCX: non esiste qui una prova di formato comune.
   Proposta dell'agente: un formato dell'app versionato per definizioni e
   revisioni, con dipendenze e provenienza; importazione prima in anteprima,
   poi nella libreria personale. Non abilita campagne o modifica istanze.
8. **Conservare il limite della prova.** Non è stata verificata nei prodotti
   consultati una funzione che unisca revisioni immutabili, confronto a tre
   versioni, consumi vivi e correzioni personali come richiede HB. Non basta
   quindi chiamare il nostro aggiornamento «come Foundry» o «come Beyond».

## Fonti primarie e ampiezza effettiva della prova

Tutte consultate il 23/09/2026. **Documentato** significa testo ufficiale
letto, non interazione eseguita. **Storico** delimita data/versione. Le scelte
nelle sezioni successive sono **adattamenti dell'app**, salvo diversa
indicazione. Nessun forum di utenti è usato come prova di funzionalità.

| ID  | Fonte e data/versione esposta                                                                                                                                                                             | Controllo o comportamento documentato; limite                                                                                                                                                                                                                                                                                                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | [Beyond — Creation and Collection Basics](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238519700-Homebrew-Creation-and-Collection-Basics), aggiornato29/09/2025                            | My Creations distinto da My Collection; creazione per categoria, Add/Remove From Collection; raccolta utilizzabile in builder, scheda e mostri Maps. Elenca background, talenti, oggetti magici, mostri, specie, magie e sottoclassi. Non prova classi complete, revisioni private immutabili o export. Indicazioni commerciali non trasferite.                                              |
| S02 | [Beyond — Unable to Use Existing Template](https://dndbeyond-support.wizards.com/hc/en-us/articles/14175429918612-Unable-to-Use-Existing-Template),22/03/2023                                             | Per usare contenuto con licenza come template il documento richiede possesso sul servizio; la condivisione non basta. Precedente della distinzione accesso/modifica, non regola universale di licenza né vincolo economico dell'app.                                                                                                                                                         |
| S03 | [Beyond — Sharing and Publishing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content), aggiornato29/09/2025                                    | Uso nel gruppo senza pubblicazione; Publish dal dettaglio, pubblico distinto dalla raccolta. Descrive moderazione preventiva e versione pubblicata non modificabile/rimovibile. Quest'ultima politica non viene adottata; moderazione attuale non risolta per il contrasto S05.                                                                                                              |
| S04 | [Beyond — Same Vision, New Version](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published),10/11/2021                                                                           | Create New Version conserva la famiglia e la cronologia del pubblicato; template produce identità indipendente. Campo Version visibile anche nel dettaglio dell'oggetto sulla scheda; vecchie versioni consultabili. È il precedente più preciso per distinguere variante e revisione, ma non dimostra il nostro aggiornamento delle istanze o il versionamento di ogni salvataggio privato. |
| S05 | [Beyond — Homebrew Sharing Process Changes](https://www.dndbeyond.com/old-changelog/283-homebrew-sharing-process-changes),31/07/2018                                                                      | Annuncia controlli automatici e pubblicazione immediata con gestione successiva delle segnalazioni. Contraddice la coda generale descritta da S03. Conservare l'incertezza già registrata in R105; non decidere quale descriva il runtime odierno.                                                                                                                                           |
| S06 | [Foundry core — Items](https://foundryvtt.com/article/items/), pagina senza data/build esposte                                                                                                            | Create Item → nome/tipo → scheda; Duplicate; assegnazione all'attore crea una copia indipendente. Export Data produce JSON locale; Import Data carica un file sovrascrivendo l'elemento scelto. Non prova aggiornamento intelligente o compatibilità con il nostro JSON. I campi della scheda dipendono dal sistema.                                                                         |
| S07 | [Foundry core — Compendium Packs](https://foundryvtt.com/article/compendium/), pagina senza data/build esposte                                                                                            | Raccolte riutilizzabili e import di singole copie; export cartella può unire per nome o conservare ID, sovrascrivendo corrispondenze. Import All può conservare ID e sovrascrivere nel mondo. Controevidenza: «Importa» non garantisce conservazione della partita. I nostri conflitti non saranno risolti soltanto per nome.                                                                |
| S08 | [Foundry dnd5e — Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement),10/09/2026, badge6.0.0                                                                                                | Choose Items distinto da Grant Items; aumenti, competenze, PF, scale per livello e modifiche di oggetti. Sostiene i blocchi di concessione e scelta collegati al builder. È il sistema dnd5e, non core; moduli possono estendere i tipi. Non prova ogni combinazione homebrew.                                                                                                               |
| S09 | [Foundry dnd5e — Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide#updating-advancements-for-an-owned-class-item),31/01/2024, badge3.0.0 con riferimenti interni1.6 | Distingue classe posseduta e modello; descrive aggiornamento manuale della prima e una futura sincronizzazione. Avverte anche della perdita di modifiche manuali durante quel flusso. Fonte storica: non attribuire questi limiti al sistema6, né trattare una funzione futura come disponibile.                                                                                             |
| S10 | [Foundry dnd5e — Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),10/09/2026, badge6.0.0                                                                                                  | Scheda oggetto → Activities → + → tipo → editor. Identità, tempo, consumo, bersagli ed effetto sono separati. Usi dell'attività distinti da quelli condivisi dell'oggetto; più bersagli di consumo configurabili. Requisiti di identificazione/sintonia e visibilità per livello. Non importare automaticamente regole o tutti i tipi di attività nel motore.                                |
| S11 | [Foundry dnd5e — Active Effects](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects),10/09/2026, badge6.0.0                                                                                          | Effetti passivi distinti da temporanei e da modificatori valutati al tiro. Change Replacement distingue riferimenti dinamici e valori fissati dall'origine o dal destinatario; scadenze possono riferirsi a turni o riposi. Non è prova che modificare una definizione ricrei correttamente effetti già applicati.                                                                           |
| S12 | [Shard — Create](https://www.shardtabletop.com/create), data/build assenti                                                                                                                                | Reference → categoria → New; di norma copia da un'entità esistente, poi stat block modificabile. Comprende classi e altri tipi5e; libri/pacchetti sono un ulteriore livello. Non dedurre supporto completo di ogni regola2024 dalla dichiarazione generale.                                                                                                                                  |
| S13 | [Shard — Feature Modeling](https://www.shardtabletop.com/feature-modeling), data/build assenti                                                                                                            | Definizioni di capacità con testo mostrato o nascosto, alternative selezionabili, usi e recuperi, valori per livello. È un precedente concreto per distinguere promemoria, scelta e dato modellato. Esempi e formule storiche non costituiscono la fonte normativa2024 dell'app.                                                                                                             |
| S14 | [Shard — Package Creation](https://www.shardtabletop.com/package-creation), data/build assenti                                                                                                            | My Packages → New → Build → Pick Books → scelta fra contenuto incorporato e dipendenza → Share. Le dipendenze non sono copiate; il destinatario deve averle. Avverte di ambiguità quando lo stesso ID è incorporato in più pacchetti. Non prova export locale o fusione delle istanze.                                                                                                       |
| S15 | [Shard — Player Content Sharing](https://www.shardtabletop.com/howto/player-content-sharing),17 novembre, anno/build non esposti                                                                          | Campaign → Share Library; il GM sceglie i pacchetti attivi. Stop Sharing separato; uso condiviso limitato alla campagna. Le creazioni richiedono packaging. Riprendiamo separazione accesso/attivazione, non condivisione indiscriminata della libreria, packaging obbligatorio o quote.                                                                                                     |
| S16 | [Shard — Export has arrived](https://www.shardtabletop.com/blog/export),23/07/2024 confermato da S17                                                                                                      | Book → Export → anteprima HTML → download/stampa. Percorso documentato di rientro: HTML aperto in editor, DOCX → Import Book → Convert per la categoria. Contenuti protetti possono essere esclusi con spiegazione; non è un round-trip garantito di ID, regole e consumi.                                                                                                                   |
| S17 | [Shard — Release Notes](https://www.shardtabletop.com/release-notes), voci23/07/2024 e21/09/2024                                                                                                          | Conferma data dell'export libri e registra la disabilitazione dell'import personaggi da Beyond nel2024. Non usare vecchie pagine promozionali per promettere quell'importatore attuale. Le note non documentano un JSON homebrew interoperabile.                                                                                                                                             |
| S18 | [Shard — More and Less Sharing](https://www.shardtabletop.com/blog/more-and-less-sharing),16 febbraio, anno/build non esposti; testo precedente all'apertura marketplace                                  | Descrive contenuto protetto utilizzabile/condivisibile nel contesto previsto, ma non reimpacchettabile per altri; ammette riferimenti alle dipendenze. Storico: dimostra la distinzione fra uso e redistribuzione, non una politica universale per ogni contenuto privato.                                                                                                                   |
| S19 | [Roll20 — D&D Homebrew Character Builder](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/),19/11/2025                                                                                | Editor guidato di classi, sottoclassi, specie e background, capacità per livello e risorse; Query Mode chiede se applicare un modificatore. Il template documentato è una copia del personaggio prima di finalizzarlo, non una definizione di libreria condivisa. Azioni usate spesso possono essere portate alla barra token.                                                               |
| S20 | [Fantasy Grounds — Reverting a Module or Individual Item](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/1165590530/Reverting+a+Module+or+Individual+Item),18/11/2025                   | Indicatore della voce modificata e ripristino per elemento oppure intero modulo. Il ripristino cancella modifiche e non è annullabile secondo la guida. Precedente utile per rendere visibili le personalizzazioni; controesempio per il nostro «Correggi aggiornamento», che deve conservare la partita successiva.                                                                         |

## Percorsi e controlli da collegare, con origine esplicita

| Percorso                                | Controlli e risultato concreto                                                                                                                                    | Origine e adattamento                                                                                    |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Biblioteca → Crea                       | Tipo → Da zero/Usa come base → campi pertinenti → Anteprima → Salva bozza/Salva revisione. Mostrare subito origine e parti manuali.                               | S06/S12 per ingresso ed editor; HB per bozza, revisione privata e nessuna concessione automatica.        |
| Contenuto salvato → Duplica             | Nuova identità; nome modificabile; riferimento all'origine; nessuna dipendenza di aggiornamento involontaria dall'originale.                                      | S04/S06, attuazione I-068.                                                                               |
| Contenuto salvato → Modifica            | Bozza della revisione successiva; revisione in uso intatta; confronto prima di salvare.                                                                           | S04 per distinzione storica; I-067 estende il principio al privato senza richiedere pubblicazione.       |
| Builder → opzione mancante              | Apri creazione contestuale; Salva e Torna alla scelta; stessa bozza/personaggio/concessione. Mostrare il tipo compatibile e le scelte ancora richieste.           | Collegamento HB/CRE/ADV; S08/S19 sostengono concessioni e scelte, non questo esatto ritorno.             |
| Scheda → aggiungi contenuto             | Selezione per destinazione e revisione; passa dai comandi INV/MAG/ADV pertinenti. Consultare o selezionare non lancia, equipaggia, prepara o raddoppia dotazioni. | Contratti dell'app, continuità parziale documentata in S01/S10.                                          |
| Scheda/Tavolo → usa                     | Comando derivato dall'istanza; costo e disponibilità correnti; domanda narrativa soltanto se pertinente; fisico/digitale conservano la stessa origine.            | S10/S19 per attività/domande; TABLE/MAG per timing e prove reali.                                        |
| Autore → Condividi; DM → Abilita        | Destinatari/materiale/revisione leggibili; la nuova revisione non eredita automaticamente abilitazione o applicazione.                                            | S15 per assi distinti; granularità per revisione e controllori deriva da HB/I-066.                       |
| Istanza → Aggiornamento disponibile     | Confronta → Rivedi impatto → Applica a questa scheda oppure Mantieni versione. Nessuna modifica alle altre copie.                                                 | I-067/HB-09/10; S06/S09 sono precedenti di separazione, non di riconciliazione.                          |
| Dettaglio → Esporta; Libreria → Importa | Riepilogo contenuti/dipendenze → file locale; verifica formato e conflitti → anteprima → importazione esplicita.                                                  | S06/S16 per trasferimento; schema, atomicità, deduplicazione e permessi sono adattamenti proposti sotto. |

## Aggiornare una definizione senza ripristinare la partita

Il confronto deve avere tre riferimenti: **revisione originariamente applicata**,
**nuova revisione candidata** e **istanza attuale con correzioni**. Non confrontare
solo due versioni del testo. Il controllore autorizzato decide la sostituzione
dell'istanza; l'autore della definizione non riceve per questo controllo sulle
schede. Tutto questo attua HB/ADV: non è una regola SRD o una funzione di
sincronizzazione osservata nei concorrenti.

Identità stabili della definizione, revisione, concessione, attività e risorsa
permettono di sapere cosa rimane la stessa cosa. Due contatori omonimi non
si sommano; una risorsa rinominata con la stessa identità conserva i consumi.
Una sostituzione non equivalente richiede una scelta circoscritta nel
riepilogo, senza estendere il blocco alle altre schede.

| Cambiamento                                    | Esito necessario da HB/ADV                                                                                                                                      |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Massimo3→4, spesi2                             | Rimangono2 disponibili; niente riposo.                                                                                                                          |
| Massimo3→1, spesi2                             | Disponibili0, eccedenza storica1 conservata.                                                                                                                    |
| Consumo ignoto                                 | Resta ignoto, non diventa0; nessuna disponibilità piena per coercizione numerica.                                                                               |
| Consumo o preparazione cambia mentre confronto | Rileggere dati vivi; riepilogo obsoleto prima dell'applicazione.                                                                                                |
| Descrizione/nome/valore corretti sulla scheda  | Conservare l'override con provenienza distinta; conflitto esplicito sul medesimo dato cambiato.                                                                 |
| Bonus passivo rimosso dalla definizione        | Ricalcolare/rimuovere quel contributo soltanto; preservare concessioni indipendenti.                                                                            |
| Effetto temporaneo già avviato                 | Conservare origine, valori fissati, scadenza e storia; una revisione non prolunga la durata. I riferimenti dinamici restano dinamici dove la regola lo prevede. |
| Capacità rimossa e poi reintrodotta            | Non usarla come identità nuova per azzerare i consumi della medesima risorsa.                                                                                   |
| Roll/reazione pertinente ancora aperti         | Rinviare la sostituzione strutturale dipendente o applicare la rivalidazione specifica già definita, senza spendere/risolvere automaticamente la richiesta.     |
| Tentativo di applicazione ripetuto             | Stessa operazione, un solo aggiornamento/concessione; esito recuperabile dopo reload.                                                                           |

La prova su dati fittizi resta separata dallo stato reale. Non deve pubblicare
tiri, modificare risorse o dimostrare «bilanciamento». L'esito deve distinguere
quale parte è stata esercitata e quale resta descrittiva.

## Fonte, licenza, accesso e formato locale

L'origine del contenuto deve sopravvivere a copia, revisione e export. Un
adattamento originale mantiene origine dell'eventuale base e dichiarazione
della modifica; non eredita una citazione SRD per ogni nuovo effetto. Una
fonte sconosciuta rimane sconosciuta. EN/IT sono varianti linguistiche
identificate: una traduzione assente non va dichiarata disponibile.

Per i contenuti SRD riusati, corpus immutabile già acquisito e pagina1 EN/IT
riletta localmente:

- [SRD5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
  SHA-256 `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
- [SRD5.2.1 IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf),
  SHA-256 `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

Entrambi dichiarano CC-BY-4.0 e la formula di attribuzione alla pagina1.
Riutilizzare l'attribuzione completa già prevista dal corpus nell'artefatto
che include quel materiale. Questo non rende licenziati altri manuali,
immagini o testi privati. L'export deve preservare l'informazione di fonte
e licenza, non dedurla dalla semplice visibilità in campagna.

Proposta tecnica circoscritta per l'export/import del blueprint, **non formato
concorrente né promessa di migrazione universale**:

- Manifest con versione del formato, elenco delle definizioni/revisioni,
  origine, lingua, dipendenze ed eventuali allegati inclusi o mancanti.
  Export di definizioni distinto da backup di schede e partita: non includere
  per effetto collaterale note Solo io, consumi, log o ruoli della campagna.
- Validare struttura, ID, revisione e contenuto prima di mutare la libreria.
  Una revisione già presente e identica non crea duplicati; stesso ID/revisione
  con contenuto diverso è un conflitto, non un aggiornamento silenzioso.
  Offrire una copia indipendente quando è quello l'intento, mantenendo l'origine.
- Dipendenze non disponibili elencate; nessuna sostituzione tramite nome o
  download implicito di materiale privato. L'eventuale import parziale è
  esplicito e non dichiara eseguibili le parti irrisolte. S14/S16 sostengono
  la necessità di distinguere dipendenza e incorporamento, non questo schema.
- Il file contiene dati, non autorità: campi di proprietà/pubblicazione o
  abilitazione importati non conferiscono diritti locali. Formule e testo
  non diventano codice eseguibile; tipi non supportati restano dichiarati.
- La disponibilità di un contenuto in un servizio non prova il diritto di
  esportare ogni sua dipendenza. Per dati originali/SRD dell'incremento il
  percorso è verificabile localmente; per materiale terzo rispettare i diritti
  dichiarati senza introdurre una nuova licenza o una pubblicazione obbligatoria.

## Casi di verifica proposti e lacune reali

Questi sono criteri per l'implementazione successiva, **non test eseguiti**:

1. Nuovo contenuto descrittivo → salva → consulta senza personaggio/campagna;
   nessuna concessione, costo o automazione dedotta dal nome.
2. Duplica → modifica copia → originale e istanze esistenti invariati.
3. Nuova revisione → salva → scheda conserva la revisione precedente;
   aggiornamento possibile soltanto nel percorso esplicito autorizzato.
4. Builder → crea contenuto mancante → torna alla concessione corretta;
   applicazione una volta, nessuna selezione sul personaggio sbagliato.
5. Riserva aggiornata con consumi intervenuti, massimo ridotto, usi ignoti;
   nessun recupero o perdita della correzione personale.
6. Modifica concorrente sullo stesso campo → confronto; campo indipendente
   come una nota → conservazione senza rifare tutta la bozza.
7. Salvataggio, consultazione, condivisione e abilitazione non si sostituiscono
   l'uno all'altro; il DM non legge una definizione personale solo per il ruolo.
8. Import due volte dello stesso file → niente copie extra; collisione di
   revisione → errore comprensibile prima di una scrittura parziale.
9. Export → reimport locale → stessa origine, revisioni e dipendenze;
   allegato assente dichiarato, nessuna falsa identità di round-trip perfetto.
10. Attività originale supportata → prova fittizia → istanza → uso al Tavolo:
    stessa fonte, risorsa corretta, fisico/digitale, annullamento e reload.

Non ovvio e ancora da risolvere quando il flusso lo richiede: risorse non
equivalenti; revoca di materiale privato già usato; ritiro pubblico e
moderazione; aggiornamenti di definizioni annidate; traduzioni divergenti;
migrazioni fra formati/versioni; tutte le operazioni e combinazioni di effetti.
Il contratto non autorizza l'autore della libreria a decidere da solo questi
esiti sulle schede altrui. L'implementatore può completare i passaggi ordinari
già delegati e rendere visibili le dipendenze non risolte, senza nuovi voti
ordinari o tagli di scope.

Non sono state trovate nelle fonti aperte prove sufficienti per dichiarare:
export/import homebrew JSON nativo di Beyond o Shard; aggiornamento automatico
universale delle copie Foundry6 che preservi ogni stato vivo; attuale pipeline
di moderazione Beyond; effetto completo di tutte le revoche sulle istanze.
Queste sono lacune della ricerca documentale circoscritta, non affermazioni
di assenza assoluta delle capacità nei prodotti.
