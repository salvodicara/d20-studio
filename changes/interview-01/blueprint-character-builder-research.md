# Blueprint — ricerca su creazione e avanzamento del personaggio

Verifica documentale del 23/09/2026, `review_journey`, modello e sforzo
ereditati invariati. Unico file scritto nell'incarico. Nessuna prova runtime
dei concorrenti, accesso ad account, installazione o modifica del codice.
Il documento sostiene l'incremento del blueprint; non certifica la sua
implementazione, tutto il catalogo o il completamento del Goal.

Contratti riletti: [CRE](../../docs/interview/CHARACTER_CREATION.md),
[ADV](../../docs/interview/CHARACTER_ADVANCEMENT.md), con I-213/I-214,
R179/R180 e i vincoli già acquisiti I-054/I-060/I-116/I-122–125/I-169–176.
Riutilizzato il corpus SRD locale prima di cercare nuovi materiali.

## Raccomandazioni utilizzabili

1. Percorso guidato con sezioni riapribili, aiuto contestuale, problemi
   collegati alla scelta e riepilogo finale: Beyond, Roll20 e Foundry offrono
   precedenti puntuali. Il builder resta una bozza distinta dalla scheda in
   gioco; il comportamento di riconciliazione è quello di CRE/ADV.
2. Mostrare origine, edizione/revisione, disponibilità personale e abilitazione
   nella campagna. Un filtro non acquista contenuti, non concede permessi e
   non pubblica homebrew. Shard distingue condivisione della libreria e
   pacchetti attivi; la nostra politica precisa deriva dai contratti.
3. Distinguere punteggi base, aumenti concessi e totale manuale sostitutivo.
   Foundry documenta valore finale, variazione e punti residui. Non sommare
   un aumento sopra il totale manuale senza la scelta prevista da I-054.
4. Conservare classe iniziale, ordine dei livelli, metodo PF e risultati
   effettivi. Non fabbricare tiri passati nella ricostruzione. La cronologia
   dei tiri fisici/digitali e la sua conservazione sono adattamenti CRE/ADV.
5. Applicare cambiamenti strutturali allo stato corrente: niente guarigione,
   riposo, risurrezione, dotazione duplicata o ripristino di slot consumati.
   Queste garanzie sono del nostro contratto, non capacità provate dei cinque
   prodotti confrontati.
6. Una capacità selezionata deve distinguere concessione, scelte ancora
   richieste e comportamento modellato. Il nome di classe, specie o talento
   non autorizza ad attribuire formule o automazioni non verificate. Un
   riepilogo con lacune esplicite non equivale a una scheda nuova completa;
   resta distinta la ricostruzione con dati da verificare.

## Fonti primarie d'interazione

Tutte riaperte il 23/09/2026. Sono documentazione o annunci del produttore;
nessuna sessione autenticata è stata osservata. Quando manca una build
fissata, la data della pagina non diventa una revisione immutabile del prodotto.
I prodotti sono scelti per i compiti che illuminano, non come elenco chiuso
del mercato. Le sintesi seguenti non autorizzano il riuso di testi o asset.

