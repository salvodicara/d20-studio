# Forme e compagni — piano UI incremento 9

23/09/2026. Autore `blueprint_module_review`, modello/sforzo ereditati.
Worktree `~/Workspace/Codex/d20-studio-interview-01`. Unico file scritto:
questo piano. **Progettazione circoscritta, nessuna implementazione 9 né
verifica runtime dei percorsi proposti.** L’incremento 8 è stato chiuso dal
coordinatore; l’esecuzione 9 attende l’API unica concordata prima dei consumer.

> Per l’esecuzione futura: usare il ciclo Superpowers già scelto dal
> coordinatore, TDD per dominio/handler e review distinta. Questo documento
> definisce il consumer UI; non introduce una seconda API o un altro store.

**Obiettivo.** Collegare Extra, capacità, scheda e Tavolo per compagno manuale,
Trova Famiglio, Compagno Selvatico e Forma Selvatica 2024, con stato persistente,
costi dichiarati, ritorno senza rimborsi impliciti e privacy verificabile.

**Architettura.** Estendere la stessa scheda e riusare dialoghi contestuali e
mappa. La forma è un effetto sul soggetto esistente; il compagno è un attore
distinto; la pedina è una rappresentazione in una scena. Ogni mutazione usa
il dominio condiviso e il normale commit/Undo della shell.

**Tecnologie.** Moduli ES, template HTML escaped, controlli nativi e CSS del
blueprint; Node per handler/dominio, browser del coordinatore per gesti reali.
Nessuna nuova dipendenza, autenticazione, app o pagina principale.

**Specifica.** [R193 e fonti S01–13/N01–13](blueprint-forms-companions-research.md),
[piano incremento 9](blueprint-build-plan.md),
[I-110/I-111](../../docs/interview/DECISIONS.md),
[F-023/F-024](../../docs/interview/FEATURES.md),
[pagina Personaggi](../../docs/interview/pages/characters.md),
[contratto blueprint](../../docs/interview/BLUEPRINT_CONTRACT.md).
Riuso della ricerca documentale verificata il 23/09/2026; nessuna nuova
consultazione dei prodotti o prova del loro comportamento è dichiarata qui.

## Vincoli e rischi da verificare

- Baseline 2024, fonte/edizione/revisione immutabile; SRD 5.2.1 EN/IT con hash
  conservati in R193. Una regola manuale non riceve una citazione SRD inventata.
- Preview e consultazione non consumano risorse. Apply rivalida controllo,
  contesto, fonte, turni, costi e conseguenze pertinenti; retry è idempotente.
- Risorse mancanti restano non registrate. Ogni costo ha soggetto, pool,
  quantità, momento di addebito e prima/dopo; niente pool sintetici duplicati.
- Ritorno ordinario, fine automatica, correzione motivata e Undo sono distinti.
  Tornare non ripristina una vecchia scheda o annulla danni, consumi e scrittura.
- Controllo, lettura, visibilità del token, relazione pubblica al padrone e
  sensi condivisi non si implicano. Nessun DM universale sui dati personali.
- Due identità demo restano due identità; controllo delegato non si simula
  aggiungendo un selettore che consente impersonazione.
- IT/EN, tastiera/touch, input invalidi conservati, scroll/focus dopo render.
  Chiudere una scelta non può cancellare richieste o risultati già acquisiti.

Review prioritaria: ritorno dopo danni/consumi; risorsa Forma Selvatica condivisa
con Compagno Selvatico; famiglio già esistente/congedato/a 0 PF; revoca mentre
una preview è aperta; posizionamento ripetuto dopo reload senza duplicare attori.
I casi concreti sono associati alle prove 2, 4, 5, 8 e 9 sotto.

## Raccordi letti, senza modificarli

