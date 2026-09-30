# Forme e creature collegate

Aggiornato il 23/09/2026. Percorsi dell’incremento 9 nella stessa app;
non è una dichiarazione di completamento del motore delle trasformazioni.
Il contratto completo resta [BLUEPRINT_CONTRACT](BLUEPRINT_CONTRACT.md).
Autorità: decisioni I-040/041, I-110/111 e
[piano incremento 9](../../changes/interview-01/blueprint-build-plan.md).
Regole e confronti documentali sono in
[R193](../../changes/interview-01/blueprint-forms-companions-research.md);
firme e invarianti in [API forme/compagni](../../changes/interview-01/blueprint-forms-api.md).

## Tre oggetti diversi

| Oggetto             | Identità e conseguenze                                                                                                       |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Forma               | Cambia le statistiche effettive dello stesso attore. Stessa scheda, PF, risorse, turno e storia vivi.                        |
| Compagno o famiglio | Un altro attore persistente, con PF, risorse, controllori e ciclo di vita propri; collegato alla fonte/genitore.             |
| Pedina              | Rappresentazione scenica dell’attore. Creare, collocare, muovere, togliere dall’iniziativa e archiviare sono gesti distinti. |

Un effetto intangibile 2024 non diventa un pacchetto di PNG perché nel nome
compare «evoca». Metamorfosi, cavalcature e altri effetti richiedono politiche
proprie: non ereditano automaticamente le regole di Forma Selvatica.

## Ingressi e contesto

Da **scheda → Extra** o dal soggetto pertinente sul **Tavolo** si apre il
dialogo contestuale «Forme e creature collegate». Navigazione locale:
Forme, Creature collegate, Trova Famiglio; le forme note sono raggiungibili
da Forme. Non viene aggiunta una pagina principale separata.

Il pannello nomina il soggetto, mostra fonte/costi e legge proiezioni autorizzate.
Selezionare una forma o un attore non cambia il turno e non ricarica risorse.
Una creatura senza token rimane accessibile dalla scheda del genitore e dalla
propria scheda. Un controllore delegato non riceve per questo i piani privati
del genitore.

**Preview → Applica** è comune alle trasformazioni, alle creazioni e ai comandi
di gestione. Preview non muta. Applica rivalida dati pertinenti, permessi,
risorse, fonte, turno, geometria e orologio; una variazione richiede nuova
preview. Annulla preview mantiene le scelte senza spendere.
Chiudi/Esc lascia intatte attività già iniziate, forme e creature. Le scelte
non applicate sono locali alla visita, non bozze dichiarate persistenti.

## Forma Selvatica 2024

1. **Scegliere:** ricerca e filtri Forme note, Ammissibili, Recenti, Catalogo.
   Ammissibile non significa già nota. Il profilo indica fonte e revisione.
2. **Decidere i PF temporanei:** se presenti, scegliere i precedenti o quelli
   offerti dalla nuova forma; non si sommano. La preview mostra prima/offerti/dopo.
3. **Disporre gli oggetti trasportati:** per ciascun oggetto con quantità positiva
   e non a terra, Cade, Si fonde oppure Indossato. Solo Indossato richiede la
   registrazione esplicita della decisione del DM sulla praticabilità. Non serve
   un’approvazione digitale del DM per ogni uso della capacità.
4. **Confrontare:** fonte, durata, uso canonico, azione bonus quando applicabile,
   CA, velocità, caratteristiche, TS, abilità, sensi, dati conservati e limiti.
   La UI mostra il calcolo del dominio, non replica le formule.
5. **Applicare:** una sola spesa; la forma diventa `activeForm` dello stesso
   attore. Scheda, Tavolo, attacchi, difese e movimento leggono i valori effettivi.

Il livello pertinente è quello **da druido**. Sono conservati PF/HD, valori
mentali, risorse, note, condizioni e concentrazione secondo la fonte.
Non compare una seconda barra di PF della bestia. I PF temporanei assorbono
il danno prima dei PF ordinari; il danno ricevuto resta rilevante per la
concentrazione. Normalmente la forma impedisce il lancio; eventuali eccezioni
richiedono metadata verificati, non un nome di capacità o testo interpretato.

Il movimento conserva la distanza già consumata e gli Scatti del turno.
Ridurre la velocità fino a saturare il residuo a zero non fa dimenticare i
metri spesi quando si ritorna alla velocità base.

### Forme note, correzioni e ritorno

