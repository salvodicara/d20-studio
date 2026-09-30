# Creazione e ricostruzione del personaggio

23/09/2026. Sintesi dell'agente su delega I-180/I-190/I-209, raccordo I-213 e
ricerca R179. Specifica concettuale parziale: nessuna
app implementata o provata, nessun catalogo completo o layout finale approvato.
Conserva I-052–I-069, I-116, I-170–I-172, I-175 e gli accessi di
[NAVIGATION](NAVIGATION.md). I nomi dei comandi sono funzionali; i testi EN/IT
saranno localizzati senza cambiare la regola o la provenienza.

## Esito e confini del percorso

**Personaggi → Crea / Ricostruisci / Importa / Personaggio pronto → sezioni →
Riepilogo → Crea scheda → scheda.** L'invito mantiene visibile la campagna di
arrivo; creare la scheda non equivale ad accettare l'invito, assegnare controllo
o entrare al Tavolo. L'uso personale resta completo per i dati disponibili,
anche quando il resto del gruppo usa carta o un altro prodotto, I-052.

Tutti gli ingressi convergono sullo stesso modello di scheda. Una **bozza**
conserva lavoro ancora da applicare; una **scheda creata** conserva dati e
risorse usati per giocare. Il grado di verifica è distinto: una scheda
ricostruita può contenere totali manuali e storia incompleta riconoscibili,
senza essere presentata come integralmente verificata.

[CHARACTER_ADVANCEMENT](CHARACTER_ADVANCEMENT.md) governa avanzamento,
revisione delle scelte, piano futuro, matematica dopo il primo livello e
riconciliazione con una scheda già giocata. Qui si definisce l'ingresso;
[INVENTORY_FLOW](INVENTORY_FLOW.md) e [SPELLCASTING_FLOW](SPELLCASTING_FLOW.md)
restano autorità sulle operazioni successive di oggetti e magie.

## Origine, motivo e adattamento dei comandi

Le pagine primarie sono state consultate il 23/09/2026, salvo le evidenze
riutilizzate con data esplicita, inclusi R093/R152. Le fonti web non
forniscono una build applicativa immutabile: date delle guide e rilasci non
sono versioni del software provato. Le sigle S1–S11 sono risolte nell'appendice
R179. «Documentato» non significa osservato in un account o testato qui.