| Punto esistente                                                                                                    | Uso nel piano e lavoro necessario al raccordo                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [characters.mjs](../../design/blueprint/characters.mjs), `tabs`, `renderExtras`, `renderFeatures`, `renderActions` | Extra oggi contiene piano personale e altre schede. Aggiungere creature collegate e Forme senza perdere quei contenuti. Capacità/Azioni aprono lo stesso flusso con fonte già selezionata.                                                        |
| [character-access.mjs](../../design/blueprint/character-access.mjs)                                                | Oggi owner/DM e tipo `npc` governano accesso; non esiste delega generale. Serve un raccordo esplicito per l’attore compagno, senza rendere leggibili tutti i PNG.                                                                                 |
| [table.mjs](../../design/blueprint/table.mjs), `setSelectedActor`, `renderTable`, `bindTable`                      | Selezione e iniziativa già distinte. Nome, PF, CA, movimento, azioni e richieste devono usare il profilo effettivo proiettato, non solo un nuovo ritratto.                                                                                        |
| [preparation.mjs](../../design/blueprint/preparation.mjs), `placeSceneToken`, `removeSceneToken`, editor pedine    | Un token punta a un attore, uno per attore nella scena; creazione/duplicazione PNG e collocazione sono oggi DM-only. Riusare coordinate/gesti, non chiamare questi comandi fingendo il ruolo DM. La bozza scena resta distinta dal Tavolo attivo. |
| [combat.mjs](../../design/blueprint/combat.mjs), richieste e conseguenze                                           | Identità causali, budget azione/bonus/reazione e risultati acquisiti restano unici. Cambiare forma rivalida solo ciò che dipende dai dati mutati.                                                                                                 |
| [rest-time.mjs](../../design/blueprint/rest-time.mjs) e [API riposi](blueprint-rest-api.md)                        | Un solo tempo narrativo. Scadenza Forma e lungo del druido terminante Compagno Selvatico sono eventi specifici, non un timer UI o il riposo di chiunque.                                                                                          |
| [homebrew.mjs](../../design/blueprint/homebrew.mjs)                                                                | Definizione revisionata e istanza individuale distinte. Accesso alla fonte, abilitazione nel contesto e uso restano separati; un modello aggiornato non cambia tutte le copie attive.                                                             |

Ownership 9 assegnata dal root: `forms-ui.mjs`, `forms-ui.css`,
`tests/forms-ui.test.mjs` e rapporto UI a questo autore; `forms-companions.mjs`,
test e `blueprint-forms-api.md` a `review_journey`. I raccordi esistenti restano
al root. Il modulo UI contiene selettore/preview e riepiloghi riusabili;
export e firme saranno fissati insieme all’API prima dei consumer: nessuna
funzione non ancora esistente viene presentata qui come utilizzabile.

## Ingressi e ritorni

| Ingresso                                                        | Contenuto e comando reale                                                                                                                                                       | Ritorno                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Scheda → Extra → Creature collegate                             | Elenco nome pubblico, legame, PF autorizzati, stato, controllo e presenza nella scena; Aggiungi manualmente, Apri scheda, Posiziona/Seleziona pedina, ciclo di vita consentito. | Stessa scheda e tab Extra; il compagno non diventa una nuova app. |
| Scheda → Extra → Forme                                          | Forma attiva, forme note e recenti, fonte; Apri selettore, Gestisci forme note, Torna alla forma originale quando consentito.                                                   | Stessa scheda, con forma/risorse aggiornate.                      |
| Scheda → Capacità/Azioni → Forma Selvatica o Compagno Selvatico | Avvia lo stesso selettore con attore, capacità e pool canonico riconosciuti per ID. Un’etichetta omonima manuale non autorizza l’automazione.                                   | Tab e soggetto originari.                                         |
| Scheda → Magie → Trova Famiglio                                 | Avvia il flusso con accesso e preparazione della magia già verificati; distingue lancio normale, rituale ed eventuale registrazione manuale.                                    | Scheda/magia d’origine; attività pendente riapribile.             |
| Tavolo → soggetto selezionato → capacità/Forme/Extra            | Inspector nomina sempre chi agisce. Forma attiva e ritorno sono leggibili vicino all’identità; collegamento al padrone solo se autorizzato.                                     | Medesimo soggetto, scena, pan/zoom; selezione non cambia turno.   |

Forme è una sezione o sottovista della scheda, non una voce della navigazione
principale. Il dialogo mantiene l’origine. Se una navigazione è necessaria,
usa la route esistente `characters?id=…&tab=…` o `table`, con ritorno tipizzato
e rivalidato; niente URL arbitrari o catena illimitata di ritorni annidati.

## Percorsi e controlli

### 1. Compagno manuale: un’istanza persistente

1. **Aggiungi manualmente** apre dati dell’istanza: nome, modello/fonte se
   presente, legame al personaggio, controllo/audience, PF attuali/massimi,
   CA, movimento e capacità dichiarate. Valori ignoti non diventano 10, 0 o
   “disponibile”. Dati necessari a un’azione vanno completati prima di usarla.
