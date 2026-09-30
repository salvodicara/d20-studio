# Personaggio — avanzare, rivedere le scelte e pianificare

23/09/2026. Contratto parziale composto dall'agente su delega I-180/I-190/I-202/I-209,
registrazione I-214/R180. Specifica i comandi del percorso acquisito in
I-055–I-057/I-122–I-125/I-169; non è approvazione dell'intero prodotto, codice o
prova di usabilità. I riferimenti pubblicati orientano le interazioni; le regole
2024 e gli adattamenti dell'app sono distinti. Nessun nuovo voto ordinario richiesto.

Collega [Personaggi](pages/characters.md), [creazione](CHARACTER_CREATION.md),
[navigazione](NAVIGATION.md), [inventario](INVENTORY_FLOW.md) e
[magie](SPELLCASTING_FLOW.md). La stessa scheda funziona senza campagna digitale,
I-052; non serve ricostruire tutta la carriera per usarne un livello già acquisito.

## Ingresso e risultato

**Scheda → Avanza / Rivedi scelte / Piano futuro → scelte e differenze →
Rivedi → Applica oppure Salva bozza → stessa scheda → ritorno al Tavolo o all'origine.**
Sono tre intenzioni distinte, non tre copie del personaggio:

- **Avanza** prepara uno o più livelli realmente da acquisire, con scelte ordinate
  per livello. Fino ad **Applica** la scheda giocata conserva il livello applicato.
- **Rivedi scelte** prepara cambiamenti alla costruzione già applicata, anche
  classe/sottoclasse, senza cancellare storia, equipaggiamento o partita.
- **Piano futuro** conserva intenzioni per livelli non ancora acquisiti; non
  concede capacità, PF, slot, preparazione o oggetti e non conta come avanzamento.

La testata mostra personaggio, livello totale attuale/proposto e stato **Bozza**,
**Salvato sul dispositivo**, **Sincronizzato** o **Da riconciliare**, secondo il caso.
Si può tornare alla scheda attiva per giocare e riaprire la bozza dal punto salvato.
Un piano futuro resta raggiungibile anche senza PE o campagna associata.

## Provenienza delle scelte di interazione

Fonti consultate il **23/09/2026**, salvo il riuso R101/R146 indicato.
Si tratta di documentazione primaria pubblica e PDF ufficiali: nessun account,
runtime o test umano dei concorrenti. Le wiki sono pagine mobili, non revisioni
immutabili del prodotto. «Documentato» non significa «ottimo dimostrato».