| Gruppo e comandi                                                                       | Prodotto e comportamento documentato                                                                                                                           | Adozione, motivo e limite                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **CRE-01 — Crea, Vai alla sezione, Avanti, Indietro, Aiuto**                           | Beyond Standard per passi, aiuto facoltativo, S1; sezioni S2. Roll20 OGL consente accesso diretto ai passaggi, S6.                                             | Un percorso guidato con sezioni direttamente raggiungibili permette di completare o correggere senza rifare tutto. Nomi e stati delle nostre sezioni sono adattamenti; nessun obbligo di usare un generatore rapido o scelte automatiche. |
| **CRE-02 — Fonti, Apri in Biblioteca, Contenuti della campagna, Visibilità**           | Beyond Home espone fonti e privacy, S2/S3; la scelta di fonti conserva opzioni precedenti, S4.                                                                 | Mostrare origine, edizione e disponibilità prima della scelta evita mescolare catalogo personale e accordi del gruppo. Baseline 2024 e I-065–I-067 prevalgono; non adottiamo tutte le categorie attive per default di Beyond.             |
| **CRE-03 — Scegli classe/livello, Background, Specie**                                 | Beyond documenta classe/livello e scelte associate, S2. Roll20 2024 documenta opzioni di classe, specie e background, S5.                                      | Ogni scelta apre il proprio dettaglio e le dipendenze pertinenti. Ordine di compilazione flessibile; ordine delle classi nella storia del personaggio distinto. Non si trasferiscono formule o sottoclassi iniziali dalle guide 2014.     |
| **CRE-04 — Metodo punteggi, Assegna, Tira, Registra dadi, Inserisci valori**           | Roll20 2024 documenta serie, punti, tiro e manuale, S5; Beyond metodi, S2. Numeri dalla SRD 5.2.1, S10.                                                        | Conteggi leggibili e nessuna assegnazione automatica alla classe, I-171. Fisico/digitale e conservazione dei risultati sono adattamenti I-027/I-032; visibilità in chat della guida OGL non adottata.                                     |
| **CRE-05 — Scegli opzione, Mostra anche gli altri, Deroga talenti, Rivedi dipendenze** | Roll20 2024 segnala omissioni nel riepilogo e nelle sottosezioni, S5/S7. I-059/I-060 fissano filtro e deroga dei talenti.                                      | Distinguere dato mancante, requisito fallito e requisito ignoto evita false convalide. La deroga individuale non diventa un interruttore per ogni regola, né richiede un nuovo permesso digitale del DM.                                  |
| **CRE-06 — Magie, Apri dettaglio, Scegli/prepara**                                     | Beyond integra magie nel builder, S2; contratto MAG.                                                                                                           | La scelta conserva la capacità che concede ogni magia e usa MAG-01–MAG-06. Consultazione, conoscenza/preparazione e disponibilità degli slot non si confondono. Non si lancia dal builder.                                                |
| **CRE-07 — Dotazione, Acquisti iniziali, Aggiungi manualmente, Rimuovi dalla bozza**   | Beyond Starting Equipment o aggiunta manuale, S2; Roll20 2024 rilascia Starting Equipment il 10/10/2024, S7; R149 documenta negozi iniziali di moduli Foundry. | Riepilogo unico di oggetti e monete, senza mercante obbligatorio. Antiduplicazione, cambi di metodo e conferma sono nostri raccordi; non adottiamo autoequipaggiamento Quickbuilder 2026, S8.                                             |
| **CRE-08 — Ricostruisci, Dato noto, Totale manuale, Confronta con originale**          | Beyond permette livello e input manuali, S2; Roll20 2024 consente ricostruzione manuale e contenuti personalizzati, S9. I-053/I-054 fissano il caso cartaceo.  | Acquisire lo stato attuale senza inventare contributi o regalare dotazioni. Una storia ignota resta ignota; il totale manuale è sostituzione riconoscibile, non bonus.                                                                    |
| **CRE-09 — Personaggi pronti, Anteprima, Usa come base**                               | Beyond Premade consente anteprima, acquisizione personale e modifica, S1.                                                                                      | Copia personale modificabile con provenienza/versione della base; accelera l'ingresso senza imporre una build. Il nostro catalogo e le sue licenze non sono il catalogo Beyond.                                                           |
| **CRE-10 — Importa, Scegli sorgente supportata, Esamina dati, Correggi**               | I-116/R093 documentano importazione assistita tramite DDB Importer, Alchemy e LegendKeeper, con ambiti diversi.                                                | Anteprima su nuova bozza e dichiarazione delle lacune: conserva l'originale e impedisce sostituzioni implicite. Nessun formato, integrazione o riconoscimento automatico universale dedotti.                                              |
| **CRE-11 — Salva bozza, Riprendi, Scarta, Riepilogo, Crea scheda**                     | Roll20 OGL documenta Save and Exit, ripresa, Review/Apply, S6; review nuovo builder 2024, S5.                                                                  | Conservazione del lavoro distinta dalla creazione effettiva, I-055/I-056 estesi al raccordo iniziale. Non adottiamo perdita del passo alla X o sovrascrittura integrale della scheda descritte nella guida storica.                       |
| **CRE-12 — Torna all'origine, Riprova, Rivedi conflitto**                              | Ritorno alla scheda/campagna in Beyond, S2; NAV-07–NAV-11 e I-114 danno il contratto locale.                                                                   | Ripresa con stato e permessi correnti, senza applicare due volte. Rete, revoche e conflitti sotto sono adattamenti del prodotto, non garanzie dimostrate nei concorrenti.                                                                 |
| **CRE-13 — Scegli spunto, Tira spunto, Registra risultato, Riscrivi, Salta**           | Roll20 Legacy offre Choose/Roll per tratti, ideali, legami e difetti, S11/R152; Beyond colloca i dati narrativi nel Background, S2.                            | Aiuto facoltativo e testo libero secondo I-175; dadi fisici/digitali quando la raccolta li prevede. Nessuna biografia obbligatoria, bonus o trama scelti dall’app. Non attribuito al builder 2024.                                        |

## CRE-01/02 — ingresso, sezioni, fonti e dati personali

**Crea personaggio** apre una bozza nuova. Nessun nome narrativo o ritratto è
necessario per iniziare; un titolo provvisorio riconoscibile permette di
ritrovarla. Aiuto breve disponibile nel contesto, espandibile senza scegliere
un profilo permanente «principiante». Si mostrano destinazione personale o
campagna pertinente, regole 2024 e provenienza delle opzioni consultate.

L'elenco delle sezioni indica **Da completare**, **Completa**, **Da rivedere** o
**Non pertinente**, con testo e motivo, non soltanto colore. Avanti/Indietro
seguono l'ordine sotto; il nome della sezione permette accesso diretto. Tornare
indietro conserva le scelte. L'aiuto e la lettura del catalogo non modificano
la bozza.