2. **Vedi riepilogo** mostra cosa verrà creato, chi legge/controlla e che si
   tratta di registrare una creatura già pertinente alla storia. Non inventa
   un lancio, uno slot speso o un diritto su un contenuto privato.
3. **Registra compagno** crea una sola identità individuale; compare in Extra
   anche senza campagna, pedina o combattimento. Una copia dello stesso modello
   ha PF indipendenti. Annulla prima dell’applicazione non crea nulla.
4. **Apri scheda** usa la scheda esistente; **Correggi dati** conserva fonte e
   motivo della modifica. **Rimuovi collegamento/archivia** spiega l’effetto
   su istanza e pedine; non si confonde con congedo o semplice rimozione mappa.

Se è necessaria una bozza persistente, resta privata al suo autore; salvarla
non condivide il compagno né applica le conseguenze. Non aggiungere un form
generico di scripting per derivare regole dalla descrizione.

### 2. Trova Famiglio: lancio, stato e istanza sono distinti

Selezione fra profili SRD ammessi e realmente disponibili, con fonte e tipo
celestiale/folletto/immondo. Il nome personalizzato è distinto dal modello.
Preview: creatura, modalità di lancio, durata da regola, componenti consumate
(almeno 10 mo per la magia ordinaria), eventuale slot, limite di un famiglio,
iniziativa propria e divieto di attaccare. Non copiare gli attacchi della
bestia nel repertorio utilizzabile del famiglio.

Il lancio lungo diventa un’attività esplicita avviata/in corso/completabile;
il tempo viene registrato dal dominio narrativo, non dal dialogo aperto.
Il dominio deve verificare anche la concentrazione durante il lancio
prolungato, distinta dalla durata istantanea della magia completata: non
assegnare al famiglio una concentrazione permanente fittizia.
Il rituale conserva il costo materiale e usa la sua durata; non è un pulsante
di evocazione gratuita. La fase precisa di spesa, l’interruzione e l’eventuale
rimborso devono provenire dalla regola/API verificata, essere mostrati prima
della conferma e non essere decisi dal renderer. Se quella fase non è ancora
implementata, resta utilizzabile la registrazione manuale dichiarata, senza
spacciare per completo il lancio assistito. Per chiudere l’incremento 9 il
lancio lungo assistito e il materiale devono essere realmente collegati:
la registrazione manuale non sostituisce questa prova richiesta dal root.

Famiglio esistente: la preview dice **Cambia forma del famiglio esistente**,
non Aggiungi secondo famiglio. Stati leggibili e comandi diversi:

- disponibile/non in scena → Posiziona;
- in scena → Seleziona, Congeda temporaneamente, Congeda definitivamente;
- congedato temporaneamente → Fai ricomparire, con costo/finestra e posizione
  legali da regola;
- scomparso a 0 PF → nuovo lancio necessario, niente Ricompari gratuito.

Oggetti lasciati e registrazione della vecchia istanza rimangono consultabili.
Togliere dalla mappa o dall’incontro non equivale a distruggere il famiglio.
Telepatia, vista tramite sensi e consegna di magie a contatto restano azioni
distinte: se la loro automazione non è collegata, la scheda dichiara il limite
senza pulsante operativo finto o condivisione implicita della nebbia.

### 3. Compagno Selvatico: stessa risorsa, scelta esplicita

Dal privilegio riconosciuto scegliere **un uso di Forma Selvatica** oppure
**uno slot** compatibile. Mostrare disponibilità/consumo reale e prima/dopo
di ogni alternativa; una risorsa ignota richiede correzione, non selezione
automatica dell’altra. Applicare l’azione di Magia spende solo la scelta
confermata. Nessun costo materiale della magia ordinaria, nessun secondo pool.

Il risultato è un famiglio folletto con la relazione e la revisione corrette;
scompare al completamento del lungo del druido che lo ha prodotto. Un lungo
altrui non lo termina. Durata e causa di fine sono visibili nella riga Extra.
La gestione del limite del famiglio e dell’eventuale istanza già presente
segue il dominio della fonte; la UI non crea un duplicato per aggirarlo.

### 4. Forma Selvatica 2024: selezione, confronto, applicazione

