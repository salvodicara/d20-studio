# Campagna — continuità, testi condivisi e appuntamenti reali

23/09/2026. Raccordo operativo dell'agente per l'incremento 7 del blueprint,
nel perimetro della delega vigente. Implementa una parte dei percorsi acquisiti
I-044–051/I-094/I-099/I-100/I-117/I-212; non aggiunge una nuova approvazione
dell'owner e non chiude il contratto dell'intera app.

La [pagina Campagna](pages/campaign.md) conserva scopo, persone, navigazione e
famiglie ancora aperte. [NAVIGATION](NAVIGATION.md), [Tavolo](pages/game-table.md)
e [Preparazione](pages/preparation.md) conservano gli altri effetti e ritorni.
Le specifiche sotto distinguono il comportamento presente nel prototipo dai
limiti dichiarati; non sono una promessa di collaborazione remota.

## Percorsi collegati

| ID                                | Ingresso e sequenza                                                                                                         | Risultato e ritorno                                                                                                                                  |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| CAM-01 — Riprendere               | Inizio/Campagne → Panoramica → ultimo resoconto leggibile → eventuale voce del mondo → ritorno al resoconto → Tavolo.       | Stesso stato e stesse schede. Nessun obbligo di riepilogo/data, trasferimento, consumo, lettura collettiva marcata o avvio automatico dell'incontro. |
| CAM-02 — Scrivere dopo la partita | Diario → Nuovo resoconto, oppure Sessioni → Scrivi resoconto → testo e riferimenti facoltativi → bozza → preview → applica. | Voce salvata per i destinatari indicati, collegata alla sessione se scelta. Registrare una partita giocata senza data non termina il Tavolo.         |
| CAM-03 — Mondo e obiettivi        | Mondo → persona/luogo/fazione/altra voce, oppure Diario → obiettivo → stesso ciclo di bozza e condivisione.                 | Voci narrative collegate secondo i permessi. Stato dell'obiettivo descrittivo: aperto/completato/fallito/abbandonato, senza premio automatico.       |
| CAM-04 — Appunto personale        | Servizio Appunti, anche dal Tavolo o senza campagna → Nuovo appunto → testo → salva/applica personale.                      | Nota autonoma. Il ritorno conserva il contesto iniziale; da Biblioteca conserva anche la scelta builder/istanza validata.                            |
| CAM-05 — Contribuire              | Dettaglio leggibile → Modifica se consentita → propria bozza privata → confronto/preview → applica.                         | Aggiorna la stessa voce, non una copia; conserva contenuti nascosti all'editor. Inviti e accessi sono comandi distinti.                              |
| CAM-06 — Organizzare              | Sessioni → Data già concordata, oppure Raccogli disponibilità → propria risposta → conferma esplicita dell'organizzatore.   | Appuntamento reale con istante e fuso; cambio/annullamento separati e senza effetti sul tempo del mondo.                                             |

Il dettaglio mantiene tipo, titolo o etichetta neutra, proprietario e contesto
leggibile. La cronologia identifica l'autore della revisione, che può essere
un collaboratore; proprietario, autore e personaggio narrante non sono sinonimi.
Autore/data legacy mancanti rimangono sconosciuti, senza inventare DM o data odierna.

## Protocollo comune delle bozze

**Apri → modifica → salva bozza → controlla preview → applica**. Nuovo,
modifica e ripristino usano questo protocollo; le sessioni riusano il modello
con conferme pertinenti. La bozza appartiene a chi scrive ed è privata anche
quando il testo finale sarà condiviso.