| Sezione               | Input e informazioni                                                                                                                                      | Scelta completata quando                                                                                                                           |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identità e fonti      | Nome/ritratto facoltativi, contesto personale/campagna, riferimenti abilitati, visibilità pertinente; modalità nuova/ricostruita/importata riconoscibile. | È noto il contesto e non c'è un conflitto di fonte presentato come risolto. Nessuna biografia obbligatoria.                                        |
| Classi e livelli      | Classe, livello attuale per classe, totale, classe iniziale e scelte ai livelli pertinenti; PE/milestone secondo ADV.                                     | Livelli numerici validi; le scelte richieste al livello attuale sono risolte o esplicitamente indicate come ignote nella ricostruzione.            |
| Background e specie   | Selezione separata, origine delle capacità, varianti e opzioni richieste; aumenti del background legati alle caratteristiche.                             | Sono state affrontate le scelte pertinenti della versione selezionata, senza sommare due versioni omonime.                                         |
| Caratteristiche       | Metodo, sei valori base, assegnazione e contributi; eventuali totali manuali distinti.                                                                    | Conteggi coerenti col metodo scelto o valore manuale dichiarato; nessun campo vuoto interpretato come zero.                                        |
| Competenze e capacità | Scelte di abilità, strumenti, lingue, talenti, capacità e altre selezioni concesse; origine e quantità richieste.                                         | Ogni scelta richiesta è riconoscibile, inclusi duplicati e requisiti da rivedere. Non si aggiungono competenze per il solo possesso di un oggetto. |
| Magie                 | Le selezioni delle capacità attuali secondo MAG; eventuali liste utili.                                                                                   | Sono risolte le scelte previste dalla capacità; nessun numero universale di magie per tutti.                                                       |
| Equipaggiamento       | Dotazioni di classe/background oppure acquisti previsti, quantità, monete; dati reali nel ramo ricostruito.                                               | Opzioni alternative e conteggi non si sommano impropriamente; stato equipaggiato separato dal possesso.                                            |
| Storia                | Descrizione, legami e spunti facoltativi; collegamento agli Appunti Solo io.                                                                              | La sezione può essere lasciata vuota. Appunti privati non vengono copiati nella biografia condivisa.                                               |
| Riepilogo             | Dati correnti, scelte mancanti, fonti, manualità, avvisi, oggetti e risorse iniziali.                                                                     | CRE-11 distingue conferma della scheda, bozza incompleta e ricostruzione non interamente verificabile.                                             |

**Apri in Biblioteca** conserva sezione e scelta di ritorno. Un'opzione espone
nome, tipo, fonte, edizione/revisione e disponibilità: **Utilizzabile qui**,
**Non abilitata per questa campagna**, **Non disponibile** o **Compatibilità da
verificare**. Le ultime due non sono la stessa cosa. Il testo non disponibile
non viene ricostruito dal solo nome. Si può leggere ciò che è accessibile
senza aggiungerlo alla scheda.

**Crea opzione mancante** conduce all'homebrew già previsto, I-061–I-064, poi
ritorna alla scelta; non interpreta automaticamente qualsiasi testo libero.
La copia della definizione usata conserva la revisione: modifica in Biblioteca
non aggiorna silenziosamente la scheda, I-067. Creare o scegliere una base non
pubblica niente e non abilita contenuti per tutta la campagna. L'autorità del
DM sul catalogo comune resta I-066; la matrice completa delle revoche non si
inventa qui.

## CRE-03/05 — scelte dipendenti, requisiti e limiti

**Scegli** modifica la bozza, non applica capacità a un personaggio già attivo.
Il dettaglio distingue ciò che viene concesso direttamente da ciò che richiede
una scelta. Una sottoclasse appare come scelta al livello previsto dalla
classe/revisione; una scelta futura non blocca una creazione di livello inferiore.
Multiclasse e ordine delle classi seguono ADV: la lista di classi attuali non
è da sola una storia ricostruita.

Cambiare classe, background, specie, fonte o livello produce un riepilogo delle
dipendenze diventate da rivedere. I dati scelti restano rintracciabili nella
bozza e si può tornare alla scelta precedente; non si mantengono come benefici
validi, non si sostituiscono automaticamente e non si cancellano oggetti
aggiunti manualmente per effetto di una dotazione cambiata.

Per i talenti, la lista iniziale comprende i requisiti soddisfatti; **Mostra
anche gli altri** espone requisiti mancanti e quelli ancora ignoti con motivi
separati, I-059. **Deroga ai requisiti dei talenti** è esplicita, riconoscibile
nel riepilogo e disattivabile; non chiede un nuovo consenso digitale del DM,
I-060. Riattivare il controllo segnala le scelte irregolari senza rimuoverle
silenziosamente. La deroga non concede slot aggiuntivi, disponibilità di un
contenuto o accesso alle regole, e non si estende al multiclasse.

Input malformati, valori oltre il metodo scelto e quantità negative restano
errori accanto al campo. **Non conosco questo dato**, dove pertinente alla
ricostruzione, produce invece un dato ignoto e un limite di calcolo. La
validazione non può equiparare «ignoto» a zero, falso, fallito o autorizzato.

## CRE-04 — punteggi e dadi

Il metodo del tavolo è mostrato quando noto; altrimenti si sceglie il metodo.
Non si impone silenziosamente un default di gruppo, né si richiede un DM
digitale nell'uso personale. Le regole standard sotto provengono dalla SRD 5.2.1,
non dai valori numerici delle guide UI. Un metodo personalizzato conserva
origine dichiarata e non viene certificato come SRD.