Il selettore distingue **Note**, **Ammissibili** e **Recenti**, con ricerca e
motivi di esclusione leggibili. Livello da druido, GS, volo, fonte e permesso
non sono dedotti da livello totale, nome o immagine. Tutte le forme ammissibili
non sono automaticamente note. La sostituzione di una forma nota dopo un
lungo usa l’opportunità riconosciuta dal dominio; non azzera la lista o gli usi.

Preview prima dell’azione bonus:

| Parte             | Confronto visibile                                                                                                                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identità e tempo  | Soggetto, forma/revisione, livello da druido, durata, cause di fine, costo bonus e uso nel pool canonico.                                                                                                                                  |
| Profilo effettivo | Valori sostituiti della bestia e valori trattenuti: tipo, PF, HD, INT/SAG/CAR, privilegi, lingue e talenti. Abilità/TS mostrano contributi e scelta del bonus maggiore, mai somma di due competenze.                                       |
| PF temporanei     | Valore nuovo pari al livello da druido e valore/fonte già presenti. Scelta Mantieni precedenti oppure Usa nuovi; niente somma o sostituzione silenziosa.                                                                                   |
| Capacità          | Azioni effettivamente utilizzabili, restrizioni sul lancio motivate e fonti delle eccezioni. Parola e concentrazione conservate secondo questa specifica forma.                                                                            |
| Equipaggiamento   | Per oggetto: Cade, Si fonde, Indossato; destinazione persistente, quantità e sintonia conservate. Compatibilità dell’oggetto indossato richiede decisione pertinente del GM o registrazione manuale esplicita; non è inferita dal disegno. |

**Assumi forma** applica una sola operazione: nessuna nuova identità/turno del
druido. Scheda, inspector, dadi e azioni mostrano lo stesso profilo effettivo;
la base resta consultabile solo a chi ne ha diritto, con differenze leggibili.
La posizione del token resta la stessa salvo spostamento esplicitamente
confermato; cambio dimensione e limiti spaziali non autorizzano un teletrasporto.

### 5. Ritorno e correzione

**Torna alla forma originale** resta raggiungibile dall’intestazione della
scheda e dell’inspector. Preview del costo bonus ordinario e delle conseguenze;
il dominio determina quando scadenza, incapacità, morte o nuovo utilizzo
terminano la forma senza tale comando volontario. Il ritorno non rimborsa
l’uso né recupera azione/bonus/reazione, PF, slot, oggetti o HD spesi.

Esempio vincolante della ricerca: druido 3, 12/24 PF, forma con 3 PF temporanei,
5 danni → 10/24 PF; ritorno conserva 10/24 e uso speso. Forma Selvatica non usa
i PF della bestia come seconda barra. Non cancellare indiscriminatamente i
PF temporanei rimasti usando la politica diversa di Metamorfosi.

**Registra/correggi forma con motivo** dichiara situazione e dati variati;
non esegue un finto lancio o azione gratuita. Una conseguenza pendente pertinente
blocca l’applicazione incompatibile e offre Apri richiesta; non impedisce di
leggere la forma o operare su altri attori. Undo conserva l’evidenza dei dadi
già accettati secondo lo store esistente.

### 6. Posizionamento libero successivo e turni

**Posiziona sulla mappa** prepara una pedina dell’istanza esistente. Mappa
attiva autorizzata, nome pubblico, punto/ingombro in preview; click o drag,
frecce e conferma da tastiera, Esc annulla solo il posizionamento. Coordinate
continue; eventuale aggancio alla griglia è una scelta già dichiarata della
scena, non una nuova obbligatorietà a caselle. Non ripetere il lancio o i costi.

Nessuna scena autorizzata: la creatura resta utilizzabile dalla sola scheda;
spiegare perché la mappa non è disponibile. Pedina già presente nella scena:
**Seleziona** la stessa, senza duplicare. Per comparsa vincolata da distanza,
luogo libero o visibilità, il dominio valida il punto prima della conseguenza
che lo richiede. “Posiziona più tardi” non elimina un vincolo della magia.

In preparazione, la pedina resta nella bozza DM finché questa è salvata;
in gioco la collocazione usa il comando live autorizzato. Non bypassare la
preparazione dirty, non attivare/rivelare scene implicitamente e non cancellare
modifiche spaziali o risorse concorrenti. Rimozione dall’incontro, rimozione
della pedina e termine della creatura restano azioni separate.