**Gestisci forme note** distingue scelta iniziale, sostituzione dopo il proprio
lungo e correzione motivata. Limite e ammissibilità provengono dal dominio.
La sostituzione ordinaria usa l’opportunità del riposo pertinente; il lungo
di un altro personaggio non la concede. I riferimenti fuori catalogo restano
rimovibili, senza usare un ID tecnico come nome ordinario.

**Torna alla forma originale** rimuove la sostituzione della forma, non ripristina
uno snapshot: danni, usi, slot, condizioni, note e concentrazione intervenuti
nel frattempo rimangono. Il ritorno volontario usa una bonus quando in
iniziativa. Le condizioni di termine della fonte sono eventi distinti.
I PF temporanei residui di Forma Selvatica non vengono cancellati applicando
la diversa clausola di Metamorfosi.

Un oggetto caduto resta a terra; quantità e sintonia non vengono ripristinate.
Gli oggetti fusi sono inoperanti durante la forma. Nella forma successiva gli
oggetti a terra o esauriti non devono ricomparire come disposizioni obbligatorie.

**Correggi la forma attiva** permette CA/velocità con motivo e provenienza
autoriale, senza alterare il profilo SRD acquisito o i valori base. La correzione
motivata di un termine già avvenuto nella finzione è distinta dal ritorno
volontario e non inventa spesa/rimborso. Nessuno dei due è Undo globale.

## Creature: registrazione, evocazione e comparsa

| Percorso                 | Prima della conferma                                                                                                             | Effetto della conferma                                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aggiungi manualmente     | Nome, profilo disponibile, eventuali valori/motivo dichiarati, preview.                                                          | Registra una creatura esistente con identità distinta. Nessun lancio, costo, token o iniziativa impliciti.                                                             |
| Compagno Selvatico       | Nome, profilo consentito, scelta di **un uso Forma oppure uno slot**; eventuale slot del Patto distinto; spazio di comparsa.     | Azione di Magia quando in iniziativa, una sola risorsa scelta, famiglio folletto senza costo materiale. Rimangono necessarie le altre componenti previste dalla fonte. |
| Trova Famiglio ordinario | Nome, profilo/tipo, slot o rituale, incenso reale in inventario, quantità/valore, concentrazione precedente, preview dell’avvio. | Avvia un’attività persistente; la creatura e i costi di conclusione non sono ancora applicati.                                                                         |

La registrazione manuale attuale parte dai profili disponibili più override;
non è un editor universale di mostri. I valori non toccati acquisiscono il
profilo. Svuotare un campo modificato registra dato sconosciuto, non zero.
Le correzioni devono indicare un motivo.

### Trova Famiglio: attività lunga

Lancio con slot: 60 minuti. Rituale: 70 minuti. Il materiale resta necessario
anche nel rituale: oggetto-incenso effettivamente disponibile, valore totale
almeno 10 mo; l’app non acquista materiale sottraendo denaro in silenzio.
L’accesso alla modalità dipende da preparazione e, per l’eccezione pertinente,
capacità e libro leggibile correnti.

L’avvio richiede concentrazione durante l’attività. Sostituire la precedente
è una scelta esplicita. In iniziativa si deve proseguire con l’azione di Magia
di ogni turno; la perdita di concentrazione o l’azione non proseguita fa
fallire il lancio. Chiudere il pannello non equivale a interromperlo.

Il dettaglio conserva avanzamento, tempo richiesto/restante e stato al reload.
Per condiviso il DM conferma gli intervalli del tempo di gioco; per personale
si registra un intervallo e la sua attività/motivazione. Il tempo personale
non può saltare azioni/turni durante l’iniziativa. Le ore reali di attesa o una
data in calendario non avanzano automaticamente questi orologi.

**Vedi completamento** richiede tempo trascorso, attività ancora valida,
risorse e spazio di comparsa. Slot e incenso vengono rivalidati e consumati
atomicamente alla conclusione; se mancanti non si crea mezza creatura.
Il consumo del materiale alla conclusione è una fase dichiarata
dall’adattamento del prototipo, non una citazione SRD inventata. Interruzione
con motivo e fallimento non consumano lo slot. La creatura completata non
richiede concentrazione fittizia per rimanere presente.

Un nuovo lancio con famiglio esistente cambia la forma della stessa identità:
non duplica attori né ricarica implicitamente i dati vissuti. I retry della
stessa operazione non ripetono consumo o creazione.

### Comparsa e collocazione successiva

Prima della preview di una vera comparsa, **Scegli il punto sul Tavolo** apre
il gesto diretto sulla mappa: clic/touch oppure frecce e Invio; Esc/Annulla
ritorna al pannello senza confermare. Spazio libero e gittata della fonte
sono controllati sia dal picker sia dal dominio prima di applicare.
Attualmente: 3 m per la comparsa del lancio, 9 m per ricomparsa dopo congedo.