| Controllo/stato                                   | Effetto verificabile                                                                                                                                                                             |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nuovo / Modifica                                  | Crea una bozza persistente privata. Per modifica conserva identità e revisione/accessi di base; non cambia il testo condiviso.                                                                   |
| Testo, titolo e dettagli                          | Titolo facoltativo; serve almeno titolo o testo per una voce applicabile. Sessione, narratore e link sono facoltativi. I campi incompleti possono essere conservati nella bozza.                 |
| Salva bozza e aggiorna anteprima                  | Salva sul dispositivo i dati di lavoro, anche da correggere. Non pubblica, cambia ACL o conferma appuntamenti. Il messaggio distingue memoria locale indisponibile.                              |
| Anteprima                                         | Mostra l'ultima bozza salvata, errori, eventuale confronto e destinatari effettivi. Modifiche non salvate rendono visibile l'anteprima precedente e disabilitano Applica.                        |
| Come lo vedrà…                                    | Sceglie fra i destinatari effettivi della proposta. Mostra soltanto l'intersezione di contenuti leggibili da chi scrive e dal destinatario: non è una selezione generale dell'identità dell'app. |
| Salva contenuto per questi destinatari / Conferma | Rivalida revisione, permessi, appartenenza e dati pertinenti, poi applica una volta. Il retry dello stesso draft applicato restituisce il risultato già registrato.                              |
| Scarta bozza                                      | Richiede conferma; scarta la bozza, senza cancellare voce, sessione, accessi o partita già salvati.                                                                                              |
| Uscita con modifiche                              | Resta, Salva bozza e continua oppure Scarta modifiche non salvate. La seconda opzione salva soltanto la bozza; la terza conserva la precedente bozza salvata.                                    |
| Errore / conflitto                                | Conserva i campi. Il conflitto mostra lo stato corrente e richiede «Ho confrontato…» prima di adottare la nuova base; nessuna fusione automatica del testo.                                      |

Le guardie si applicano a navigazione esplicita, Back/hash e cambio identità;
`beforeunload` segnala le modifiche in corso. La chiusura anomala non è un
salvataggio implicito: recupero dopo arresto riguarda soltanto dati già
persistiti. Non si dichiara autosalvataggio remoto.

Espandere sezioni/link, aggiungere una sezione e cambiare destinatari conserva
l'apertura dei campi e i valori dopo render. Il focus passa al nuovo titolo di
sezione; un normale aggiornamento del modulo non riporta in cima alla pagina.
Queste sono condizioni dei controlli attuali, non un layout definitivo.

## Contesto e destinatari delle note

Una nuova nota può restare **Personale · senza campagna** o avere una campagna
esplicita. Senza campagna è disponibile Solo io. Collegare la stessa nota a
una campagna non crea una copia né la condivide; il cambio di contesto di una
voce esistente richiede rivalidazione e non è una modifica consentita agli editor.

| Visibilità            | Lettori della voce corrente                                                        |
| --------------------- | ---------------------------------------------------------------------------------- |
| Solo io               | Il proprietario; nessun accesso implicito per DM/co-DM o controllori della scheda. |
| Io e i DM             | Proprietario e DM/co-DM correnti della campagna, secondo appartenenza.             |
| Persone scelte        | Proprietario e destinatari selezionati nella campagna.                             |
| Gruppo della campagna | Membri autorizzati della campagna; non pubblicazione Internet.                     |

I permessi individuali sono **aggiuntivi** rispetto al gruppo scelto. Chi può
leggere non modifica automaticamente; l'editor non può invitare senza la
facoltà separata. Il proprietario può concedere/revocare lettura, modifica e
invito dal dettaglio. Se una persona mantiene lettura tramite un gruppo,
rimuovere solo la concessione individuale non deve essere descritto come
revoca totale.

La delega **Invita un lettore** coinvolge un altro membro corrente soltanto
come lettore. Non trasferisce proprietà, abilita modifica/inviti a catena o
manda messaggi esterni. Le regole di invito alla campagna sono un altro flusso,
ancora da completare.

Le sezioni controllano **chi legge**. Gli editor della voce possono modificare
tutte le sezioni che leggono. Solo il proprietario aggiunge/rimuove sezioni o
ne cambia i destinatari; non si espongono deleghe indipendenti di modifica o
invito della sezione. La scrittura di un editor conserva le sezioni, i link e
il riferimento al narratore che la sua proiezione non include.

## Lettura, collegamenti e storico

Prima di costruire liste, risultati di ricerca, estratti, conteggi, link,
preview e storico si applica la proiezione autorizzata. Una destinazione
riservata non lascia il suo titolo o identificatore in un link visibile.
Questo non promette di riconoscere spoiler liberamente scritti nella prosa.

Il picker attuale aggiunge link a voci. Link a personaggi, scene e revisioni
Homebrew già presenti sono risolti tramite i loro controlli d'accesso; i loro
picker completi restano aperti. La consultazione non rivela una scena, assegna
un contenuto della Biblioteca o concede il controllo di una scheda.

**Cronologia accessibile** richiede sia lettura corrente sia accesso alla
versione storica. Condividere la versione corrente non apre tutte le precedenti
versioni private. Le sezioni storiche rispettano anche l'accesso corrente della
sezione; una nuova nomina DM non assegna automaticamente il passato riservato.