| Metodo standard selezionato | Comportamento                                                                                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Serie                       | Disponibili 15, 14, 13, 12, 10, 8. **Assegna** associa una voce a una delle sei caratteristiche; una voce non si usa due volte. **Scambia** modifica l'assegnazione, non i valori.                                                          |
| Punti                       | 27 punti disponibili; punteggi base 8–15. Costi per 8/9/10/11/12/13/14/15: 0/1/2/3/4/5/7/9. Mostrare spesa e residuo a ogni modifica; impedire spesa superiore al budget nel metodo standard, segnalare punti non assegnati nel riepilogo.  |
| Dadi                        | Sei gruppi di 4d6, scartando il minimo in ciascun gruppo, poi assegnazione delle sei somme. **Tira** digitale o **Registra dadi fisici** con quattro valori interi 1–6 e scarto visibile per gruppo.                                        |
| Inserimento diretto         | Sei valori digitati con origine dichiarata. Un risultato già noto può essere registrato senza inventare i dadi sottostanti; non si dichiara verificato come tiro 4d6. Totale finale sostitutivo usa CRE-08/I-054, separato dal valore base. |

I risultati ottenuti rimangono nella bozza e non cambiano tornando alla
sezione, salvando o riprendendo. Campo fisico vuoto o dado fuori intervallo
non produce una somma valida. **Correggi registrazione** conserva dato precedente
e motivo pertinente; un nuovo tiro è distinto dalla correzione e segue il
metodo concordato, non un vantaggio concesso dalla navigazione.

**Cambia metodo** mostra valori e assegnazioni che verranno sostituiti e chiede
una scelta esplicita fra proseguire e mantenere il metodo attuale; gli esiti
precedenti non sono riscritti retroattivamente come tiri del nuovo metodo.
Nessuna pubblicazione automatica nel Game Log condiviso: visibilità dei dati
segue il contesto autorizzato e l'eventuale richiesta del tavolo.

Gli aumenti del background 2024 sono contributi separati: +2 a una e +1 a
un'altra delle tre caratteristiche indicate, oppure +1 a tutte e tre; nessun
aumento oltre 20 con questo passaggio. I contributi futuri o di altre fonti
restano separati. Non assegnare automaticamente la serie alla classe.

## CRE-06/07 — magie ed equipaggiamento senza doppie applicazioni

La sezione Magie usa MAG per ricerca, origine, disponibilità, scelte e
preparazione. Una classe senza incantesimi può avere una capacità magica da
altra fonte: **Non pertinente** si decide dai dati, non solo dal nome della
classe. Slot, magie preparate/conosciute e usi di capacità non diventano un
unico contatore. Aprire la sezione non consuma risorse; il builder non lancia
magie. Il loro uso si avvia dalla scheda personale o dal Tavolo pertinente.

**Dotazione** presenta le alternative ammesse della classe e del background
selezionati; ciascuna origine ha la propria scelta e non concede sia il pacco
sia il suo oro alternativo. **Acquisti iniziali** mostra budget dichiarato,
prezzi disponibili, quantità, subtotali e monete residue. **Rimuovi dalla
bozza** ripristina il budget solo di un acquisto in quella bozza, non inventa
una vendita o rimborso nel mondo di gioco. Beni manuali e regali dichiarati
mantengono un'origine distinta dagli acquisti.

Cambiare dotazione sostituisce la proposta collegata a quella origine: non
aggiunge una seconda copia ogni volta che si torna alla sezione. Cambiare
classe o fonte rivalida scelte e conteggi; gli acquisti incompatibili restano
da sistemare, non si pagano di nuovo in background. L'anteprima di pacchi
mostra le quantità e gli eventuali contenitori secondo INV-03.

Alla creazione, l'elenco finale entra una sola volta nell'inventario. **Equipaggia**
e sintonia restano scelte esplicite INV-04/05; l'acquisto non concede competenza,
mani disponibili o bonus di un oggetto non attivo. Dotazioni di livello superiore
e ricompense dipendono dalla situazione concordata; la tabella SRD per iniziare
ad alto livello è guida per il DM, non un regalo automatico a ogni ricostruzione.

## CRE-13 — storia e spunti facoltativi

**Scegli spunto** apre suggerimenti per tratti, ideali, legami e difetti dalla
raccolta pertinente disponibile, con fonte/revisione riconoscibili. **Tira
spunto** è disponibile quando quella raccolta definisce un’estrazione: mostra
il dado e la tabella usata, poi il risultato digitale oppure **Registra
risultato** del dado fisico. Input vuoto o fuori intervallo non seleziona uno
spunto. Non si usa automaticamente la formula dei punteggi di CRE-04.

Lo spunto scelto/ottenuto entra nella bozza narrativa ed è **Riscrivibile**
liberamente; una nuova selezione o estrazione non sostituisce un testo già
personalizzato senza una scelta esplicita. **Salta** lascia la storia vuota e
permette di riprenderla dalla scheda. I risultati narrativi non assegnano
ispirazione o altri benefici meccanici.