Il famiglio ha iniziativa e reazione proprie; l’inserimento nell’ordine mostra
il rapporto di turno e usa dadi fisici/digitali esistenti. Selezionare padrone
o compagno cambia solo il soggetto dei comandi. Non aggiungere attacchi al
famiglio, turni gratuiti, reset di reazione o budget per averlo selezionato.
Altri rapporti di iniziativa, cavalcature e ordini del padrone richiedono la
regola della specifica fonte, non una generalizzazione del famiglio.

## Dati e capacità richiesti all’API unica

Richieste del consumer da risolvere nell’handoff del root: **non firme già
esistenti**. Prima di implementare, il documento API dovrà nominare le funzioni
che producono ciascuna riga e i test che ne fissano la semantica.

| Necessità UI            | Dati/garanzia minima richiesta                                                                                                                                                                                 |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalogo selezionabile  | Riferimento immutabile, nome proiettato, tipo/GS/movimenti, fonte EN/IT, ammissibilità, nota/recente e motivi localizzati. Accesso negato non restituisce titoli o conteggi segreti.                           |
| Riepilogo soggetto      | Forma attiva, base accessibile, profilo effettivo e contributi; livelli pertinenti e risorse canoniche. Nessuna copia autonoma di slot/PF/HD nel controller UI.                                                |
| Creature collegate      | ID istanza/attore, fonte/relazione, stato ciclo di vita, PF autorizzati, nomi pubblici, controllo, posizioni visibili e regola del turno. Modello e istanza distinti.                                          |
| Permessi                | Lettura/controllo/base privata/fonte/posizionamento/gestione relazione distinti, rivalidati a ogni query e Apply. ACL mutabile separata dalla revisione della definizione.                                     |
| Preview di un comando   | Scelte normalizzate, costi per soggetto/pool/fase, prima/dopo, dati conservati, equipaggiamento, tempHP, durata, errori/warning, `canApply`, chiave di revisione pertinente, metadati commit local/visibility. |
| Operazione durevole     | ID stabile, fase e risultato applicato, fonte immutabile, contesti soggetto/incantatore/creatura distinti. Retry restituisce lo stesso risultato; reload non ripete pagamento o creazione.                     |
| Attività lunga          | Durata/fase/progresso da tempo narrativo, componenti e costo della modalità scelta, condizioni d’interruzione/completamento e comando per riaprire l’attività. Nessun timer di browser.                        |
| Fine/ritorno/correzione | Causa specifica e costi, delta sullo stato attuale, conservazione di danni/consumi/effetti/oggetti e risultati acquisiti. Motivo obbligatorio per correzioni.                                                  |
| Collocazione            | Attore esistente, scena autorizzata, punto libero, ingombro/raggio di comparsa quando richiesto; risposta tipizzata per già presente, geometria cambiata o scena non disponibile.                              |
| Turni e azioni          | Politica iniziativa/reazione, azioni consentite/vietate con motivi, identità di chi paga un ordine; profilo effettivo comune a scheda, Tavolo e resolver.                                                      |
| Storico                 | Eventi proiettati leggibili anche se forma/istanza non più attiva, senza esporre fonte/base privata e senza comando di riapplicazione dove non consentito.                                                     |

Il consumer usa soltanto queste proiezioni; niente query fatte con il ruolo di
un altro soggetto per costruire la preview. Le chiavi invalidano cambiamenti
pertinenti, non qualsiasi nota aggiornata sulla scheda. Gli update di una
definizione richiedono un confronto esplicito; una forma già attiva non cambia
statistiche quando qualcuno salva una nuova revisione del catalogo.

## Errori, rete e accessibilità

- **Annulla/Esc prima di Apply:** nessuna spesa o istanza; il ritorno mantiene
  tab/soggetto. Dopo avvio durevole: chiudere minimizza l’attività, non la revoca.
- **Errore di campo:** resta nel form con input e scelte intatti; focus sul
  messaggio/campo pertinente. Nessun commit preliminare che distrugge il form
  prima di validare un dado fisico o una selezione.
- **Costo ignoto/finito, azione già spesa, fonte non abilitata:** motivazione
  specifica e comando di correzione/consultazione raggiungibile. Non scegliere
  un altro pool o un altro controllore per far passare l’operazione.
- **Conflitto/revoca:** refresh della proiezione, nomi e base non più autorizzati
  scompaiono anche dalla preview già aperta; conserva soltanto input privato
  ancora autorizzato. Apply resta disabilitato fino a nuova verifica valida.