| ID  | Fonte e versione/data                                                                                                                                                  | Riscontro utilizzabile, limite e raccordo                                                                                                                                                                                                                                                                                                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U01 | [Beyond Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods), aggiornata 24/03/2026           | Standard guidato; Quickbuilder per livello 1 modificabile dopo; premade consultabili prima di acquisirli. Precedente per ingressi distinti CRE-01, non prova di import universale. La menzione della casella Beginner è superata da U04.                                                                                                                                |
| U02 | [Beyond Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections), 27/08/2025                                          | Home con preferenze/fonti; classe/livello/multiclasse e scelte di capacità; background/specie, caratteristiche, magie, equipaggiamento e uscita verso scheda. Separazione XP/milestone e PF fissi/manuali. Contiene anche testo storico sulla stampa: non trattarla come fotografia completa della UI corrente. CRE-02–09, ADV-01–06.                                   |
| U03 | [Beyond Content Categories](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747201820948-Enabling-Content-Categories-for-your-Character-Sheet), 11/11/2025    | Categorie Core 2024, Expanded, 2014, Legacy, Homebrew e Partner, raggiungibili da Home o Settings. I partner distinguono editori e contenuti posseduti. Precedente per filtri e provenienza, non per una nuova autorità del DM o pubblicazione automatica. CRE-03.                                                                                                      |
| U04 | [Beyond changelog](https://www.dndbeyond.com/changelog), voci 24/03 e 14/04/2026                                                                                       | Quickbuilder pubblicato; successiva rimozione della casella Beginner, con aiuto ancora disponibile. Autoequipaggiamento dei nuovi Quickbuilder documentato: controesempio da non importare, perché I-172 richiede scelte esplicite. Non attribuire a marzo un builder futuro già completo.                                                                              |
| U05 | [Foundry dnd5e Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement), 10/09/2026, badge 6.0.0                                                             | Sistema dnd5e, non core VTT. Passi collegati a classe/sottoclasse/background: HP, ASI, scelte/concessioni, modifiche oggetti, valori per livello, taglia, sottoclasse e tratti. La presenza di un tipo non certifica tutti i contenuti. CRE-04, ADV-02–06.                                                                                                              |
| U06 | [Foundry ASI advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement-Type-Ability-Score-Improvement), 10/09/2026, 6.0.0                                      | Mostra valore finale, delta, punti residui, blocchi e massimo. Regole moderne: scelta fra talento ASI e altro talento, con distribuzione solo se pertinente; raccomandazione Epic Boon distinta. Le opzioni legacy/specie presenti nella guida non diventano bonus razziali 2024. CRE-05/06, ADV-04.                                                                    |
| U07 | [Foundry HP advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement-Type-Hit-Points), 10/09/2026, 6.0.0                                                      | Primo livello totale massimo; poi tiro o valore fisso. Conserva per livello `max`, `avg` oppure risultato; ricorda la preferenza del fisso. La guida dichiara che non conserva il modificatore CON di ogni livello: non attribuirle uno storico completo della nostra ricostruzione. ADV-03.                                                                            |
| U08 | [Foundry Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide), 31/01/2024, badge 3.0.0, testo anche 1.6                            | Precedente storico: cambiare livello apre passi, Modify Choices rivede scelte per livello; copia sul personaggio distinta dal compendio. Avverte che modifiche manuali durante il processo vengono ripristinate: controesempio al merge ADV. Non importare la vecchia assenza del passo sottoclasse come limite attuale 6.0.                                            |
| U09 | [Roll20 Play D&D 2024 Your Way](https://blog.roll20.net/posts/play-dd-2024-your-way-on-roll20/), 17/09/2024                                                            | Builder 2024 allora beta: riepilogo con scelte mancanti, serie standard, point buy, tiro e manuale. Le funzionalità elencate come future non sono prova di disponibilità in quella data. CRE-06/11.                                                                                                                                                                     |
| U10 | [Roll20 Homebrew Character Builder](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/), 19/11/2025                                                  | Classi, sottoclassi, specie e background personalizzati; capacità, modificatori, risorse e scelte per livello; duplicazione come modello. Il metodo suggerito per pianificare salendo e scendendo non viene adottato: ADV-09 conserva un piano distinto dalla scheda attiva. Non prova import legale/automatico di qualsiasi libro.                                     |
| U11 | [Roll20 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer), 10/11/2021, 5e OGL                                         | Passi navigabili, Save and Exit/Resume, Review e Apply solo dopo campi richiesti. Storico, non builder 2024. La chiusura X perde modifiche del passo corrente e Apply sovrascrive la scheda: controesempi per CRE-11 e ADV-07, non comportamenti desiderati.                                                                                                            |
| U12 | [Shard Character Creation](https://www.shardtabletop.com/howto/character-creation1), pagina 10 agosto con immagini datate 2021, build non esposta                      | Segnala scelte mancanti sulla scheda; selettori consultabili, dialogo per livelli e aggiunta della stessa/altra classe; metodi caratteristiche e dotazione/oro. Regole mostrate storiche: bonus razziali, Hero/best-of-7 non sono baseline 2024. Ricomparsa della dotazione con inventario vuoto non va copiata: svuotare uno zaino non dà un nuovo pacchetto gratuito. |
| U13 | [Shard Player Content Sharing](https://www.shardtabletop.com/howto/player-content-sharing), 17 novembre, anno/build non esposti                                        | Condivisione esplicita dopo ingresso in campagna, revocabile; uso circoscritto alla campagna; il GM sceglie pacchetti attivi. Le creazioni richiedono packaging distinto. Precedente per separare accesso e attivazione; quote e abbonamenti del concorrente non diventano requisiti nostri.                                                                            |
| U14 | [Demiplane patch notes 15](https://www.demiplane.com/blog/you-meet-the-prerequisite-for-these-patch-notes-15), 23/04/2025, PF2e/Starfinder2e                           | Filtra talenti per prerequisiti, permette di vedere anche quelli non idonei, raggruppa per livello; separa regole varianti, contenuti e preferenze. Mostrare non equivale a concedere una deroga. Pattern CRE-05, nessuna regola PF2e trasferita nel motore 2024.                                                                                                       |
| U15 | [Demiplane Pathfinder builder guide](https://resources.demiplane.com/nexus/pathfinder/character-tools/pathfinder-character-builder), build/data editoriale non esposte | Guida per sezioni, ritorno alle scelte, salvataggio/ripresa e passaggio alla scheda; creazione anche a livello superiore. Fonte di interazione per CRE-02/11, non di calcoli D&D.                                                                                                                                                                                       |

## Regole: revisione immutabile e licenza

R01 = [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
364 pagine. R02 = [SRD 5.2.1 IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf),
405 pagine. Entrambi gli URL ufficiali sono stati riaperti; contenuto
verificato sulle copie e sugli estratti già conservati in
`/Users/salvatoredicara/Workspace/Codex/d20-studio-experience-evidence/`.
Nessun nuovo PDF scaricato. Le pagine sotto sono stampate, da 1; l'estratto
locale separa le pagine con form feed nello stesso ordine. L'IT riordina
alfabeticamente anche le classi: non applicare un offset fisso EN→IT.

| File locale            | SHA-256 ricalcolato                                                |
| ---------------------- | ------------------------------------------------------------------ |
| `SRD_CC_v5.2.1.pdf`    | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` |
| `IT_SRD_CC_v5.2.1.pdf` | `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` |
| `en.txt`               | `4456eaa81743ed341c13f19d1d7ced344a6adcbb15367941875ee45cd3f2e562` |
| `it.txt`               | `ea034a26b6f061d0435871ec64ec19dcd1e9869f2ffe2c1c7400085712082e73` |

Fonte eseguibile: `official-srd`, baseline 2024, revisione `5.2.1` con hash
del PDF pertinente. La licenza CC-BY-4.0 e l'attribuzione sono a p. 1 di
entrambi; l'attribuzione del progetto è mantenuta in
[rules.md](../../evidence/experience-01/rules.md#attribuzione-del-materiale-srd).
Le sintesi e tabelle numeriche seguenti sono derivate dal corpus locale con
questa licenza. Nomi e testi commerciali esterni all'SRD non acquisiscono la
stessa licenza perché un concorrente li mostra nel proprio builder.

## Vincoli eseguibili e casi di controllo

| Ambito                          | Regola verificata e conseguenza                                                                                                                                                                                                                                                                                                                                                            | EN / IT                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------- |
| Sei punteggi base               | Serie 15/14/13/12/10/8 assegnata una volta per valore; casuale: sei gruppi di quattro d6, somma dei tre più alti; point buy budget 27, basi 8–15, costi 0/1/2/3/4/5/7/9. Suggerimenti di assegnazione per classe non obbligatori. La scelta del metodo può seguire l'accordo col GM senza nuovo gate digitale.                                                                             | 20–21 / 23                                      |
| Input fisico e manuale          | Per sei gruppi fisici accettare quattro facce 1–6 per gruppo; `6,6,1,2` produce 14. Il totale inserito senza facce resta manuale/dichiarato. Archivio tiri, niente rilanci navigando e totali sostitutivi sono adattamenti CRE/I-054, non UI prescritta dall'SRD.                                                                                                                          | Regola dadi 21 / 23; contratto CRE-06           |
| Background                      | Aumento +2 e +1 a due diverse caratteristiche fra le tre indicate, oppure +1 a tutte e tre; limite20. Due abilità, uno strumento, talento Origini e scelta dotazione oppure50GP. Non applicare automaticamente bonus specie del2014.                                                                                                                                                       | 20–21,83 / 22–23,93                             |
| Equipaggiamento                 | Scelta classe e scelta background sono entrambe pertinenti, ciascuna con le proprie alternative. Acquisire un pacchetto non aggiunge anche il suo oro alternativo. Il guerriero ha A/B/C, non solo A/B. Ricostruzione e cambio classe non riassegnano beni già acquisiti. Autoequip escluso da I-172, non da una presunta regola SRD sull'interfaccia.                                     | 20 e singole classi,83 / 22 e singole classi,93 |
| PF iniziali                     | Primo livello totale: massimo del dado della classe + modificatore CON; un Dado Vita. Barbaro12, guerriero/paladino/ranger10, bardo/chierico/druido/monaco/ladro/warlock8, stregone/mago6, prima di CON e altri tratti.                                                                                                                                                                    | 22 / 25                                         |
| PF all'avanzamento              | Un dado della nuova classe + CON, incremento minimo1; alternativa fissa d12→7,d10→6,d8→5,d6→4 più CON. Non si prende il massimo quando si aggiunge una classe a livello totale>1. Un incremento di1 al modificatore CON aumenta il massimo di1 per ogni livello raggiunto, senza contare due volte il livello appena aggiunto.                                                             | 23,25 / 26–28                                   |
| Livello e competenza            | XP e bonus competenza dipendono dal livello totale. +2 ai livelli1–4, +3 a5–8, +4 a9–12, +5 a13–16, +6 a17–20. Le capacità e le occasioni di scelta dipendono dal livello nella specifica classe.                                                                                                                                                                                          | 23–25 / 25–28                                   |
| Talento ASI                     | Talento generale, requisito livello4+, ripetibile; +2 a una caratteristica oppure +1 a due, massimo20. L'occasione di scegliere dipende dalla tabella della classe. Se si sceglie un altro talento non si aggiunge anche l'ASI, salvo beneficio proprio del talento. Non generalizzare a ogni quarto livello totale.                                                                       | 87 e tabelle classe / 98 e tabelle classe       |
| Multiclasse                     | Requisiti13 nelle caratteristiche primarie della nuova classe e delle attuali; dotazioni/competenze da ingresso multiclasse della classe, non tutti i privilegi iniziali. CA alternative non si sommano; Extra Attack non si cumula genericamente. I-060 sulle deroghe dei talenti non concede deroga automatica multiclasse.                                                              | 24–25 / 27–28                                   |
| Magia multiclasse               | Preparazione distinta per classe come personaggio monoclasse; incantesimo mantiene la sua abilità di lancio. Slot: livelli pieni bardo/chierico/druido/stregone/mago, più metà dei livelli nelle classi paladino/ranger arrotondata per eccesso secondo il testo. Con una sola classe dotata di Spellcasting usare la sua tabella. Cantrip che scala segue livello totale salvo eccezione. | 25–26 / 28–29                                   |
| Slot e conoscenza               | Slot alti non concedono incantesimi di pari livello. Ranger3/stregone3: livello incantatore5, slot4/3/2, magie ranger1° e stregone fino al2°. Pact Magic resta riserva distinta, pur potendo alimentare incantesimi preparati di altre classi e viceversa. Mystic Arcanum non diventa slot6–9.                                                                                             | 25–26,71–72 / 28–29,85–87                       |
| Mago                            | Libro iniziale con6 incantesimi di1°, preparati4; due nuovi incantesimi nel libro per nuovo livello da mago, di livello consentito dalla tabella mago. Libro, preparati, sempre preparati e slot sono insiemi distinti.                                                                                                                                                                    | 77–78 / 59–60                                   |
| Vita e consumi durante la bozza | L'SRD descrive aumento massimoPF, non un riposo. ADV impone PF attuali, temporanei, morte/condizioni/concentrazione invariati; stessa riserva conserva gli usi spesi. `max3,spesi2→max4,disponibili2`. Pool non equivalenti richiedono riconciliazione mirata. Nessuna prova concorrente sostituisce questo contratto.                                                                     | Regola massimo23 / 26; politica ADV-03/05/07/08 |

Attenzione al caso combinato paladino+ranger entrambi dispari: il testo SRD
raggruppa le due classi nel termine arrotondato. La lettura operativa
condivisa con l'autore del dominio è `ceil((paladino+ranger)/2)`, non due
arrotondamenti indipendenti: paladino1/ranger1 contribuisce1 e ha2 slot1°.
Questa formula esplicita l'interpretazione del testo; il caso
ranger3/stregone3 non basta da solo a verificare quel bordo. Conservare
entrambi i casi nel calcolo che supporta le due classi insieme.

### Indice delle dodici classi e dati iniziali verificati

Queste sono le dotazioni di classe iniziale. I paragrafi multiclasse sono
distinti. Competenze di background/specie, Expertise e scelte di capacità
possono aggiungersi; non appiattirle in un'unica stringa senza origine.

| Classe    | EN / IT tratti | Dado Vita | Primaria; TS iniziali   | Abilità iniziali                                                                                                        |
| --------- | -------------- | --------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Barbaro   | 28 / 32        | d12       | FOR; FOR/COS            | 2: Addestrare Animali, Atletica, Intimidire, Natura, Percezione, Sopravvivenza                                          |
| Bardo     | 31 / 35        | d8        | CAR; DES/CAR            | 3 qualsiasi                                                                                                             |
| Chierico  | 36 / 41        | d8        | SAG; SAG/CAR            | 2: Storia, Intuizione, Medicina, Persuasione, Religione                                                                 |
| Druido    | 41 / 46        | d8        | SAG; INT/SAG            | 2: Addestrare Animali, Arcano, Intuizione, Medicina, Natura, Percezione, Religione, Sopravvivenza                       |
| Guerriero | 47 / 53        | d10       | FOR oppure DES; FOR/COS | 2: Acrobazia, Addestrare Animali, Atletica, Storia, Intuizione, Intimidire, Persuasione, Percezione, Sopravvivenza      |
| Monaco    | 49 / 66        | d8        | DES e SAG; FOR/DES      | 2: Acrobazia, Atletica, Storia, Intuizione, Religione, Furtività                                                        |
| Paladino  | 53 / 70        | d10       | FOR e CAR; SAG/CAR      | 2: Atletica, Intuizione, Intimidire, Medicina, Persuasione, Religione                                                   |
| Ranger    | 57 / 75        | d10       | DES e SAG; FOR/DES      | 3: Addestrare Animali, Atletica, Intuizione, Indagare, Natura, Percezione, Furtività, Sopravvivenza                     |
| Ladro     | 61 / 55        | d8        | DES; DES/INT            | 4: Acrobazia, Atletica, Inganno, Intuizione, Intimidire, Indagare, Percezione, Persuasione, Rapidità di Mano, Furtività |
| Stregone  | 64 / 79        | d6        | CAR; COS/CAR            | 2: Arcano, Inganno, Intuizione, Intimidire, Persuasione, Religione                                                      |
| Warlock   | 70 / 85        | d8        | CAR; SAG/CAR            | 2: Arcano, Inganno, Storia, Intimidire, Indagare, Natura, Religione                                                     |
| Mago      | 77 / 59        | d6        | INT; INT/SAG            | 2: Arcano, Storia, Intuizione, Indagare, Medicina, Natura, Religione                                                    |

I nomi italiani della tabella sono etichette di raccordo; identificatori e
localizzazioni eseguibili vanno confrontati con la voce IT, senza ricavare
meccaniche dalla stringa tradotta. Armature, armi, strumenti e pacchetti sono
nelle stesse tabelle sorgente; questo indice non sostituisce la lettura delle
opzioni né verifica ogni capacità dei livelli1–20.

Importi alternativi in oro riletti nelle dodici tabelle EN sopra: barbaro75,
bardo90, chierico110, druido50, guerriero155, monaco50, paladino150,
ranger150, ladro100, stregone50, warlock100, mago55 GP. Sono l'opzione B,
**tranne il guerriero**, dove A e B sono due pacchetti diversi e l'oro è C.
Questo controllo verifica gli importi, non l'intera espansione automatica
del contenuto dei pacchi.

Gli stili di combattimento presenti in SRD EN87–88 sono Archery, Defense,
Great Weapon Fighting e Two-Weapon Fighting. Dueling e Protection non sono
presenti in quelle pagine: niente citazione SRD inventata per offrirli.
Great Weapon Fighting2024 tratta1/2 sul dado danni come3 nelle condizioni
indicate; non importare il rilancio2014. Defense richiede un'armatura
indossata, non soltanto il possesso del talento.

### Background e specie

Quattro background SRD, EN83 / IT93:

| Background | Tre caratteristiche | Origini                             | Abilità; strumento                           |
| ---------- | ------------------- | ----------------------------------- | -------------------------------------------- |
| Accolito   | INT/SAG/CAR         | Iniziato alla magia, lista chierico | Intuizione/Religione; scorte da calligrafo   |
| Criminale  | DES/COS/INT         | Allerta                             | Rapidità di Mano/Furtività; arnesi da scasso |
| Sapiente   | COS/INT/SAG         | Iniziato alla magia, lista mago     | Arcano/Storia; scorte da calligrafo          |
| Soldato    | FOR/DES/COS         | Aggressore selvaggio                | Atletica/Intimidire; un tipo di gioco        |

Iniziato alla magia richiede due trucchetti e un incantesimo1° dalla lista
indicata; INT/SAG/CAR a scelta come abilità di lancio. L'incantesimo è sempre
preparato e ha un lancio senza slot per riposo lungo; può anche usare slot
disponibili. La lista del chierico non impone SAG. Abile concede tre
competenze fra abilità/strumenti. EN87 / IT98. Un talento non ripetibile non
si somma perché due fonti riportano lo stesso nome; verificare le specifiche
scelte o sostituzioni consentite, senza inventarne una generale.

Specie EN84–86 / IT94–97: tutte velocità30ft/9m, tranne Goliath35ft/10,5m e
ramo elfo dei boschi35ft/10,5m. Gnomo/halfling Piccoli; umano/tiefling
Piccoli o Medi a scelta; altri Medi. Scelte da conservare: ascendenza
dragonide; lignaggio elfo e sua abilità magica, una competenza fra
Intuizione/Percezione/Sopravvivenza; lignaggio gnomo e abilità magica;
ascendenza goliath; taglia, competenza e talento Origini umano; taglia,
retaggio e abilità magica tiefling. Il nano aumenta il massimoPF di1 per
livello totale, già dal primo: contributo distinto dalla COS.

Le magie delle specie a livelli3/5 non si concedono anticipatamente. Fonte,
abilità di lancio, livello di concessione e usi gratuiti restano separati
dalla lista di classe. Velocità/taglia/nomi di tratti non certificano
l'automazione di soffio, volo, resistenze, riposi o reazioni.

### Progressioni magiche numeriche rilette, livelli di classe1–20

Array in ordine dal livello1 al20, senza elemento livello0. Sono colonne
base delle tabelle, non formule basate sull'abilità di lancio. I trucchetti
e gli incantesimi aggiunti da altre capacità non consumano automaticamente
queste quote. L'autore del dominio ha ricevuto gli stessi dati.

```text
Preparati — bardo EN31, chierico EN36, druido EN41:
[4,5,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22]
Preparati — stregone EN65:
[2,4,6,7,9,10,11,12,14,15,16,16,17,17,18,18,19,20,21,22]
Preparati — mago EN77:
[4,5,6,7,9,10,11,12,14,15,16,16,17,18,19,21,22,23,24,25]
Preparati — paladino EN53, ranger EN58:
[2,3,4,5,6,6,7,7,9,9,10,10,11,11,12,12,14,14,15,15]
Preparati — warlock EN71:
[2,3,4,5,6,7,8,9,10,10,11,11,12,12,13,13,14,14,15,15]

Trucchetti — bardo EN31, druido EN41, warlock EN71:
[2,2,2,3,3,3,3,3,3,4,4,4,4,4,4,4,4,4,4,4]
Trucchetti — chierico EN36, mago EN77:
[3,3,3,4,4,4,4,4,4,5,5,5,5,5,5,5,5,5,5,5]
Trucchetti — stregone EN65:
[4,4,4,5,5,5,5,5,5,6,6,6,6,6,6,6,6,6,6,6]
Trucchetti — paladino/ranger: 0 base; capacità/talenti distinti.

Pact Magic — warlock EN71, quantità slot:
[1,2,2,2,2,2,2,2,2,2,3,3,3,3,3,3,4,4,4,4]
Pact Magic — warlock EN71, livello degli slot:
[1,1,2,2,3,3,4,4,5,5,5,5,5,5,5,5,5,5,5,5]
```

Slot ordinari: tabella multiclass EN26 / IT29, da livello incantatore1 a20;
le cinque classi piene riportano le stesse colonne di slot. Paladino/ranger
monoclasse usano le rispettive tabelle EN53/58: già2 slot1° al livello1,
ancora2 al livello2,3 al3/4,4+2 al5/6, fino a4/3/3/3/2 al19/20.
Le righe monoclasse coincidono con la tabella piena al livello
`ceil(livelloClasse/2)`; la corrispondenza è verificata sulle tabelle,
non presunta per qualsiasi classe personalizzata. Nell'implementazione
distinguere l'indice dell'array dal livello rappresentato.

```text
Livello incantatore : quantità slot, dal1° al9°; zeri finali omessi
1:  [2]
2:  [3]
3:  [4,2]
4:  [4,3]
5:  [4,3,2]
6:  [4,3,3]
7:  [4,3,3,1]
8:  [4,3,3,2]
9:  [4,3,3,3,1]
10: [4,3,3,3,2]
11: [4,3,3,3,2,1]
12: [4,3,3,3,2,1]
13: [4,3,3,3,2,1,1]
14: [4,3,3,3,2,1,1]
15: [4,3,3,3,2,1,1,1]
16: [4,3,3,3,2,1,1,1]
17: [4,3,3,3,2,1,1,1,1]
18: [4,3,3,3,3,1,1,1,1]
19: [4,3,3,3,3,2,1,1,1]
20: [4,3,3,3,3,2,2,1,1]
```

Il corpus IT conferma le regole generali; gli array sopra sono trascritti e
verificati dalle colonne EN indicate, senza dichiarare un secondo confronto
cella per cella di tutte le tabelle IT. Le tabelle sono sufficienti per quote
e capacità di slot, non per certificare ogni privilegio, sostituzione di magia
o riposo specifico delle dodici classi.

## Prove raccomandate al builder, non eseguite qui

- Navigazione/riapertura non rilancia dadi; input fisico invalido non crea
  evidenza valida; metodo manuale non inventa facce. Bozza salvata/ripresa
  mantiene scelte, sezione e provenienza.
- Nuovo personaggio incompleto resta bozza; ricostruzione con lacune
  dichiarate usa il percorso distinto. Annullare non modifica la scheda
  corrente; confermare due volte non duplica scheda, monete o dotazione.
- Guerriero7 COS17 massimo67 attuali42 → guerriero8 COS18 massimo84
  attuali42; con danni5 durante la bozza,37/84; con0PF resta0. Il totale
  manuale sostitutivo conserva la propria natura e mostra il calcolo separato.
- Classe aggiunta al livello totale>1 non riceve massimo dado, tutti i TS
  iniziali o una seconda dotazione. Un incremento CON e Robustezza nanica
  devono apparire come contributi distinti.
- Mago14 prepara18, mago16 prepara21; libro distinto. Ranger3/stregone3
  dispone di slot3° ma non prepara magie3°. Pact e Arcanum restano distinti.
- Consumare una risorsa o modificare inventario mentre è aperta la bozza
  non viene annullato applicando il livello; rimuovere/riaggiungere la stessa
  capacità non azzera gli usi. Il cambio di una riserva non equivalente è
  spiegato prima dell'applicazione.
- Cambiare background/specie revoca solo benefici della fonte sostituita,
  preservando concessioni indipendenti. Filtrare fonti o mostrare talenti
  non idonei non abilita pubblicazione, contenuti revocati o deroghe generiche.
- Revoca permessi interrompe applicazione; note Solo io e bozza personale
  non finiscono nel log condiviso. Offline locale non si dichiara già
  sincronizzato; ritorno a scheda/Tavolo preserva contesto corrente.

## Limiti dell'incarico

Nessun risultato runtime, test del codice o approvazione di candidato deriva
da questa ricerca. Non verificati in modo esaustivo: tutte le capacità e
sottoclassi1–20, ogni pacchetto di equipaggiamento, tutte le sostituzioni o
interazioni fra fonti, l'intero catalogo commerciale, importazioni esterne e
sincronizzazione multiutente. Le parti non modellate restano identificabili
nel contratto e nel blueprint; questo non è un nuovo taglio di prodotto.