Cambiare il background meccanico può cambiare i suggerimenti proposti, ma
conserva descrizione, storia e testo personale già scritti. La narrazione non
cambia retroattivamente le competenze del background. Appunti **Solo io**
restano separati: scegliere, tirare o riscrivere non pubblica il contenuto.
Catalogo degli spunti, licenze e privacy per singolo campo restano lacune
nominate, senza autore AI o compilazione narrativa obbligatoria.

## CRE-08 — ricostruzione al livello e allo stato attuali

**Ricostruisci una scheda** richiede prima ciò che si sa: classi/livelli,
caratteristiche, scelte note, equipaggiamento e risorse attuali. La ricostruzione
assistita propone le selezioni pertinenti al livello, ma non simula di nuovo
ogni passato tiro di dado, tesoro o riposo. Dove l'ordine multiclass non è noto,
resta segnalato: non si attribuiscono a caso competenze o PF della classe iniziale.

**Imposta totale manuale** per una caratteristica conserva il valore noto,
esempio Forza 18, prevalendo sul calcolato. Il dettaglio mostra separatamente
valore manuale, risultato calcolabile e contributi mancanti; non aggiunge il 18
al punteggio base. **Torna al calcolo** mostra il risultato e le dipendenze
prima di togliere la sostituzione. Gli effetti sui successivi aumenti sono ADV.
Non estendere per deduzione la stessa sostituzione a ogni statistica.

**Confronta con originale** è un riepilogo per il giocatore: valore riportato,
valore ricostruito, differenza e dato da controllare. Non presuppone lettura
ottica di carta/PDF. Un dato non rappresentabile può rimanere annotato come
limite dichiarato; non riceve un'automazione falsa.

Distinguere PF massimi, attuali e temporanei, Dadi Vita e risorse già spesi,
condizioni ed eventuale concentrazione nota. Lo stato noto viene conservato;
quello ignoto resta segnalato. **Completa dati attuali** è disponibile prima
della conferma. **Ricostruisci** non concede riposo, slot pieni o dotazione
iniziale aggiuntiva. Per un personaggio nuovo al primo livello i PF massimi
seguono dado massimo della classe iniziale più Costituzione; lo stato iniziale
applicato è comunque leggibile nel riepilogo. Dopo il primo livello, PF,
multiclasse e scelta PE/milestone seguono ADV.

## CRE-09 — base pronta

La raccolta permette ricerca e filtri pertinenti per classe/livello/fonte,
con anteprima di caratteristiche, capacità, magie, inventario, versione e
visibilità. Non obbliga a scegliere una classe prima di consultarla.
**Usa come base** crea una bozza personale indipendente; non modifica il
modello e non rivendica una scheda già affidata a un altro giocatore.

La bozza può essere confermata attraverso lo stesso riepilogo oppure cambiata
in una qualsiasi sezione. Revisioni successive del modello non si propagano
alla scheda. Se una fonte non è disponibile o ammessa, mostrarlo prima della
creazione effettiva; scegliere la base non la abilita. Ritratto e storia sono
facoltativi e devono avere provenienza riutilizzabile: nessun asset concorrente
copiato nel nostro catalogo. Contenuti concreti e manutenzione EN/IT restano
lavoro del catalogo, non una lista inventata qui.

## CRE-10 — importazione assistita

**Importa** mostra soltanto sorgenti/formati effettivamente supportati, con
versioni, dati recuperabili, parti escluse e requisiti di accesso. Qui non è
promesso nessun connettore specifico. Se nessuno soddisfa il caso, restano
**Ricostruisci** e inserimento manuale senza simulare una conversione.

Selezionare il file o collegamento supportato porta a una nuova bozza e a
**Esamina dati**: riconosciuti, ambigui, mancanti, incompatibili e non trasferiti.
L'origine conservata distingue valori letti, equivalenze confermate e
correzioni manuali. Un'opzione 2014 non diventa 2024 perché esiste una voce
omonima; contenuti mancanti non vengono sostituiti con i primi risultati.

Il riepilogo conserva anche ciò che non si è importato e permette di
correggere i dati rappresentabili. Dati privati non sono messi per default
nella biografia condivisa o pubblicati. Un possibile duplicato è segnalato;
**Apri scheda esistente** evita di proseguire inutilmente. Aggiornamento o
fusione in una scheda esistente non si deducono da questo ingresso e rimangono
fuori dal percorso ordinario finché definiti.

**Annulla importazione** scarta il tentativo, non modifica l'originale esterno.
Errore di formato/accesso mostra il motivo senza creare una scheda parziale
spacciata per completa. Un tentativo incerto non avvia un secondo import
silenzioso. Nessuna sincronizzazione continua con la fonte dopo la creazione.

## CRE-11 — bozza, riepilogo e conferma