- **Offline:** proiezioni locali leggibili; mutate condivise attendono rete.
  Percorso personale segue il commit proiettato e non auto-collega la campagna.
  Retry/reload conserva ID e risultati: nessuna evocazione o spesa doppia.
- **Tastiera e touch:** elenco filtrabile con vero stato selezionato, motivi
  leggibili senza hover, CTA principale unica di applicazione. Confronto e
  costi raggiungibili su mobile; durante puntamento Mappa/Dettagli restano
  raggiungibili. Rerender conserva dettagli aperti, facce, focus e scroll.

## Sintesi delle fonti di prodotto e adattamenti

Le date sono quelle riportate in R193, consultazione 23/09/2026; ogni riga
descrive **capacità pubblicate**, mai un’interazione osservata da questo autore.

| Fonte                                                | Evidenza riusata e adattamento, con limite                                                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 Foundry Transform, wiki 10/09/2026, 6.0.0        | Capacità→profili/criteri→scelta. Separiamo forme note/ammissibili e semplice aspetto; preset di edizioni diverse non sono regole 2024.                                        |
| S02 Foundry Transformation, stessa data/versione     | Ritorno visibile e token ricollegati. Conserviamo stato vivo; duplicazione interna di attori e limiti Foundry di pulizia GM non diventano requisiti dell’app.                 |
| S03 Foundry Summon, stessa data/versione             | Uso→profilo→collocazione anche successiva. Separiamo attività, istanza e token; esempi di altre edizioni non autorizzano automatismi.                                         |
| S04 D&D Beyond Adding Tokens, 17/02/2026             | Extra/Companions→mappa. Creatura ritrovabile dalla scheda senza token nella scena. Nessuna equivalenza automatica fra schema Beyond e nostro dominio.                         |
| S05 Beyond Combat Encounters on Maps, 17/02/2026     | Gruppo/compagni/PNG nell’incontro e rimozione distinta dalla mappa. Selezione, schieramento e turno separati; la formula d’iniziativa del supporto non è adottata come norma. |
| S06 Beyond changelog, 10/02/2026                     | Statistiche/PF dei compagni personalizzati disponibili, ma scrittura PF da Maps dichiarata limitata a quella data. La nostra coerenza bidirezionale richiede prova propria.   |
| S07 Shard Character Sheet, anno/versione non esposti | Compagni, copie individuali, forme recenti e ritorno. Il modello storico dei PF bestia non è Forma Selvatica 2024.                                                            |
| S08 BG3 Patch 6, 16/02/2024                          | Comando visuale su soggetti controllati, seguaci inclusi. I costi individuali del tavolo devono comunque essere verificati.                                                   |
| S09 BG3 Patch 7, 05/09/2024                          | Casi di regressione su ritorno, sovrapposizioni, anatomia e oggetti. Non prova regole 2024 né copertura runtime qui.                                                          |
| S10 Solasta Primal Calling, 03/11/2021               | Compagni e forme con adattamenti dichiarati. Non copiamo GS, PF separati o costi del videogioco.                                                                              |
| S11 Roll20 Linking Tokens, 12/08/2025                | Barre collegate possono propagare PF fra copie. Un’istanza per creatura, con token e modello distinti.                                                                        |
| S12 Roll20 Token Features, 04/09/2026                | Controllori multipli, barre e note GM con visibilità diversa. Adottiamo permessi distinti, senza autorità del DM sulle note personali altrui.                                 |
| S13 Owlbear Permissions, data/release non esposte    | Creazione/modifica/rimozione e Owner Only. Controllo token chiaro, senza attribuire un motore di evocazione o visione condivisa non provato.                                  |

I link primari completi, i limiti di accesso e le pagine SRD sono in R193.
Non vengono importati testi o asset commerciali.

## Sequenza di consegna dopo l’handoff API

- [ ] **A — Contratto del consumer:** root/domain assegnano funzioni, schema e
      export nei file riservati; esempi di preview per quattro percorsi, tempHP preesistenti, oggetti
      e accesso revocato. Non scrivere consumer contro firme speculative.
- [ ] **B — Extra/istanza/collocazione:** test RED di compagno manuale e due
      istanze dello stesso modello; implementare proiezione/handler e passare le
      prove 1, 8, 9, 11. Root raccorda scheda e Tavolo senza duplicare attori.
- [ ] **C — Famigli:** test RED di lifecycle, scelta Wild Companion e attività
      lunga; implementare i soli comandi con fase/costi verificati e passare 4–7.