Senza token del genitore in contesto accessibile è offerta un’attestazione
narrativa esplicita. Non è un bypass della geometria quando il token esiste.
Il controllo non aggiunge genericamente cammino o linea di vista se la fonte
non li richiede. Collisione del centro e diametro di una casella sono
adattamenti provvisori dichiarati: non certificano ogni ingombro/taglia.

**Posiziona pedina** successivo crea soltanto la rappresentazione dell’attore
già esistente, senza seconda spesa o ingresso automatico nell’iniziativa.
Se la pedina è già sulla scena, si seleziona quella e si usa il normale
[movimento](TABLE_MOVEMENT.md). La prima collocazione non è un comando di
teletrasporto. Una creatura personale deve prima essere collegata alla campagna
per comparire sul Tavolo condiviso; la scena deve essere leggibile.

La propria scheda offre **Collega alla campagna** anche per un compagno
personale. Il riepilogo nomina creatura e campagna e chiarisce cosa si condivide:
solo quella scheda, senza genitore o altre creature. Esc non condivide; il
comando rivalida il controllore e la membership. Nessun token o turno è creato
implicitamente. Gli appunti personali e le registrazioni private nel registro
restano tali; la storia scritta nei contenuti della scheda viene condivisa.

Cambiare creatura o avviare una nuova evocazione pulisce il vecchio contesto
del picker. Una risposta tardiva della mappa non sovrascrive una nuova visita;
la pedina della creatura precedente continua a occupare il proprio spazio.

## Ciclo di vita e permessi

Il compagno ha scheda e risorse proprie; la sua iniziativa e reazione non sono
quelle del genitore. Per il famiglio il divieto di attaccare vale anche per
API e attacchi di opportunità, non soltanto per i pulsanti visibili.

| Comando/stato               | Significato                                                                                                            |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Congeda temporaneamente     | Azione pertinente del genitore; rimuove le rappresentazioni, mantiene identità e dati.                                 |
| Ricomparsa                  | Solo da congedato, con azione e spazio/gittata rivalidati; non ripristina risorse.                                     |
| Distrutto a 0 PF            | Scompare; serve un nuovo lancio, non la ricomparsa gratuita.                                                           |
| Rilascio definitivo         | Comando distinto dal congedo; stati terminali non offrono una seconda spesa per lo stesso rilascio.                    |
| Scadenza Compagno Selvatico | Solo quando il genitore completa il proprio lungo.                                                                     |
| Archivia                    | Operazione motivata distinta da morte/cancellazione della scheda; rimuove token e iniziativa.                          |
| Correggi un dato            | Patch limitata e motivata sulla singola istanza, con preview; non modifica tutte le creature della stessa definizione. |

**Chi controlla questa creatura** usa membri attivi proiettati dal dominio.
Il proprietario rimane controllore. Lettura, controllo, delega e visibilità
scenica non sono sinonimi; la revoca deve valere anche sui comandi del Tavolo
e sui retry, non solo nascondere il pannello. Le due identità demo rimangono
quelle esistenti: nessun selettore di impersonazione è aggiunto.

Una scheda personale non diventa leggibile dal DM non proprietario. La storia
e le facce già registrate con origine personale non diventano pubbliche
quando l’attore viene collegato successivamente alla campagna. Il diritto
storico di consultazione non autorizza automaticamente nuovi comandi correnti.

## Fonti acquisite, riserve e raccordi

`forms-profile.mjs` collega i dati strutturati del builder alle capacità reali:
livello da druido, competenze esplicite, forme note, riferimento alla riserva
canonica e accesso a Trova Famiglio. Si riconoscono definizioni e fonte SRD
2024/revisione immutabile, non stringhe tradotte o prosa homebrew.
Il profilo contiene metadata: il saldo resta sulla capacità in `actor.features`.
Avanzare/rivedere non azzera il consumo già noto; nella ricostruzione un consumo
sconosciuto resta `null` e blocca l’automatismo che lo richiede.

La stessa riserva alimenta Forma Selvatica e Compagno Selvatico. Il raccordo
con [Riposi e tempo](REST_TIME_FLOW.md) dichiara un uso recuperato al breve e
tutti al lungo, con fonte e senza duplicare la riserva. Il lungo pertinente
apre anche l’opportunità di sostituzione della forma nota e termina il Compagno
Selvatico del partecipante corretto. Un lungo altrui non produce questi effetti.