**Salva bozza ed esci** conserva le scelte e la sezione; **Riprendi bozza**
riapre quel lavoro. Lo stato distingue salvato, salvataggio in corso, errore
e solo sul dispositivo. Cambiare sezione conserva i campi in bozza; non si
promette sincronizzazione prima della conferma del salvataggio. **Scarta bozza**
mostra quale lavoro sarà eliminato e richiede uno scarto esplicito.

Esc/chiusura di un dettaglio torna alla sezione. Uscire dal builder non
applica né scarta implicitamente: se il lavoro non è conservato, offrire
salvataggio, ritorno o scarto; niente richiesta ripetitiva se già salvato.
La modalità bozza permette dati incompleti senza falsi messaggi di successo.

**Riepilogo** raccoglie identità provvisoria/definitiva, classi/livelli,
caratteristiche con contributi/manualità, capacità/competenze, magie, inventario,
monete, risorse correnti, fonti e disponibilità. Ogni problema ha **Vai alla
scelta**. Errori di formato e scelte strutturali mancanti nel ramo nuovo
rendono **Crea scheda** non disponibile nel ramo nuovo, con il motivo e il
collegamento alla sezione da completare; la bozza è comunque salvabile. Un campo narrativo vuoto non blocca. Le deroghe previste sono
riconoscibili e non diventano un generico «ignora tutti gli errori».

Nella ricostruzione/importazione, **Crea scheda con dati da verificare** è
possibile quando i dati noti sono rappresentabili e le lacune sono esplicite:
non inventa scelte e non abilita calcoli che richiedono dati ignoti. La scheda
conserva la segnalazione e il percorso per completarla. Questo è adattamento
a I-053/I-054/I-116, non una certificazione di regolarità o un bypass dei
contenuti della campagna.

**Crea scheda** applica il riepilogo una volta e apre la scheda. Nessuna
conferma per ciascun singolo campo; un doppio clic o una ripetizione dopo
attesa non crea due personaggi né due dotazioni. Un esito incerto richiede
prima il recupero dello stato dell'operazione. Dopo la creazione la correzione
segue I-028/ADV/INV/MAG: non riavvolge eventi condivisi avvenuti nel frattempo.

## CRE-12 — permessi, conflitti, rete e rientro

La modifica strutturale segue i permessi effettivi della scheda, non il solo
nome «DM» o «co-DM». Una scheda in sola lettura non offre comandi di modifica;
un nuovo permesso non viene concesso perché si è arrivati da un link diretto.
Il controllore autorizzato può creare/modificare nei limiti acquisiti,
I-041/I-043; ciò non concede proprietà, cancellazione o lettura degli Appunti
Solo io. Diritti dei co-DM, trasferimento e pubblicazione restano specifiche
separate.

Una bozza nuova non cambia la scheda già in gioco. Se il percorso è usato per
ricostruire/rivedere una scheda esistente, non sovrascrive PF, slot, inventario,
effetti o condizioni cambiati nel frattempo: il confronto e l'applicazione
seguono ADV. L'aggiornamento delle definizioni richiede revisione esplicita;
non invalida in silenzio la partita aperta.

Senza rete si può proseguire sui dati già disponibili e autorizzati, I-114;
contenuti non presenti non si fingono consultabili. Salvato localmente e
sincronizzato sono stati distinti. Al ritorno della rete si verificano stato,
versione e permessi prima di applicare: nessun livello, import o ingresso in
campagna eseguito silenziosamente. Durata, quote e modalità tecnica del
salvataggio offline non sono decise da questa specifica.

Revoca durante la modifica interrompe le scritture non più autorizzate e non
continua a esporre dati revocati. Il recupero di materiale personale non
revocato resta distinto dalla copia dei segreti della campagna. Riconciliazione
multiutente e politica completa sulle copie locali rimangono lacune specifiche.

Il rientro offre **Apri scheda** e **Torna all'origine**. Campagna/Tavolo
compaiono solo nel contesto accessibile; l'invito non ancora accettato rimane
un invito. Cambio scena, turno o permesso nel frattempo mostra lo stato corrente.
Aprire la scheda non termina un turno o una richiesta pendente, NAV/TABLE.

## Casi sintetici del contratto

Sono esempi di accettazione concettuale, non test eseguiti di un prodotto.