**Rivedi il ripristino di questo testo** crea una bozza da una versione
leggibile. Applicare aggiunge una revisione, senza riscrivere il passato.
Conserva gli accessi correnti, mantiene le sezioni più recenti e reintroduce
privatamente una sezione storica rimossa. Nessun ripristino di PF, slot, dadi,
inventario, iniziativa, appuntamenti o permessi obsoleti.

La revoca mantiene i contributi salvati, I-051. La propria bozza resta
recuperabile, ma non dà accesso a versioni nuove o diritto di applicare dopo
la revoca. Quando manca la membership, le nuove viste di consultazione della
campagna e i picker del gruppo non espongono più dati del gruppo; Note
personali e bozze proprie sono separate. Copie esterne e memoria di ciò che
è già stato visto non sono revocabili dall'interfaccia.

## Appuntamento diretto e fusi

**Data già concordata → titolo facoltativo, data/ora e fuso → salva bozza →
preview → Conferma.** Può farlo un organizzatore corrente: nel dominio DM,
co-DM o membro con facoltà esplicita. La UI demo espone le sole identità
player/dm e non pretende di amministrare l'intera matrice dei ruoli.

La risoluzione conserva l'ora civile inserita, il fuso IANA e l'istante UTC.
La preview mostra l'orario concordato e la conversione locale; liste e hub
mostrano l'ora locale primaria etichettata con il nome del fuso del dispositivo,
poi l'ora/fuso concordati su una riga distinta.

- Una data impossibile non viene normalizzata in un altro giorno.
- `Europe/Rome`, **29/03/2026 02:30**: ora inesistente nel passaggio legale;
  viene richiesto un orario valido, senza spostamento automatico.
- `Europe/Rome`, **25/10/2026 02:30**: ora ripetuta; due candidati, scelta
  esplicita dell'istante prima della conferma.
- **13/11/2026 00:30 Europe/Rome** equivale a **12/11/2026 23:30 UTC**:
  data e nome del fuso devono concordare, anche attraversando mezzanotte.

Gli esempi sono fixture sintetiche dei test, non appuntamenti reali. Il
risolutore usa i dati IANA della piattaforma: non è una certificazione della
completezza storica o futura di quel database.

## Disponibilità, conferma, cambio e annullamento

1. **Raccogli disponibilità** apre una bozza con partecipanti correnti e
   alternative di data/ora/fuso. La preview valida ogni alternativa; **Apri
   raccolta disponibilità** applica il sondaggio. Nessun invio esterno.
2. Il partecipante risponde per sé **Disponibile / Forse / Non disponibile**.
   **Nessuna risposta** è distinta; **Ritira risposta** rimuove la propria
   risposta. La risposta si riferisce all'identità/revisione dell'alternativa.
3. Le disponibilità aiutano il confronto ma non confermano una data, nemmeno
   se tutti rispondono sì. L'organizzatore usa **Rivedi conferma** su una
   specifica alternativa, controlla lo stato corrente e conferma esplicitamente.
4. Il sondaggio confermato rimane leggibile nello storico. Una risposta arrivata
   dopo la preview richiede un nuovo confronto prima di confermare. Il retry
   dello stesso risultato non crea un secondo appuntamento.
5. **Cambia data** e **Annulla appuntamento** aprono bozze separate. La preview
   confronta prima/dopo; un cambiamento concorrente richiede nuova base esplicita.
   L'annullamento conserva sessione/storico con motivo facoltativo.

Cambiare l'appuntamento non trasforma le vecchie disponibilità in risposte
alla nuova ora. Un editor per modificare o chiudere il sondaggio aperto resta
da realizzare; non si presenta il cambio dell'appuntamento come tale editor.

Qualunque membro corrente può **Registra partita giocata** senza data
inventata, poi scrivere un resoconto. Una dichiarazione narrativa e un
appuntamento reale non fanno avanzare il tempo del mondo, concludono il Tavolo,
applicano riposi o aggiornano automaticamente missioni/ricompense.

## Ritorni, offline e stato centrale

I ritorni sono route tipizzate, non URL arbitrari. Il passaggio tra due voci
conserva una sola origine per tornare al resoconto; non costruisce una catena
ricorsiva illimitata. Note aperte dalla Biblioteca conservano il suo contesto
di scelta già validato, così tornare non perde la destinazione builder/istanza.
Il riferimento di ritorno non concede permessi sul contenuto di arrivo.