`getEffectiveActor` è un helper interno puro, non un’autorizzazione né un
oggetto da riscrivere nello store. Le query pubbliche ricevono l’identità.
I raccordi root distribuiscono valori effettivi a scheda, Tavolo, attacchi,
difese, movimento e concentrazione; eventi espliciti di danno, stato, turno,
tempo e lungo fanno progredire/terminare forme e lanci. Un testo narrativo
isolato non scatena conseguenze meccaniche.

Punti tecnici per gli agenti: `forms-companions.mjs` (dominio/proiezioni),
`forms-ui.mjs` (dialogo), `forms-profile.mjs` (builder/fonti/riposi),
`companion-map.mjs` e `spatial.mjs` (puntamento/validazione), adapter esistenti
in app, scheda, Tavolo, combattimento, riposi e store. Stato e Undo restano
unici. Niente barriere o cancellazione globale della cronologia.

## Errori e recupero della visita

- Mancano fonte, competenze, consumo, componenti o risorse: motivo leggibile,
  nessuna stima di zero e nessun consumo parziale. Correggere il dato o
  completare la conseguenza pendente, poi ripetere la preview.
- Richieste fisiche o conseguenze causali pendenti del soggetto bloccano i
  cambi incompatibili; non inventare una faccia né sbloccarle cambiando forma.
- Input invalido/commit rifiutato: campi conservati fino a correzione o chiusura
  intenzionale. Blur di testo/numero non smonta il controllo che sta ricevendo
  il click; i cambi strutturali conservano details/focus/scroll.
- Dati cambiati dopo preview: Apply disabilitato, nuova preview. Revoca di
  lettura: vista neutra, senza nome/campi/errori privati residui.
- Offline: operazioni condivise negate; personali seguono autorità e metadata
  locali. L’errore di persistenza della shell non diventa una promessa di reload.
- Undo annulla il comando atomico, non simula il ritorno della forma. Facce già
  accettate rimangono evidenza secondo lo store; retry/reload non duplicano costi.

## Frontiera e prove al checkpoint

**Visitabile:** tre profili acquisiti, forma/ritorno/correzioni, registrazione
manuale da profilo, Compagno Selvatico, attività ordinaria/rituale del famiglio,
gestione controllori/ciclo di vita e gesto di collocazione. Il catalogo di tre
esempi non completa tutte le forme note richieste dalle regole.

**Parziale:** scalata, salto/anatomia e bonus degli oggetti indossati non sono
un motore universale; `formLimitations` lo esplicita prima e dopo l’uso.
Il root ha collegato Pack Tactics del lupo al vantaggio e Agile del topo
all’assenza di attacco di opportunità, con test di integrazione dedicato.
La conseguenza Prono del Morso del lupo è un obbligo aperto: segnalazione
manuale/gestione completa della condizione in completamento separato;
non dichiarare automaticamente coperto Prono, rialzarsi o strisciare.

Telepatia, sensi remoti/fog, consegna di magie a contatto, altri compagni,
cavalcature, Metamorfosi e sovrapposizione di effetti restano inclusi nel
contratto e richiedono percorsi e verifiche propri.

Evidenza distinta:

- [Rapporto UI](../../changes/interview-01/blueprint-forms-ui.md): 23 handler
  con store/dominio reali, non equivalenti al browser. Riferimenti, errori,
  reload, stato privato, blur, equipaggiamento e picker contestuale coperti.
- [Review UI distinta](../../changes/interview-01/blueprint-forms-ui-review.md):
  R1/R2 chiusi su source `d6bd59e2…`, 70/70 nel gruppo assegnato più probe;
  nessun P1/P2 residuo nel suo perimetro. Non approva i consumer root successivi.
- [Review dominio](../../changes/interview-01/blueprint-forms-domain-review.md)
  e [pre-review root](../../changes/interview-01/blueprint-forms-root-pre-review.md)
  riportano separatamente candidati, fix e limiti dei loro checkpoint.
- Il root esegue i percorsi browser IT/EN, tastiera/touch, mappa e regressioni.
  Le cinque visite browser/12 gruppi sono passate, con regressioni core13,
  creazione5 e avanzamento3;461 test Node e review dei consumer chiusa.
  La [verifica](../../changes/interview-01/blueprint-verification.md) e il
  manifest9 identificano il checkpoint; non chiudono il prodotto intero.

I prodotti di R193 (Foundry, Beyond, Shard, BG3, Solasta, Roll20, Owlbear)
forniscono pattern pubblicati, non runtime eseguiti qui o norme intercambiabili.
In particolare, PF separati della bestia e modelli di evocazione 2014 non
vengono importati dal riferimento storico nel motore 2024.