| Caso    | Stato e input                                                                                                              | Risultato atteso                                                                                                                                                                           |
| ------- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CRE-01  | Uso personale, nessuna campagna; Crea, passa da Classi a Storia e torna.                                                   | Stessa bozza e scelte conservate; storia vuota ammessa, nessun DM richiesto.                                                                                                               |
| CRE-02  | Due opzioni omonime 2014/2024; la prima non è abilitata nel gruppo.                                                        | Fonti distinguibili; consultazione pertinente; nessuna conversione o abilitazione silenziosa.                                                                                              |
| CRE-03  | Personaggio livello 1; la versione di classe concede la sottoclasse più avanti.                                            | Sottoclasse futura indicata, non richiesta come scelta mancante del primo livello.                                                                                                         |
| CRE-04a | Point buy: 15/15/15/8/8/8; tenta di alzare un 8 a 9.                                                                       | 27 punti già spesi; costo ulteriore visibile e scelta non accettata nel metodo standard.                                                                                                   |
| CRE-04b | Gruppo fisico 6/5/2/1, poi un campo vuoto nella seconda serie; salva e riprende.                                           | Prima somma 13 con 1 scartato; seconda incompleta; nessun nuovo tiro o zero implicito.                                                                                                     |
| CRE-05  | Talento con requisito ignoto; Mostra anche gli altri, poi deroga esplicita del giocatore.                                  | Ignoto distinto da fallito; deroga riconoscibile per talenti, nessuna disattivazione del requisito multiclass.                                                                             |
| CRE-06  | Magia concessa da talento su classe non incantatrice.                                                                      | Sezione pertinente con origine corretta; non concede slot di classe o lancia automaticamente.                                                                                              |
| CRE-07  | Sceglie pacco A, torna indietro, cambia in oro alternativo, riapre Riepilogo due volte.                                    | Una sola dotazione finale; pacco non sommato all'oro; beni manuali distinti, nessun autoequipaggiamento.                                                                                   |
| CRE-08  | Guerriero 7, Forza 18 nota, storia degli aumenti ignota, PF attuali e usi di capacità già consumati riportati.             | 18 è totale manuale; nessuna storia inventata, riposo o nuova dotazione; dati non pertinenti non creano capacità.                                                                          |
| CRE-09  | Anteprima base pronta, Usa come base, cambia nome e un'opzione.                                                            | Bozza indipendente; modello intatto; rivalidazione della scelta, nessun ingresso automatico nel gruppo.                                                                                    |
| CRE-10  | Fonte supportata riconosce classi e inventario ma non una capacità; annulla.                                               | Lacuna esplicita in anteprima; originale intatto e nessuna scheda definitiva creata.                                                                                                       |
| CRE-11  | Bozza completa, doppio clic su Crea; rete interrompe la risposta.                                                          | Si recupera l'esito della stessa creazione prima di ripetere; al massimo una scheda e una dotazione.                                                                                       |
| CRE-12  | Bozza di revisione aperta mentre la scheda giocata perde PF; poi viene revocato il controllo.                              | Nessuna sovrascrittura dei PF o applicazione dopo revoca; stato corrente e recupero autorizzato distinti.                                                                                  |
| CRE-13  | Sceglie o tira uno spunto da una raccolta con dado dichiarato, lo riscrive e cambia background; poi Salta gli altri campi. | Testo personale conservato, nuove proposte separate, campi restanti vuoti ammessi; nessun beneficio o pubblicazione automatica. Un input fisico invalido lascia lo spunto non selezionato. |

## Lacune residue specifiche

- Catalogo effettivo di basi pronte, copertura EN/IT e manutenzione delle
  revisioni; questa specifica non promette tutte le combinazioni pubblicate.
- Sorgenti/formati/versioni da supportare nell'importazione, licenze, mapping,
  allegati privati, riconoscimento dei duplicati e aggiornamenti di schede
  esistenti. F-028 rimane parziale; non c'è un importatore implementato.
- Matrice completa di proprietà/controllo/co-DM, contenuti revocati già usati e
  recupero delle copie locali; il comportamento di arresto delle scritture
  non sostituisce tale specifica.
- Riconciliazione di scelte homebrew non strutturate, compatibilità puntuale di
  opzioni precedenti e dipendenze non rappresentabili; nessun motore2014
  completo o interprete universale implicito.
- Numero/durata delle bozze, piani alternativi, risoluzione dettagliata dei
  conflitti multiutente/offline e continuità sui diversi dispositivi. I casi
  ordinari hanno esito definito; questi aspetti richiedono il contratto rete/dati.
- Usabilità reale, resa mobile, navigazione assistiva e traduzioni da verificare
  quando esiste il prodotto. I casi sintetici non sono prove d'uso umano.

## Fonti R179 — revisioni e controevidenze

Ricerca del 23/09/2026, per I-213. Nessun login, personaggio reale, importazione,
installazione o test dei builder. Documentazione primaria pubblica e regole
ufficiali locali; riusati R038–R044/R093/R147–R149. Nessun numero di build
attribuito alle pagine web. Fonti e adattamenti sono collegati ai gruppi CRE.

- **S1 — Beyond, [Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods)**,
  aggiornata 24/03/2026: Standard, Quickbuilder e Premade. La descrizione
  «Beginner box» è superata dal changelog 14/04/2026: l'aiuto rimane, la casella
  iniziale è rimossa. Non riprodurre quella casella come UI corrente.
- **S2 — Beyond, [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections)**,
  aggiornata 27/08/2025: sezioni, fonti, livelli, manualità e dotazione.
  Contiene ancora testo sull'export futuro «beta»: valida come precedente
  circoscritto, non inventario affidabile dell'interfaccia corrente completa.