Offline si possono conservare bozze locali e applicare le operazioni che il
dominio classifica come personali. Cambi condivisi, ACL, risposta al sondaggio
e conferma della data richiedono connessione. Riconnettersi non applica
silenziosamente una bozza: permessi, revisione e preview vengono ricontrollati.
Un errore mantiene il testo nella vista; memoria locale indisponibile e invio
condiviso non applicato non vengono chiamati salvataggio riuscito.

Per gli agenti di integrazione:

| Responsabilità  | Stato/API autorevole                                                                                                                                                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Testi           | `state.campaignContent`: voci, revisioni, accessi correnti e bozze. `listCampaignEntries/getCampaignEntry`, `resolveCampaignLinks`, `getCampaignHub` e `previewCampaignAudience` proiettano per il chiamante.                   |
| Ciclo del testo | `create/get/list/save/discardCampaignDraft`, `preview/applyCampaignDraft`; `expectedDraftRevision`, nuova `baseRevisionId` solo dopo confronto, `reviewKey` e risultato applicato. Gestione accessi separata con revisione ACL. |
| Agenda          | `state.campaign.sessions/polls/sessionDrafts`; `resolveSessionTime`, query proiettate, ciclo `SessionDraft`, `baseRevision` esplicita e `setSessionAvailability` per il solo chiamante.                                         |
| UI e shell      | `renderCampaign`, `bindCampaign`, `startCampaignEntry`, `hasCampaignDraft`, `confirmCampaignNavigation`, `resetCampaignView`, `getCampaignSection`. Route `campaign/notes`, `tab=entry/edit`, `id`, `revision`, `returnTo`.     |
| Commit          | `ctx.commit` applica mutazioni atomiche con `undoable:false`; bozze locali/private, applicazione secondo `preview.commit`. Log neutri senza testo o nomi privati.                                                               |
| Migrazione      | Adapter una sola volta da note/diario/riepilogo legacy; conserva proprietà e provenienza, non inventa autore/data o date di appuntamenti ignote. Dati legacy non riconosciuti attivano recupero invece di migrazione parziale.  |

Nessun secondo archivio di note o appuntamenti. L'Undo della partita conserva
lo stato narrativo e gli accessi correnti: non deve annullare una revisione o
resuscitare una condivisione mentre corregge un'azione al Tavolo.
Le firme complete restano nel [rapporto dominio](../../changes/interview-01/blueprint-campaign-domain.md),
non sono duplicate integralmente in questo contratto di flusso.

## Evidenza e limiti del checkpoint

[R191](../../changes/interview-01/blueprint-campaign-research.md) separa capacità
pubblicate, fonti/date/versioni e adattamenti. Il confronto include Foundry
Journals/permessi, Kanka, LegendKeeper, World Anvil, D&D Beyond, Roll20,
Obsidian Portal, WhenIsGood e Apple Note; nessun runtime concorrente o playtest
umano dichiarato. Nessun prodotto viene assunto come prova dell'intera sintesi.

Il [rapporto UI](../../changes/interview-01/blueprint-campaign-ui.md) registra
20 test di handler con nodi ricreati e 55 combinati; il
[rapporto dominio](../../changes/interview-01/blueprint-campaign-domain.md)
registra le proprie verifiche. La
[review indipendente](../../changes/interview-01/blueprint-campaign-review.md)
chiude R1–R5 sullo snapshot esplicito e riporta 75 test mirati e 304 complessivi.
Sono prove locali attribuite ai rispettivi esecutori, non test ripetuti in
questa sincronizzazione documentale. I percorsi browser sono del coordinatore,
che sta chiudendo regressioni e controlli EN/IT, tastiera/touch, telefono/desktop.

Rimangono aperti ruoli/inviti/amministrazione reali, trasferimenti/uscita e
cancellazione, autenticazione e revoca distribuite, coediting, backup/remoto,
editor ricco/media, picker completi, ricorrenze/promemoria/calendari esterni,
modifica del sondaggio aperto e calendario narrativo. Il testo dell'utente
rimane invariato al cambio lingua. Nessuna implementazione di Discord
voce/musica, chiamate, trascrizione o generazione automatica del racconto è
implicita. Questi limiti non ritirano famiglie già acquisite dal prodotto.