| Gruppo e comandi                                                                       | Prodotto, comportamento verificato, fonte                                                                                                                                                                                                                                                                    | Versione/data e limite                                                                                               | Scelta adottata e motivo                                                                                              | Adattamento o lacuna                                                                                                                                               |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **ADV-01 — Avanza, Registra PE, Assegna PE, Registra traguardo**                       | Beyond [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections) distingue XP/milestone. Foundry dnd5e [Awards](https://github.com/foundryvtt/dnd5e/wiki/Awards) permette destinatari, totale diviso o importo per destinatario.                            | Beyond aggiornato 27/08/2025, build assente; wiki 10/09/2026, dichiara sistema 6.0.0, non core.                      | Rendere leggibile il metodo e l'assegnazione senza fare calcoli mentali; PE e milestone restano entrambi disponibili. | Niente livello automatico, punti fittizi, premio da uccisione automatico o nuovo gate DM. Ripartizione finale e correzioni sono raccordi I-122/I-123.              |
| **ADV-02 — Aumenta questa classe, Aggiungi classe, Dettagli requisiti**                | Beyond [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections): livello, multiclasse e scelte per classe.                                                                                                                                                 | 27/08/2025; nessuna verifica della UI autenticata.                                                                   | Classe attuale in primo piano, altra classe su richiesta: rende semplice il caso comune e disponibile I-169.          | Matematica e requisiti vengono dallo SRD 5.2.1 sotto, non dalla UI o dalle regole di BG3.                                                                          |
| **ADV-03 — Metodo PF, Tira, Inserisci risultato, Dettagli PF**                         | Foundry dnd5e [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement) conserva valori PF per livello, con tiro o media. Beyond documenta Fixed/Manual nel [builder](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections).                                     | Wiki aggiornata 10/09/2026, sistema 6.0.0; Beyond come sopra.                                                        | Esporre contributi per livello e metodo evita confondere tiro, modificatore e totale.                                 | Dadi fisici/digitali e totali manuali seguono le decisioni locali; conservazione dei PF attuali non è comportamento verificato di quei prodotti.                   |
| **ADV-04 — Scegli privilegio/talento, Mantieni totale manuale, Rimuovi sostituzione**  | Foundry dnd5e [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement) distingue aumenti, scelte, concessioni e valori dipendenti dal livello.                                                                                                                                                    | Sistema 6.0.0; non prova qualsiasi contenuto o combinazione homebrew.                                                | Mostrare la capacità che richiede ogni scelta e i valori cambiati permette di capirne l'origine.                      | I-054 conserva il totale sostitutivo; l'app non lo trasforma in bonus né lo cancella all'avanzamento.                                                              |
| **ADV-05 — Gestisci magie, Rivedi risorse**                                            | Beyond [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections): magie nella sezione classe; Foundry [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement): scelte/concessioni anche di incantesimi.                                         | Date/versioni sopra; nessuna garanzia pubblicata di riconciliazione dei consumi durante la bozza.                    | Riprendere MAG, separando capacità ottenute e risorse disponibili, rende leggibile l'effetto reale del livello.       | Conservare consumi, concentrazione e risorse vive è adattamento nostro, non un recupero stabilito dallo SRD.                                                       |
| **ADV-06 — Salva bozza, Riprendi, Torna alla scheda, Scarta bozza**                    | Roll20 [Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer) documenta Save and Exit, ripresa e uscita scartando.                                                                                                                                                 | 10/11/2021, vecchia scheda 5e OGL; non builder 2024.                                                                 | Ripresa senza ricominciare, adottata in I-056.                                                                        | Il limite documentato della X, che perde le modifiche correnti, non viene copiato. Bozza e scheda attiva restano distinte.                                         |
| **ADV-07 — Rivedi, Correggi sezione, Applica, Annulla modifiche**                      | Roll20 [Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer): revisione degli input richiesti e applicazione finale.                                                                                                                                              | Fonte storica sopra. La stessa pagina descrive una sovrascrittura dei dati: contro-evidenza, non modello di fusione. | Un riepilogo delle differenze e un solo comando conclusivo attuano I-055.                                             | Si applicano cambiamenti alla scheda corrente, mai una copia vecchia che cancelli la partita nel frattempo.                                                        |
| **ADV-08 — Rivedi scelte, Cambia scelta, Esamina dipendenze**                          | Foundry [Advancement User Guide](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide) documenta Modify Choices. R101 conserva il precedente BG3 del respec.                                                                                                                                      | Guida aggiornata 31/01/2024, badge 3.0.0 e riferimenti interni 1.6: storica, non UI 6.0.0.                           | Riesaminare scelte già fatte sulla stessa scheda attua I-124.                                                         | La guida avverte che modifiche manuali durante il flusso possono essere annullate: comportamento rifiutato. Nessun costo, NPC, riposo o azzeramento BG3 importato. |
| **ADV-09 — Piano futuro, Aggiungi tappa, Cambia scelta, Usa nel prossimo avanzamento** | Roll20 [D&D Homebrew Character Builder Is Here](https://blog.roll20.net/posts/dd-homebrew-character-builder-is-here/) descrive scelte future conservate dopo aver abbassato il livello nel builder, poi modificabili.                                                                                        | 19/11/2025, builder D&D 2024; build non esposta, nessun runtime.                                                     | Conservare intenzioni e riproporle al livello pertinente attua I-057.                                                 | L'app usa un piano esplicitamente separato: non richiede di alzare e abbassare la scheda giocata. Rivalidazione e assenza di benefici anticipati sono nostre.      |
| **ADV-10 — Riapri esito, Correggi, Torna all'origine, Risolvi conflitto**              | Beyond [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections) collega fine builder e scheda/campagna. La contro-evidenza della [guida Foundry](https://github.com/foundryvtt/dnd5e/wiki/Advancement-User-Guide) motiva proteggere modifiche intervenute. | Date e limiti sopra; nessuna prova di offline, priorità fra controllori o riavvolgimento completo.                   | Ritorno alla stessa scheda e differenze leggibili evitano perdere il contesto.                                        | Autorità, correzioni, offline e riconciliazione derivano da I-028/I-029/I-041/I-043/I-114 e NAV; non vengono attribuiti ai concorrenti.                            |

## Regole 2024 verificate e confine con l'app

Fonte normativa `srd`, edizione **2024**, revisione immutabile **5.2.1**:
[SRD EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)
pp. 23–26 e [SRD IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf)
pp. 25–29, verificati sulle copie locali. SHA-256 EN
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`;
IT `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
La pagina, lingua e fonte della singola capacità accompagnano le scelte; contenuti
privati/homebrew mantengono la propria provenienza e non diventano regole SRD.

| Asse                  | Regola verificata                                                                                                                                                                                                                                                                 | Implicazione per questo percorso                                                                                                                                                         |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PE e livelli          | Soglie e bonus di competenza dipendono dal livello totale; ad esempio 2.700 PE per livello 4, 6.500 per 5, bonus +3 dal 5. EN23; IT25–26.                                                                                                                                         | «Livello disponibile» nella UI distingue requisito raggiunto e scelte ancora da applicare. Il passaggio in bozza è una scelta dell'app, non una nuova condizione delle regole.           |
| PF e Dadi Vita        | Ogni nuovo livello dà un Dado Vita della classe acquisita; tiro più COS, minimo 1 al massimo PF, oppure valore fisso di classe. EN23; IT26.                                                                                                                                       | Metodi visibili, dado e modificatore separati; nuovo livello in una seconda classe non dà i PF massimi del primo livello del personaggio.                                                |
| Valori fissi          | Barbaro 7; guerriero/paladino/ranger 6; bardo/chierico/druido/monaco/ladro/warlock 5; mago/stregone 4, più modificatore COS. EN23; IT26.                                                                                                                                          | Non si usa la media del dado arrotondata liberamente né il dado della classe precedente.                                                                                                 |
| Costituzione          | Quando il modificatore aumenta di 1, il massimo PF aumenta di 1 per ogni livello acquisito. EN23; IT26.                                                                                                                                                                           | Mostrare incremento retroattivo e contributo del nuovo livello senza contarlo due volte. Vale il punteggio effettivo, anche quando sostitutivo manuale.                                  |
| Multiclasse           | Occorre almeno 13 nelle caratteristiche primarie richieste dalla nuova classe e dalle classi attuali; valgono le specifiche delle classi. EN24; IT27.                                                                                                                             | Mostrare ogni requisito e valore effettivo; la deroga talenti I-060 non autorizza automaticamente questa deroga.                                                                         |
| Livelli e concessioni | Competenze d'ingresso limitate alla voce multiclasse; privilegi al livello della singola classe. Dadi Vita di tipi diversi distinti; stesso tipo raggruppabile. EN25; IT27–28.                                                                                                    | «Guerriero 3 / Ladro 2 — totale 5» non riceve i privilegi di guerriero 5. Nessuna nuova dotazione iniziale gratuita dedotta dall'aggiunta della classe.                                  |
| Interazioni           | Calcoli alternativi della CA non si sommano; Attacco extra da classi diverse non si cumula, salvo capacità specifica. EN25; IT28.                                                                                                                                                 | Evidenziare alternative e duplicati; una scheda con due capacità omonime non produce automaticamente due benefici.                                                                       |
| Magie multiclasse     | Preparazione e caratteristica da incantatore restano per classe; cantrip scalano sul totale salvo testo contrario. Con Incantesimi da più classi, sommare livelli da incantatore pieno e metà, arrotondata per eccesso, di paladino/ranger per la tabella slot. EN25–26; IT28–29. | Non copiare l'arrotondamento 2014. Slot di livello superiore non autorizzano a preparare magie di quel livello. Magia del patto resta distinta, con usi incrociati ammessi dalla regola. |
| Respec e risorse vive | Queste pagine descrivono acquisizione e costruzione, non un protocollo generale di respec, fusione concorrente o recupero durante avanzamento.                                                                                                                                    | I-124 e le politiche esplicite sotto disciplinano l'app; non inventiamo un riposo, rimborso o risurrezione «da SRD».                                                                     |

## ADV-01/02 — iniziare l'avanzamento

La scheda mostra metodo, livello applicato, classi e, se usati, PE correnti e
prossima soglia. **Avanza** apre la bozza: **Aumenta [classe]** è la scelta diretta;
**Aggiungi classe** mostra altre classi accessibili con fonte, requisiti e ragioni
di indisponibilità. Non nasconde una classe solo perché al momento manca un
requisito; non rivela però contenuti privati o non accessibili. Il livello totale
è sempre distinto dal livello nella classe e dall'eventuale livello da incantatore.

**PE:** il DM può selezionare più destinatari autorizzati e scegliere **Totale da
dividere** oppure **Per personaggio**, I-122. Il riepilogo espone ciascun incremento,
totale precedente/successivo e livelli raggiungibili; **Assegna PE** registra
l'assegnazione una volta, senza aprire o applicare automaticamente le scelte altrui.
La divisione propone quote uguali arrotondate per difetto: 50 PE a tre personaggi
producono **16/16/16, totale assegnato48, resto2 non assegnato**. Lo SRD EN5/IT6
stabilisce l'arrotondamento generale; Awards documenta divisione/each ma non basta
a provare la sua gestione del resto. Rendere il resto esplicito è scelta dell'app,
senza creare una nuova banca PE o obbligare a premi diseguali. Il DM può modificare
gli importi in anteprima, anche allocando quel resto; solo il riepilogo confermato
determina i premi. Non si attribuisce questa UI di riconciliazione a Foundry.
**Registra PE** sulla scheda permette la registrazione manuale autorizzata; una
correzione dei PE non toglie automaticamente livelli già giocati.

**Milestone:** mostra il traguardo dichiarato e il livello da acquisire, senza
inventare PE. Il DM può registrare l'annuncio per i destinatari pertinenti; il
giocatore può usare **Avanza** dopo un annuncio al tavolo o su altri strumenti.
Non serve una seconda approvazione digitale per ogni passaggio. Nessun obbligo di
stesso livello, milestone pubblica o DM dentro l'app viene dedotto da I-123.
La modalità personale permette di registrare il metodo concordato col gruppo esterno.

Se sono disponibili più livelli, le tappe restano ordinate: si vedono livello
di classe, totale e scelte richieste di ciascuna. Si può applicare il prefisso
completo scelto, senza applicare benefici delle tappe incomplete successive.
Non si genera un livello 21 dalla tabella: eventuali talenti bonus dopo il 20,
previsti come opzione del GM nello SRD, richiedono un percorso distinto ancora
da dettagliare. Cambiare metodo PE/milestone non converte o cancella la storia.

## ADV-03/04 — PF, caratteristiche e scelte per livello

Ogni sezione espone **Attuale → Proposto**, fonte e motivo del cambiamento.
Le scelte obbligatorie vengono dalla capacità a quel livello, non da un generico
«scegli un talento ogni quattro livelli totali». Opzioni facoltative restano tali;
preselezioni e piani futuri sono modificabili. **Dettagli** non concede il beneficio.

Per i PF scegliere il metodo applicabile al personaggio: **Valore fisso** oppure
**Tiro**. Per il tiro sono disponibili dado digitale e **Inserisci risultato
fisico**; si inserisce la faccia del dado, il modificatore resta separato. Risultati
fuori dal dado vengono segnalati. Il risultato salvato non viene ritirato tornando
fra sezioni; una correzione mostra vecchio/nuovo valore. Non si introduce un diritto
a ritirare finché il valore piace. La ricostruzione manuale conserva dati e lacune
del passato senza trasformare un totale noto in tiri storici inventati.

**Esempio PF sintetico:** guerriero 7, COS17 (+3), primo livello 13 PF e sei
incrementi fissi da 9: massimo 67, attuali 42. Nel passaggio a guerriero 8 ottiene
il nuovo incremento 9 e porta COS a18 (+4): +8 retroattivi, massimo **84**.
Formula equivalente: nuovo incremento con COS aggiornata 10, più 7 per i livelli
precedenti. Non sommare 10 e 8. Il riepilogo mostra entrambe le origini del +17.

**Totale manuale I-054:** se Forza calcolata16 è sostituita da Forza manuale18,
un aumento +2 porta il calcolato a18 ma il valore effettivo rimane18. La bozza
mostra **Mantieni totale manuale18**, **Modifica totale manuale** o **Rimuovi
sostituzione e usa calcolo18**; nessuno trasforma implicitamente 18 in20 o in bonus.
Per COS si usa analogamente il modificatore effettivo: un aumento del calcolato
che non cambia la COS sostitutiva non crea un incremento retroattivo fittizio.

Quando massimo PF o componenti storiche sono manuali/non ricostruibili, mostrare
il dato effettivo, l'incremento dimostrabile e ciò che manca. Una scelta esplicita
può confermare un nuovo totale manuale o usare il calcolo verificabile; l'app non
sovrascrive un totale sostitutivo per «ripararlo». Provenienza ignota e input
numericamente impossibile non sono lo stesso errore. Un passato incompleto da
solo non impedisce di confermare una ricostruzione valida, I-053.

## ADV-05 — magie e risorse senza riposo implicito

**Gestisci magie** riusa MAG-02 e la capacità che concede scelta, sostituzione,
libro o preparazione. Un aumento degli slot non prepara nuove magie da solo.
**Esempio sintetico 2024:** ranger3/stregone3 è incantatore5 per gli slot:
metà di3 arrotondata per eccesso dà2, più3 da stregone. Ha quattro slot di1°,
tre di2°, due di3°. Non può preparare magie di3° né magie da ranger di2°; può usare
gli slot alti per le magie ammesse, secondo il loro testo. La scheda conserva
classe e caratteristica di lancio, senza fondere Magia del patto nella stessa riserva.

Le seguenti sono **politiche dell'app** per attuare avanzamento senza azzerare
la partita, non regole di recupero attribuite ai concorrenti o allo SRD:

- PF massimi e PF attuali sono distinti. Aumentare il massimo lascia invariati
  gli attuali: nell'esempio 42/67 diventa **42/84**. Un recupero concordato è
  un'operazione esplicita distinta. PF temporanei, condizioni, tiri morte e
  concentrazione non vengono cancellati; avanzare a0 PF non fa rialzare il personaggio.
- Per una riserva che mantiene identità e unità, conservare gli usi spesi e
  ricalcolare la disponibilità sulla nuova capienza. Da massimo3, spesi2, rimasto1
  a massimo4: rimasti2, con i due consumi ancora registrati. La nuova capienza
  è leggibile come acquisizione, non come riposo. Una riduzione non rimborsa usi:
  se gli spesi superano la capienza, disponibilità0 e differenza visibile.
- Il nuovo Dado Vita aumenta la riserva del tipo pertinente; quelli già spesi
  restano spesi. Aggiungere una classe non rigenera gli altri tipi di dado.
- Una capacità realmente nuova riceve la dotazione iniziale prevista dalla sua
  regola, dichiarata nel riepilogo. Rimuovere e riaggiungere la stessa capacità
  con **Rivedi scelte** non la rende «nuova» per cancellarne i consumi.
- Se cambiano identità, livello o natura della riserva, non convertire alla cieca:
  ad esempio sostituzione di classi con diversi Dadi Vita o cambiamento degli slot
  del Patto. Mostrare vecchia/nuova riserva e applicare la regola specifica verificata;
  in sua assenza richiedere la riconciliazione esplicita pertinente, senza inventare
  un rimborso o bloccare la consultazione delle parti indipendenti.

Niente nuovi oggetti iniziali, cariche, monete o consumabili viene creato per il
solo avanzamento. Concessioni reali di una capacità conservano fonte; l'inventario
già usato segue INV. Una scelta rimossa non distrugge un oggetto posseduto con
un'origine indipendente o una registrazione storica nel libro degli incantesimi.

## ADV-06/07 — bozza, revisione e applicazione alla scheda corrente

**Salva bozza** conserva scelte anche incomplete e punto raggiunto; **Riprendi**
mostra ciò che manca senza rigiocare tiri già registrati. L'indicatore dichiara
dove è salvata: una richiesta partita ma non confermata non appare sincronizzata.
**Torna alla scheda** conserva la bozza. **Scarta bozza** dichiara che elimina
solo le proposte; un eventuale piano futuro separato resta intatto. Nessuna
chiusura silenziosa fa perdere l'ultima sezione per imitare il limite Roll20.

**Rivedi** mostra livelli, scelte aggiunte/sostituite/rimosse, PF, capacità,
magie, competenze, totali manuali, capienze/consumi e dipendenze. Ogni problema
ha **Correggi [sezione]**. Input obbligatori non risolti bloccano solo l'applicazione
che li richiede, con motivo; note facoltative o storia incompleta non sono errori
universali. **Applica** è l'unica conferma conclusiva ordinaria, non seguita da
un secondo «sei sicuro» identico. **Annulla modifiche** prima dell'applicazione
lascia la scheda attiva intatta e permette di conservare la bozza.

La revisione si confronta con la **scheda attuale**, non solo con l'inizio della
bozza. Si applicano le scelte strutturali confermate e i loro effetti calcolati;
non si ripristina lo stato completo di un'ora prima:

- Un danno durante la bozza resta: nell'esempio, altri5 danni portano42 a37 e
  l'applicazione finale produce **37/84**, non42/84 o84/84. Una pozione usata
  o uno slot speso restano consumati; appunti aggiunti nel frattempo restano.
- Un altro controllore che cambia la stessa classe, scelta o totale manuale
  produce un conflitto concreto: mostrare entrambi i cambiamenti e rivalidare
  la proposta. Nessun «ultimo clic vince», priorità automatica del proprietario
  o sovrascrittura dell'altra modifica viene introdotto qui.
- Una modifica senza dipendenza, come una nota indipendente, viene conservata
  senza costringere a rifare l'avanzamento. Le risorse vive vengono rilette;
  una variazione che cambia l'esito mostrato aggiorna la revisione prima di applicare.
- Se lo stato cambia fra revisione e applicazione, non confermare un esito diverso
  da quello mostrato: tornare alle sole differenze materialmente cambiate. Un
  doppio clic o ritentativo dopo errore non applica due livelli o due assegnazioni.

Il risultato confermato indica cosa è stato applicato, autore e momento. Le azioni
già risolte non vengono ricalcolate retroattivamente con il nuovo bonus; azioni
ancora pendenti mantengono le rivalidazioni previste da TABLE_ACTIONS/REACTIONS.
La scheda resta lo stesso personaggio nelle campagne e nelle scene pertinenti.

## ADV-08 — rivedere una costruzione già giocata

**Rivedi scelte** apre classe, sottoclasse, talenti e altre scelte acquisite con
provenienza e dipendenze. È un percorso di I-124, non una regola universale SRD
di cambiamento gratuito in qualunque situazione. L'accordo col DM resta quello
del gruppo; non si aggiunge una nuova approvazione digitale obbligatoria.

**Cambia scelta** mostra ciò che perderebbe i requisiti, magie/capacità da
sostituire e formule derivate. Rimozioni riguardano i benefici conferiti da
quella scelta, senza cancellare una concessione indipendente dello stesso nome.
Classe iniziale e ordine dei livelli restano rilevanti per competenze e PF:
una storia ignota viene dichiarata e ricostruita solo quanto serve al cambiamento.

Storia, note, identità, equipaggiamento e conseguenze già avvenute si conservano.
Se il nuovo massimo PF scende sotto gli attuali, il riepilogo propone di limitarli
al nuovo massimo; è una riconciliazione esplicita dell'app, non danno, cura o
riavvolgimento della partita. Riduzioni temporanee e totali sostitutivi restano
distinti: se la loro interazione non è determinabile non si inventa il risultato.
Nessun respec ripristina slot, risorse, concentrazione o stato vitale. Le riserve
non confrontabili seguono la riconciliazione ADV-05, non un riempimento automatico.

**Duplica personaggio** resta una scelta separata I-125: non è necessario per
provare una bozza e non crea collegamenti o sincronizzazione fra le due schede.
Visibilità/copertura della duplicazione restano nei requisiti dedicati.

## ADV-09 — piano futuro utilizzabile, senza benefici anticipati

**Piano futuro** mostra tappe per livello totale e classe, scelte facoltative,
fonte/revisione e note. **Aggiungi tappa**, **Cambia scelta** e **Rimuovi tappa**
modificano il piano; **Salva piano** non cambia la scheda. Scelte ancora non
definite e tiri PF futuri non vengono riempiti con risultati immaginari.
Il piano può mostrare dipendenze e valori previsti con le proprie ipotesi, senza
diventare un ottimizzatore obbligatorio o una promessa di idoneità futura.

Quando si avanza, **Usa nel prossimo avanzamento** precompila le intenzioni
pertinenti e le rivalida contro livello, fonte, contenuti abilitati, requisiti e
valori effettivi attuali. Una scelta non più valida mostra il motivo e un accesso
alla sostituzione; il resto del piano si conserva. Cambiare il piano non cambia
una scelta già applicata, per la quale serve **Rivedi scelte**. L'app non aggiorna
silenziosamente i personaggi quando una definizione in Biblioteca cambia.

## ADV-10 — correzioni, autorità, errori e rientro

Chi può modificare la scheda può preparare/applicare scelte entro i permessi
già acquisiti; consultazione, controllo, proprietà e contenuti **Solo io** non
sono sinonimi. Questo documento non assegna nuove autorità per distribuire PE
altrui, imporre milestone o derogare ai requisiti multiclasse. Revoca dei permessi
interrompe la scrittura e non rende accessibile il materiale privato tramite la bozza.

**Riapri esito** mostra differenze e provenienza. **Correggi** distingue errore
di dato proprio da conseguenze condivise: si seguono I-028/I-029, conservando
di default azioni successive. Non esiste un «annulla avanzamento» che riavvolge
silenziosamente attacchi, danni e scambi già giocati. Errori con effetti altrui
restano nell'autorità DM già prevista; tornare indietro nella UI non è un rewind.

Senza rete, I-114 consente lettura e modifica personale, inclusa la bozza e i
dati risolvibili con fonti disponibili. L'eventuale applicazione locale è marcata
**Solo su questo dispositivo, da sincronizzare**: non pretende di aggiornare
il Tavolo altrui. Al rientro si confrontano permessi, scelte e stato corrente;
non si accodano assegnazioni condivise come già avvenute e non si risolve un
conflitto semplicemente scegliendo l'ultima copia. Fonte o requisito indisponibile
blocca il solo calcolo/conferma che ne dipende, preservando il lavoro salvabile.

In caso di errore di salvataggio o risposta persa, mantenere le proposte e offrire
**Riprova** e **Verifica stato**, evitando duplicazioni. Un errore indica cosa
non è stato confermato, non un generico successo. **Torna alla scheda**, **Torna
al Tavolo** e ritorno all'origine conservano contesto NAV e non attivano un'altra
scena, cambiano campagna o rivelano materiali come effetto del rientro.

## Limiti residui precisi

- L'applicazione ordinaria, la conservazione dei consumi e le dipendenze reali
  sono definite qui. Resta da specificare la riconciliazione per ogni trasformazione
  non equivalente di risorse in respec, incluse eccezioni homebrew, slot del Patto
  e Dadi Vita di classi sostituite; nessun recupero predefinito implicito.
- Requisiti multiclasse baseline verificati; eventuali deroghe della campagna
  richiedono una regola/autorità esplicita. I-060 non la fornisce automaticamente.
- Restano da completare autorità globali, bozza di più controllori, accesso dopo
  revoca/offline e visibilità delle assegnazioni; qui non si sceglie una priorità
  arbitraria né si rende pubblico un piano personale.
- Le regole specifiche di ogni classe, talento, eccezione oltre il20 e contenuto
  privato richiedono schede di regola ed esempi propri prima di essere eseguibili.
  Le fonti lette non provano copertura di tutto il catalogo o comportamento runtime.
- Nessun test utente, prototipo persistente, sincronizzazione reale o contratto
  completo del personaggio è attestato da questo documento.