- **S3 — Beyond, [Enabling Content Categories](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747201820948-Enabling-Content-Categories-for-your-Character-Sheet)**,
  aggiornata 11/11/2025, verificata dal coordinatore nello stesso blocco: fonti
  da Home o Manage/Character Settings, categorie e partner. Il default Standard
  con tutte le categorie attive non viene importato: nostro contesto 2024 e
  accordi della campagna. Non dimostra un'autorizzazione digitale per ogni uso.
- **S4 — Beyond, [2024 Ruleset Changelog Update](https://www.dndbeyond.com/posts/1806-2024-d-d-beyond-ruleset-changelog-update)**,
  26/08/2024, verificato dal coordinatore: revisione della migrazione implicita
  dopo feedback; opzioni e scelta delle fonti conservate. Controevidenza alla
  tesi che ogni comportamento iniziale del concorrente sia da adottare.
- **S5 — Roll20, [Play D&D 2024 Your Way](https://blog.roll20.net/posts/play-dd-2024-your-way-on-roll20/)**,
  17/09/2024: review con omissioni e quattro metodi dei punteggi. L'avanzamento
  era annunciato futuro in quel testo: non usarlo per lo stato attuale.
- **S6 — Roll20, [D&D 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer)**,
  10/11/2021, generazione OGL: navigazione per sezioni, Save and Exit/ripresa,
  Review/Apply. Non fonte di regole 2024. Non adottate perdita del passo corrente
  chiudendo X e sostituzione integrale dei dati all'applicazione.
- **S7 — Roll20, [2024 Change Log](https://help.roll20.net/hc/en-us/articles/34086640235927-2024-Change-Log)**:
  30/09/2024 indicatori delle scelte nelle sottosezioni; 10/10/2024 avanzamento
  e dotazione; 05/11/2024 correzione del falso completamento senza aumenti delle
  caratteristiche. Sono rilasci storici, non prova di assenza di bug oggi.
- **S8 — Beyond, [Changelog](https://www.dndbeyond.com/changelog)**,
  14/04/2026: rimozione della casella Beginner con aiuto conservato e
  autoequipaggiamento Quickbuilder. Il secondo non è adottato, I-172/INV.
  [Behind the Screen](https://www.dndbeyond.com/posts/2135-behind-the-screen-the-new-quickbuilder-and-future),
  24/03/2026: Quickbuilder rilasciato, gran parte del video sul builder completo
  esplicitamente ancora concetto. Non presentare aspirazioni come capacità
  pubblicate o i test dell'azienda come test del nostro prodotto.
- **S9 — Roll20, [D&D Homebrew Character Builder Is Here](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/)**,
  19/11/2025: opzioni manuali, capacità per livello e modelli duplicabili prima
  della finalizzazione. Uso come precedente di flessibilità; non dimostra
  importazione automatica, compatibilità universale o la nostra riconciliazione.
- **S10 — regola normativa: source_kind = srd; edition = 2024; revision = 5.2.1.**
  [EN ufficiale](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
  pp.21–24, Character Creation; [IT ufficiale](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf).
  Matematica verificata localmente dal ricercatore delle regole nello stesso
  blocco; SHA-256 EN `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`,
  IT `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
  Pagine IT verificate: 23 caratteristiche/metodi; 24–25 completamento e PF iniziali;
  25–26 avanzamento; 27 creazione ad alto livello. Dettaglio in ADV; le etichette
  di interfaccia non sostituiscono i termini della regola. Non si importa
  matematica da videogiochi, guide 2014 o metodi casuali d'oro storici.

- **S11 — Roll20 Legacy, [sorgente ufficiale](https://github.com/Roll20/roll20-character-sheets/blob/93a40a9e6e18d7f21b8f15c98a3b241205854393/DD5thEditionLegacy/5th%20Edition%20Legacy.html#L18106)**,
  revisione `93a40a9e6e18d7f21b8f15c98a3b241205854393`, ultimo commit del file
  13/03/2026 verificato in R152 il 20/09/2026; qui riusata tale evidenza, senza
  nuova esecuzione del sorgente. Choose/Roll per personalità, ideale, legame e
  difetto; base di I-175. Pattern UI Legacy, non regola 2024 né prova della
  medesima interazione nel builder corrente. Raccolte e libertà di riscrittura
  nel nostro contratto restano adattamenti espliciti.

**Adottato:** sezioni navigabili e aiuto vicino alle scelte; riconoscimento di
fonti/dipendenze/manualità; bozza distinta dalla scheda; riepilogo unico;
ricostruzione al livello attuale; basi pronte e import assistito nello stesso
percorso. **Adattamenti propri:** antiduplicazione, conservazione dei dati
ignoti e dello stato giocato, conflitti/revoche e ritorni NAV. È una sintesi
motivata, non dimostrazione empirica di ottimalità. I-213 e R179 conservano decisione e ricerca nei rispettivi registri.