- [ ] **D — Forma Selvatica:** test RED di conservazione stato, tempHP,
      equipaggiamento e ritorno; passare 2–3 e 10. Scheda/Tavolo/combat leggono
      lo stesso profilo, altrimenti la fetta non è dimostrata.
- [ ] **E — Verifica distinta:** handler su nodi ricreati, suite domain e
      integrazione, browser root EN/IT/touch, reviewer indipendente e snapshot
      effettivo dei file dirty. Il coordinatore decide commit/integrazione.

## Prove browser/handler prioritarie, non ancora eseguite

| #   | Percorso                                                                            | Esito da verificare                                                                                                           |
| --- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Sola scheda privata→Extra→compagno manuale→reload→scheda del compagno               | Stessa istanza; nessuna campagna/pedina/visibilità pubblica automatica. Dati ignoti dichiarati.                               |
| 2   | Druido 3, 12/24 PF→forma candidata→Esc; poi Apply→5 danni→ritorno                   | Primo gesto senza spesa; secondo spende una volta, PF finali 10/24 con tempHP iniziali 3. Nessun reset di consumi/turno/note. |
| 3   | TempHP già presenti e inventario con oggetti consumati/sintonizzati→forma→ritorno   | Scelta tempHP, destinazioni per oggetto, effetto dei fusi, nessuna quantità/sintonia ricreata.                                |
| 4   | Compagno Selvatico con slot e ultimo uso Forma disponibili→scegli uso→retry         | Un solo pool speso, folletto unico; fine al lungo del druido e non di un altro attore.                                        |
| 5   | Trova Famiglio ordinario→attività lunga/rituale→completa→congeda→ricompare→0PF      | Tempo e materiali pertinenti, costi/fasi espliciti; dopo 0 serve nuovo lancio, non Ricompari.                                 |
| 6   | Famiglio già presente→nuovo lancio/cambio forma→reload                              | Limite rispettato, nessun secondo attore gratuito o reset dovuto alla riapertura.                                             |
| 7   | Compagno in scena→iniziativa fisica/digitale→seleziona padrone/famiglio→passa turno | Turno/reazione corretti, nessun attacco del famiglio e nessun budget ripristinato dalla selezione.                            |
| 8   | Extra→posa libera con drag/frecce→Esc→posa→riapri→altra scena                       | Esc non spende; seconda posa seleziona l’istanza esistente; rimuovere pedina/incontro non cancella creatura.                  |
| 9   | Secondo controllore/revoca con preview aperta; DM su contenuto personale altrui     | Stato unico, autorità rivalidata, nessun nome/base/fonte privata in HTML/log/link/ricerca o preview cached.                   |
| 10  | Concentrazione attiva→forma→danno→TS fisico pendente→reload→ritorno/correzione      | Nessuna perdita dalla sola trasformazione, niente faccia duplicata o conseguenza cancellata; blocco solo pertinente.          |
| 11  | Due copie dello stesso modello→PF diversi→modifica/revisione del modello            | Risorse indipendenti, nessuna propagazione silenziosa o aggiornamento retroattivo delle forme attive.                         |
| 12  | Laptop IT e telefono EN, tastiera/Esc, offline, errore di campo e cambio identità   | Controlli/focus raggiungibili, input recuperabili, applicazioni condivise coerenti con rete; nessuna impersonazione.          |

Queste prove non sostituiscono il test del dominio sui valori e sulla fonte.
Metamorfosi richiede una prova separata con incantatore/bersaglio, TS,
concentrazione, statistiche mentali e tempHP propri. Restano obblighi aperti:
cavalcature/combattimento in sella, sensi condivisi completi, effetti intangibili,
seguaci duraturi, sottoclassi/catalogo completo, evocazioni multiple,
sovrapposizioni, anatomie/spazi speciali e deleghe multiplayer reali.
La sequenza dell’incremento non li elimina dal contratto generale.

## Verifica di questo documento

Verifica documentale eseguita: Prettier, **14 collegamenti locali risolti**,
ricontrollo del piano rispetto a R193 e al piano 9 del coordinatore. Questo
subtask ha scritto soltanto il presente Markdown; nessun source o documento
condiviso modificato. Nessuna prova UI9 già compiuta e nessuna approvazione del
proprietario inventata. Hash e handoff comunicati al root e all’autore dominio.
