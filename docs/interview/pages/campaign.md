# Campagna — pagina concettuale e raccordo del blueprint

23/09/2026. Aggiornamento dell'agente sotto delega I-180/I-190/I-202 e nel
percorso I-205/I-206/I-212/I-215 di [APP_BLUEPRINT](../APP_BLUEPRINT.md).
Questa pagina collega il contratto parziale al **checkpoint locale incremento 7**:
non attribuisce all'owner una nuova approvazione, non dichiara completa la
Campagna e non trasforma il prototipo in un servizio di produzione.

I passaggi dettagliati, gli stati e i raccordi tecnici sono in
[CAMPAIGN_FLOW](../CAMPAIGN_FLOW.md). Le decisioni storiche rimangono in
[DECISIONS](../DECISIONS.md); gli esiti sono nei rapporti di implementazione e
review, non dedotti dalla sola presenza di una voce nel menu.

## Scopo e autorità

La Campagna permette di ritrovare persone, schede, ultimo resoconto e prossimo
appuntamento, entrare al Tavolo e continuare a scrivere dopo la partita.
Nessun mondo, mappa, data o resoconto è obbligatorio per giocare. La scheda e gli
Appunti personali restano utilizzabili senza campagna, anche con il resto del
gruppo su strumenti esterni, I-052/I-101.

| Livello                                        | Contenuto                                                                                                                                                                                                                                                                                                                              |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Acquisito dall'intervista                      | Note Solo io / Io e i DM / persone scelte; lettura, modifica e inviti distinti; revoca con contributi salvati conservati, I-044–051. Disponibilità facoltative e data diretta, I-094. Mondo e missioni facoltativi, I-099/I-100. Diario per sessione e lettura del riepilogo all'avvio, I-117. Navigazione collegata e ritorni, I-212. |
| Scelta operativa dell'agente nell'incremento 7 | Bozza privata prima dell'applicazione, preview dei destinatari, revisioni e confronto esplicito, ripristino del testo, organizzatore distinto dal rispondente, data con fuso e istante espliciti. Sono adattamenti documentati e correggibili sotto delega, non nuove conferme storiche dell'owner.                                    |
| Ancora da completare                           | Amministrazione della campagna e dei ruoli, inviti reali/ospiti, trasferimento e uscita, collaborazione remota, calendario narrativo, media e altre famiglie elencate sotto.                                                                                                                                                           |

## Navigazione e contenuti

La navigazione locale conserva **Panoramica, Gruppo, Sessioni, Diario, Mondo,
Preparazione, Impostazioni**, con ingresso evidente al Tavolo. Appunti è un
servizio autonomo raggiungibile anche dal Tavolo: non confluisce nel Diario
condiviso e non aggiunge una nuova sezione globale. Cambio campagna, cambio
vista e ritorno non trasferiscono schede o applicano effetti di gioco.
[NAVIGATION](../NAVIGATION.md) e [NAVIGATION_COVERAGE](../NAVIGATION_COVERAGE.md)
conservano i raccordi dell'intera app.

| Area         | Contenuto e controlli presenti nel checkpoint                                                                                                                                                                            | Confine                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| Panoramica   | Ultimo resoconto salvato e leggibile, prossimo appuntamento confermato, schede accessibili del gruppo, materiale rivelato, Apri Diario/Sessioni/Mondo/Appunti ed Entra al Tavolo.                                        | Niente riassunto inventato, bozza privata esposta o sondaggio trattato come appuntamento confermato.       |
| Gruppo       | Nomi, classe e PF delle schede accessibili; Apri scheda usa lo stesso personaggio della raccolta e del Tavolo.                                                                                                           | Non è il riepilogo DM completo F-053; non assegna controllo o proprietà.                                   |
| Sessioni     | Data già concordata, Raccogli disponibilità, Registra partita giocata; risposte personali, ritiro, conferma dell'organizzatore, cambio/annullamento di una data. Scrivi resoconto conserva il riferimento alla sessione. | Appuntamenti reali distinti da tempo narrativo, riposi e conclusione del Tavolo.                           |
| Diario       | Resoconti e obiettivi, ricerca nel testo consentito, filtro per tipo, bozze proprie e dettagli con collegamenti/storico.                                                                                                 | Nessun premio, avanzamento della missione o trascrizione automatica dal log dei dadi.                      |
| Mondo        | Persone, luoghi, fazioni e altre voci; ricerca, filtri, editor comune, collegamenti a voci accessibili.                                                                                                                  | Una voce narrativa non crea automaticamente statistiche PNG, token, relazioni dedotte dalla prosa o mappe. |
| Appunti      | Note proprie e condivise con l'identità corrente; nuova nota anche personale senza campagna, contesto e destinatari espliciti.                                                                                           | Ruolo DM e controllo della scheda non aprono note Solo io.                                                 |
| Preparazione | Raccordo al percorso esistente di scene/incontri/materiali.                                                                                                                                                              | Salvare, rivelare e attivare restano comandi distinti: vedere [Preparazione](preparation.md).              |
| Impostazioni | Indicazione esplicita del ramo amministrativo ancora da collegare; accessi delle singole voci gestibili dal loro dettaglio.                                                                                              | Nessun pulsante finto di invito, promozione, trasferimento o cancellazione.                                |

Dopo rimozione della membership corrente, le nuove viste della campagna non
mostrano più gruppo, materiale rivelato o appuntamenti. Restano separati gli
Appunti personali e le proprie bozze recuperabili. Questa protezione locale
non è una dichiarazione di revoca distribuita su ogni dispositivo o di
rifacimento dell'autenticazione delle altre aree del prototipo.

## Percorso prima e dopo la partita

1. Da Inizio o Campagne si apre la Panoramica. In assenza di riepilogo o data
   si può comunque entrare al Tavolo.
2. **Leggi il resoconto** apre soltanto il testo consentito. La sessione e il
   personaggio narrante, se indicati e leggibili, danno contesto; proprietà
   della voce e autore della revisione rimangono distinti.
3. Un collegamento al luogo o alla persona apre la voce autorizzata.
   **Torna indietro** riporta al resoconto anche dopo reload, con una sola
   origine conservata. Il link non concede il permesso di leggere la meta.
4. **Entra al Tavolo** e il ritorno alla Campagna cambiano vista sullo stesso
   stato: niente consumo, riposo, attivazione di incontro o fine sessione.
5. Si scrive un nuovo resoconto dal Diario o dalla sessione pertinente. Una
   partita improvvisata è registrabile come giocata senza inventare una data.
   Basta testo; titolo, sessione, punto di vista e collegamenti sono facoltativi.
6. Si salva la bozza, si controllano destinatari e preview, quindi si applica.
   Una nuova data può essere registrata direttamente oppure scelta tramite
   disponibilità facoltative; il resoconto non obbliga a programmare l'incontro.

## Scrivere, vedere l'esito e tornare

**Nuovo / Modifica** apre una bozza privata. Il testo si conserva con
**Salva bozza e aggiorna anteprima**; questo non pubblica e non conferma una
data. La preview mostra l'ultima bozza salvata e distingue le modifiche ancora
non salvate. **Come lo vedrà…** filtra sezioni e link per il destinatario della
proposta, senza cambiare l'identità attiva o aprire segreti estranei alla bozza.

**Salva contenuto per questi destinatari** applica il testo soltanto dopo
rivalidazione. **Scarta bozza** non cancella la voce già salvata. Uscire con
modifiche consente restare, salvare soltanto la bozza o scartare le modifiche
non salvate. Ritorno esplicito, navigazione, Back/hash e cambio identità usano
le guardie della shell; le bozze salvate si riaprono dopo reload sul dispositivo.

L'aggiunta di una sezione lascia aperti i relativi campi e porta il focus al
nuovo titolo. I gruppi di campi espandibili non si richiudono dopo aggiunta,
rimozione, scelta dei destinatari o salvataggio. Il dettaglio e l'editor
mantengono evidenziata la sezione locale Diario/Mondo/Sessioni.

## Destinatari, contributi e storico

«Gruppo» significa membri autorizzati della campagna, non Internet. La scelta
operativa iniziale delle nuove voci è privata; collegare una nota alla campagna
non la condivide. Una nota senza campagna può restare Solo io, poi acquisire
contesto senza essere copiata. Una persona può leggere una voce senza poterla
modificare; chi modifica non invita altri senza delega separata.

Il proprietario gestisce l'accesso. **Gestisci condivisione** separa permessi
individuali e accesso del gruppo; rimuovere un permesso aggiuntivo non revoca
un accesso ancora valido tramite il gruppo. **Invita un lettore**, per un
collaboratore delegato, concede solo lettura a un membro corrente della
campagna: non modifica proprietà o assegna altre deleghe.

Le sezioni hanno propri lettori. Chi può modificare la voce può modificare le
sezioni che legge; non esistono permessi separati di modifica/invito della
singola sezione. Gli editor non creano/rimuovono sezioni né cambiano destinatari.
Il salvataggio conserva le sezioni, i link e i riferimenti narranti che l'editor
non può vedere. La proiezione precede estratti, ricerca, link, conteggi e storico.

La revoca blocca nuove letture/pubblicazioni non autorizzate e conserva i
contributi già salvati, I-051. Una bozza propria rimane recuperabile; non
consente però di applicare testo senza più permesso. Nessuna promessa di
cancellare dalla memoria o da copie esterne informazioni già viste.

**Cronologia accessibile** richiede accesso corrente e diritto a quella versione:
condividere il testo corrente non rende leggibile ogni vecchia versione privata.
Autore e data mancanti nella migrazione restano ignoti. **Rivedi il ripristino**
crea una nuova bozza/versione del testo; conserva gli accessi correnti e le
sezioni più recenti. Una sezione storica rimossa torna privata. Non ripristina
PF, dadi, inventario, appuntamenti o altri snapshot di gioco.

## Date reali, errori e salvataggio

Data/ora civile, fuso IANA e istante UTC sono distinti. Una data impossibile o
un'ora inesistente nel cambio legale è bloccata, non spostata automaticamente.
Se l'ora si ripete, la persona sceglie l'istante. Le liste mostrano ora locale
con il nome del fuso del dispositivo e, separatamente, ora e fuso concordati:
le date possono differire attraversando mezzanotte.

| Stato                                    | Comportamento presente                                                                                                                                                                                                     |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bozza incompleta o errore di salvataggio | Mantiene i campi; mostra cosa correggere; una preview non valida non abilita Applica. Nessun successo fittizio.                                                                                                            |
| Voce/accessi/appuntamento cambiati       | Mantiene la bozza, mostra confronto con lo stato corrente e richiede adozione esplicita della nuova base. Nessuna fusione automatica o sovrascrittura silenziosa.                                                          |
| Offline                                  | Bozze locali e operazioni personali consentite restano disponibili; applicazione condivisa, ACL, disponibilità e conferma della data richiedono connessione. Il cambio di contesto di una voce esistente viene rivalidato. |
| Memoria locale non disponibile           | Distingue il dato rimasto nella scheda del browser dal salvataggio durevole; niente garanzia di recupero dopo chiusura.                                                                                                    |
| Reload                                   | Riprende la bozza salvata e il riferimento di ritorno; testo non salvato dopo arresto, backup remoto e sincronizzazione fra dispositivi non sono dimostrati.                                                               |
| Nessuna risposta al sondaggio            | Non equivale a No. Sì/Forse/No e Ritira riguardano soltanto la propria risposta a quella alternativa.                                                                                                                      |
| Cambio/annullamento appuntamento         | Mantiene storico e vecchie disponibilità riferite al loro orario; non le reinterpreta come adesione alla nuova data. Non applica riposi o tempo narrativo.                                                                 |

Le mutazioni narrative e di agenda sono escluse dall'Undo globale della partita.
Correggere una conseguenza al Tavolo non può cancellare testo o resuscitare
accessi revocati; correggere un testo non annulla una conseguenza di gioco.

## Capacità acquisite ancora da raccordare completamente

Il percorso futuro di ingresso conserva invito leggibile prima dell'adesione,
accettazione esplicita e scelta/creazione di una scheda propria o offerta dal
DM; non conferisce controllo per la sola presenza nella campagna. Rimangono
consenso, concorrenza e vincoli della stessa scheda fra campagne.

DM/co-DM/giocatore/ospite mantengono i confini acquisiti I-037–043/I-135.
Passare alla modalità giocatore non revoca il ruolo; revocare co-DM non rimuove
automaticamente il giocatore. Ospite senza personaggio, inviti reali,
assegnazione/delega, uscita, trasferimento I-177, backup I-178, archiviazione,
cancellazione e conclusione per tutti richiedono i propri percorsi. La demo
player/dm non li simula aggiungendo identità con accessi incoerenti.

Restano editor ricco, commenti/media, collaborazione simultanea, notifiche,
ricorrenze e calendari esterni, modifica/chiusura del sondaggio aperto, picker
completi di link a schede/scene/Homebrew e calendario del mondo. Accordi, beni
comuni, basi, magie condivise, scene scritte e altri materiali conservano
F-025/F-032/F-034/F-035/F-039/F-040/F-042/F-046; il presente incremento non li
ritira. Discord voce/musica, registrazione e generazione di resoconti non sono
reimplementati o dedotti da questa pagina.

## Fonti ed evidenza effettiva

[R191 e ricerca campagna](../../../changes/interview-01/blueprint-campaign-research.md)
conservano fonti primarie, date/versioni, accessi e adattamenti: Foundry,
Kanka, LegendKeeper, World Anvil, D&D Beyond, Roll20, Obsidian Portal,
WhenIsGood e Apple Note. R023–029, R037/R171, R073, R094, R112, R129 e R154
rimangono precedenti storici. Non si dichiara runtime concorrente osservato o
playtest umano; i pattern pubblicati non dimostrano la riuscita della nostra
combinazione.

La revisione di questa pagina del 22/09/2026 aveva riconsultato solo
documentalmente questi precedenti, senza login o inviti reali; se ne conserva
la provenienza storica, senza rivendicare una nuova verifica in questo passaggio:

- [Beyond — Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  aggiornamento 27/08/2025: alternative d'ingresso con scheda propria o offerta
  dal DM; non prova consenso, proprietà o poteri dell'ospite della nostra app.
- [Kanka — Prep a Session](https://kanka.io/learn/prep), Jon, 10/04/2026:
  ripresa dal diario e collegamenti; durata promozionale non misurata e
  calendario narrativo distinto dall'appuntamento reale.
- [Roll20 — Invite, Promote and Manage Players](https://help.roll20.net/hc/en-us/articles/29620515876375-Invite-Promote-and-Manage-Players),
  28/07/2026: inviti, promozione/retrocessione e rimozione distinti; nessuna
  adozione automatica dei suoi poteri GM, scadenze o modello Creator.

- [Rapporto UI](../../../changes/interview-01/blueprint-campaign-ui.md): autore
  UI, 20 test di handler e 55 combinati al suo checkpoint; hash dei file e limiti.
- [Rapporto dominio](../../../changes/interview-01/blueprint-campaign-domain.md):
  API, migrazione, autorizzazioni, storico, date e test del rispettivo autore.
- [Review indipendente](../../../changes/interview-01/blueprint-campaign-review.md):
  R1–R5 corretti e ricontrollati, 75 test mirati e 304 complessivi riportati dal
  reviewer sul candidato indicato. Nessun P1/P2 residuo nel perimetro letto.
- Browser del coordinatore: Note e World con esiti registrati nei rapporti;
  verifiche finali EN/IT, telefono/desktop, tastiera/touch e regressioni della
  shell sono in chiusura al momento di questo aggiornamento. Non sono state
  eseguite dall'autore documentale né sostituite dagli screenshot.

Le stesse azioni devono restare raggiungibili su telefono e desktop, con focus
nativo, stato/errori non comunicati solo dal colore e nessun comando riservato
all'hover. Le etichette EN/IT non traducono o pubblicano il testo dell'utente.
Il checkpoint resta locale e parziale: non certifica autenticazione,
sincronizzazione remota, sicurezza di produzione o completezza del prodotto.

## Dove si trova ogni funzione nel blueprint — candidata del 01/10/2026

Una riga per funzione del [censimento](../CAPABILITY_CENSUS.md): stato della candidata con il file di prova (PROVEN, PARTIAL, OPEN-DECISION, EXCLUDED: legenda del censimento) e posto naturale nel blueprint, come lo scrivono i controlli. Superfici costruite da nominare: la barra laterale a gruppi (Campagna, Racconto, Ambientazione, Gioco, Gestione DM), «Reclutamento» (Gestione DM) e «Trova un tavolo», la pagina d'invito con le quattro strade per entrare con un personaggio, «Cedi il ruolo di DM», Sicurezza (linee e veli, carta X), Dati e istantanee.

### Campagna — pannello, diario e mondo

- **CA-01** Panoramica: prossimo incontro, ultimo riepilogo, gruppo, entra al Tavolo — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Inizio › Apri campagna → Panoramica
- **CA-02** Creare una campagna: nome, immagine, descrizione, regole 2024, prossima data — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Inizio › Crea campagna → modulo
- **CA-03** Cruscotto con riquadri configurabili, anche diversi per ruolo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Personalizza» offers «Elenco filtrato di voci», «Calendario delle sessioni», «Anteprima di una voce».
- **CA-04** Messaggio d'inizio sessione per i giocatori — PROVEN · [final-review-completeness][ev-final-review]. Dove: Panoramica › riquadro «✦ Messaggio d'inizio sessione» › Scrivi messaggio › spunta «Mostralo ai giocatori…» › Salva
- **CA-05** Sezioni della campagna disattivabili se non usate — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Gestione DM (apri) › Impostazioni › Sezioni › interruttore «Tempo libero»
- **CA-06** Discussione asincrona della campagna — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Racconto (apri) › Discussioni › Nuova discussione › Pubblica
- **CA-07** Pagina pubblica della campagna in sola lettura — PROVEN · simulazione · [final-review-completeness][ev-final-review]. Dove: Poi Impostazioni › Permessi
- **CA-08** Diario: resoconti, note, sezioni, collegamenti, storico e ripristino — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Diario › Leggi › Modifica → titolo
- **CA-09** Destinatari espliciti con anteprima del destinatario — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Editor › «Chi può leggere» + «Destinatari effettivi» + «Come lo vedrà… Giocatore»
- **CA-10** Modifiche concorrenti: bozza conservata, confronto, riapplicazione — PROVEN · [audit/reaudit3-a][ev-reaudit3-a]. Dove: DM › Mondo › «Nuova voce del mondo» › title and body › «Salva contenuto per questi destinatari» › «Modifica» › edit › «Salva bozza e…
- **CA-11** Annotazione dal Tavolo senza lasciare il gioco — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Tavolo › Diario contiene solo Materiali/Missioni/Immagini
- **CA-12** Collegamenti fra voci e ritorno alla voce di partenza — PROVEN · [audit/reaudit][ev-reaudit]. Dove: @ in a World entry links an Archive page.
- **CA-13** Blocchi segreti in una pagina con rivelazione per blocco — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Campagna › Archivio › pagina › Modifica › «Aggiungi blocco segreto»
- **CA-14** Retro-collegamenti e menzioni non collegate — PROVEN · [final-review-completeness][ev-final-review]. Dove: Backlinks with context on a World entry.
- **CA-15** Suggerimento di collegamenti dai nomi riconosciuti, solo con conferma — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Unlinked mention linked only after «Collega».
- **CA-16** Nuova pagina annidata dal testo; sposta selezione in nuova pagina — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Archivio › pagina › Modifica › [[Cantina di Oben]] › Salva pagina › link «pagina da creare» › «Crea la pagina annidata» › Crea pagina
- **CA-17** Modelli di pagina e kit di proprietà — PROVEN · [final-review-completeness][ev-final-review]. Dove: Kits, «Salva come modello»; palette «modello».
- **CA-18** Tipi di voce: nota, luogo/mondo, missione, resoconto — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Missione in Racconto › Missioni o nell'Archivio
- **CA-19** Tipi aggiuntivi: persona, organizzazione, negozio, evento, elenco — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Nuova voce del mondo» with every type.
- **CA-20** Schede aperte e segnalibri con avanti/indietro nel diario — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Bookmark and shared tab bar across Mondo and Archivio.
- **CA-21** Riepilogo di sessione preparato in automatico e modificabile — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Prepara bozza automatica» with play events only; Table end offers the draft (P10, not re-driven).
- **CA-22** Archivio di chat e registro fra le sessioni, con riservatezza dei sussurri — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Racconto › Archivio chat
- **CA-23** Esportare o ripulire il registro — PROVEN · [final-review-completeness][ev-final-review]. Dove: Archivio chat › «Svuota l'archivio…» › scrivere «ELIMINA CHAT» › Svuota definitivamente
- **CA-24** Viste salvate e filtrate sulle voci (tabella, schede, colonne) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Saved cards view over World entries and Archive pages.
- **CA-25** Allegati per voce con visibilità propria (immagini, PDF) — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Voce › Allega un file › Carica dal dispositivo (PDF) › Solo DM › Allega
- **CA-26** Testo eseguibile: prove, TS, danni, premi cliccabili nelle voci — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Nell'Archivio [[/check Atletica 12]] e [[/save DES 13]] diventano link «pagina da creare»
- **CA-27** Voci del mondo con visibilità, collegate a scene e Tavolo — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Tavolo › Diario › Materiali › Spilli › Aggiungi spillo… collegato a «Osservatorio di Bruma», «Visibile ai giocatori»
- **CA-28** Mappa del mondo con spilli collegati, gruppi, livelli, visibilità per spillo — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Mondo (gruppo) › Mappa e calendario › Spillo › clic sulla mappa → modulo
- **CA-29** Mappe annidate mondo → regione → città → dungeon — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Dettagli dello spillo › «Apri la mappa «Cripte del faro»»
- **CA-30** Misurare distanze sulla mappa del mondo — PROVEN · [final-review-completeness][ev-final-review]. Dove: Misura › clic per tappe
- **CA-31** Orologio comune della finzione avanzato dal DM — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Calendario › Avanza il tempo › (Riposi e tempo) 3 Ore › Vedi conseguenze del tempo › Applica
- **CA-32** Calendario del mondo personalizzabile (mesi, lune, stagioni, ere) — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Impostazioni del calendario: mesi (aggiunto «Tredicesima» e navigato fin lì), giorni della settimana, lune, stagioni, data iniziale con…
- **CA-33** Eventi datati con visibilità, ricorrenza e promemoria — PROVEN · [final-review-completeness][ev-final-review]. Dove: Nuovo evento: data e ora, «Si ripete: Ogni anno», «Chi lo vede: Solo DM (da rivelare)», luogo, «Promemoria: 1 giorno prima» → in elenco…
- **CA-34** Cronologie con ere e viste cronaca/calendario — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Cronologia: eventi raggruppati per era, marcatore «Adesso», filtro per luogo, Modifica le ere
- **CA-35** Storia di un luogo aprendo lo spillo (eventi per luogo) — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Spillo › «Storia del luogo (2)» › Apri nella cronologia / Evento qui
- **CA-36** Relazioni fra voci e rappresentazione a grafo o lavagna — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Voce › «Apri nel grafo delle relazioni» → Archivio › Relazioni
- **CA-37** Missioni con obiettivi, stato, ricompense, committente — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Racconto › Missioni
- **CA-38** Fazioni e reputazione per personaggio o gruppo, con visibilità — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Archivio › Reputazione › casella Goblin × Livia › punteggio −4, motivo, «Condivisa: solo la fascia» › Registra
- **CA-39** PNG importante con atteggiamento o lealtà — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Archivio › pagina › Modifica › «PNG importante»
- **CA-40** Connessioni segrete rivelabili — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: Archivio › Relazioni › Aggiungi relazione con «Connessione segreta» spuntata
- **CA-41** Generatori di mondo (città, locande, demografia) — PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world]. Dove: «locanda» › «Genera per la preparazione» (Dungeon, Incontro, Locanda, Centro abitato, Nomi, Muri da mappa), con seme e tiri per campo ›…

### Campagna — sessioni reali

- **CA-42** Appuntamento diretto con ora locale e concordata, conferma, cambio, annullo — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Inizio › «Apri sessioni» › «Data già concordata» › data+fuso › «Salva bozza e aggiorna anteprima» › «Conferma»
- **CA-43** Disponibilità Sì/Forse/No e sovrapposizioni — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Heatmap, totals, best date, «Proposta», names.
- **CA-44** Ricorrenza e pianificazione di più date insieme — PROVEN · [final-review-completeness][ev-final-review]. Dove: Sessioni › «Nuova serie ricorrente…» (precompilata dalla sessione zero) › «Programma le date»
- **CA-45** Salto di una sessione distinto dall'uscita; dopo uno spostamento si richiede — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Sessioni › «Salto la prossima» / «Salto questa»
- **CA-46** Posti limitati con lista d'attesa — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: «Mettimi in lista d'attesa» › «In lista d'attesa
- **CA-47** Promemoria su richiesta e feed calendario — PROVEN · simulazione · [final-review-completeness][ev-final-review]. Dove: Trovato solo così: campagna › «Gestione DM» (giocatore: «Strumenti») › «Integrazioni» › scheda «Calendario» › «Crea il mio link del…
- **CA-48** Presenze registrate per sessione — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Sessioni › «Registra partita giocata» › «Salva bozza…» › «Conferma» › «Registra presenze…» (anche nel riquadro «Presenze da registrare»)…

### Campagna — membri, ruoli e permessi

- **CA-49** Link d'invito con ruolo, scadenza e numero d'usi; cambia dopo un'espulsione — PROVEN · [final-review-completeness][ev-final-review]. Dove: Membri › Inviti: role, expiry, uses → «Link creato: 2X4U-LM9X-J95D»
- **CA-50** Approvazione della richiesta d'ingresso — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Inviti › «Approva ogni ingresso dal link…»
- **CA-51** Pagina d'ingresso con quattro strade per il personaggio — PROVEN · [final-review-completeness][ev-final-review]. Dove: Link › «Come vuoi entrare?» con 4 strade (Crea, Da un personaggio pronto, Reclama, Entra con un tuo personaggio) › scelta › «Controlla…
- **CA-52** Personaggi non assegnati e "Reclama"; più personaggi per giocatore — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: DM: campagna › Membri › «Personaggi» › «Rendi non assegnato»
- **CA-53** Ruoli: DM, co-DM con elenco dei poteri, giocatore, osservatore — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: «Gestione DM» › «Membri» › «Promuovi a co-DM» (il dialogo elenca i poteri) › «Conferma ruolo»
- **CA-54** Espellere, lasciare, disattivare o riassegnare un personaggio — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Membri › «Espelli…»
- **CA-55** Trasferire la proprietà della campagna con accettazione — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Membri › scheda «Gestione» › «Trasferisci la proprietà…» › «Proponi trasferimento»
- **CA-56** Elenco membri con stato online e ordinamento — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: «Strumenti» › «Membri»
- **CA-57** Cedere il ruolo di DM per una sessione — PROVEN · [final-review-completeness][ev-final-review]. Dove: hand-off dialog reads «Livia, Mira · Giocatore»
- **CA-58** Revoca: il gruppo sparisce da elenchi e ricerca, le note proprie restano — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Inizio: «Nessuna campagna accessibile»
- **CA-59** Diritti per oggetto: lettura, modifica, delega, senza onniscienza sul "Solo io" — PROVEN · [final-review-completeness][ev-final-review]. Dove: Appunti › «Nuovo appunto» › «Chi può leggere» (Solo io / Io e i DM / Persone scelte con Legge o Modifica / Gruppo) › «Salva bozza…» ›…
- **CA-60** Vedere la campagna come un membro per verificare i permessi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Vedi come» on the member row.
- **CA-61** Pannello semplice di permessi (disegnare, ping, muovere mostri, bloccare, gruppi) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Impostazioni › Permessi › «Ruolo: Giocatore»: pointer and signals, drawing, templates, «muovere e far agire le creature del DM», lock, «I giocatori possono raggruppare le proprie pedine»…
- **CA-62** Ultimo accesso visibile solo su consenso — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Account e profilo › «Privacy» › «Mostra il mio ultimo accesso…»

### Campagna — sicurezza del tavolo

- **CA-63** Accordi della campagna e aspettative con traccia facoltativa — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: «Gioco» › «Sicurezza» › «Modifica aspettative» › «Condividi con il gruppo» (+ «Ricorda prima di ogni sessione») › «Salva aspettative»
- **CA-64** Linee e veli nel profilo, anonimi, validi per ogni campagna — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Account › Privacy › «Apri il mio profilo di sicurezza» › «Nuova linea»/«Nuovo velo» › «Aggiungi»
- **CA-65** Avvisi di contenuto e argomenti ricordati prima della sessione — PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety]. Dove: Il DM compila «Avvisi per la prossima sessione» e «Ricorda prima di ogni sessione»
- **CA-66** Segnale in gioco: Stop/X anonimo, rallenta, alza la mano con coda — PROVEN · [final-review-completeness][ev-final-review]. Dove: il DM vede lo Stop al centro dello schermo con «Ricevuto»
- **CA-67** Stelle e desideri dopo la sessione — PROVEN · [final-review-completeness][ev-final-review]. Dove: Card della sessione giocata › «Chiedi stelle e desideri…» › Sicurezza › «Chiedi stelle e desideri»
- **CA-68** Filtri personali di contenuto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Profile filter with «Sfuma le immagini…» and «Filtro delle parolacce».

### Campagna — impostazioni, gruppo e dati

- **CA-69** Regole della tavola: preset + interruttori, blocco dopo l'avvio, storico dei cambi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Preset picker; no census IDs.
- **CA-70** Livello di automazione della campagna (assistito/automatico) — PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data]. Dove: Gestione DM › Impostazioni › Regole › «Assistito»
- **CA-71** Politiche di divulgazione: PF nemici, CD, nomi, prove passive fallite — PROVEN · [final-review-completeness][ev-final-review]. Dove: Impostazioni › Regole › «PF esatti / A parole / Nascosta»
- **CA-72** Abilitare in campagna una revisione esatta di un contenuto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Gestione DM › Impostazioni › Fonti › «Gestisci in Biblioteca» → Biblioteca «Campagna» tab says «Contenuti (0)… Crea il primo oppure…
- **CA-73** Fonti della campagna con stati chiari (disponibile, condiviso, bloccato) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Fonti › «Homebrew, voce per voce» with revision and «mancante» rows (empty with the sample data).
- **CA-74** Predefiniti di scene e pedine applicabili alle esistenti con conteggio d'impatto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Scene and token defaults with «Applica alle esistenti».
- **CA-75** Verifica delle dipendenze all'ingresso (homebrew/pacchetti mancanti) — PROVEN · [final-review-completeness][ev-final-review]. Dove: DM «Crea link» (role, expiry, uses) → player «Ho un link d’invito» → «Sei invitato… Entri come Giocatore · Scade … · Usi rimasti 1/1 · Come vuoi entrare?» with the four paths
- **CA-76** Riepilogo del gruppo per il DM (PF, CA, passive, lingue, TS) — PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data]. Dove: Overview › «Apri il riepilogo del gruppo»
- **CA-77** Riposo di gruppo avviato dal DM con partecipanti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Riposi» › Contesto / Tipo › Partecipanti › «Vedi inizio del riposo» › «Avvia riposo»
- **CA-78** Magie condivise del gruppo — PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data]. Dove: Overview › «Apri il riepilogo del gruppo» › «Magie condivise» (or sidebar Gruppo › Magie condivise)
- **CA-79** Assegnare XP e monete al gruppo con divisione — PROVEN · [final-review-completeness][ev-final-review]. Dove: Gioco (expand) › Tesoro › «Assegna PE e monete» › PE / mo / Modalità «Da dividere» / Destinatari / Motivo › «Assegna»
- **CA-80** Basi e proprietà del gruppo — PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data]. Dove: «Basi e ordini» › «Apri le basi» › «Nuova base del gruppo» › «Crea base» › «Aggiungi struttura»
- **CA-81** Veicoli del gruppo con velocità e carico — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Carro» › «Apri i veicoli» › Personaggio/Posto › «Sali a bordo»
- **CA-82** Storico delle modifiche per voce con ripristino come nuova revisione — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Cronologia» in the header with diff and «Ripristinata da…».
- **CA-83** Copia della campagna scegliendo i componenti — PROVEN · [final-review-completeness][ev-final-review]. Dove: Gestione DM › Dati della campagna › «Copia la campagna…» › untick «Giocatori e ruoli» and «Tesoro e scorta» › «Copia la campagna»
- **CA-84** Archivio/stato dormiente e ripristino — PROVEN · [final-review-completeness][ev-final-review]. Dove: Dati della campagna: «Archivia…», «Elimina…», «Crea istantanea…», «Copia la campagna…» open their dialogs
- **CA-85** Eliminazione con conferma digitata e cestino recuperabile — PROVEN · [final-review-completeness][ev-final-review]. Dove: Dati della campagna: «Archivia…», «Elimina…», «Crea istantanea…», «Copia la campagna…» open their dialogs
- **CA-86** Istantanee e ripristino come copia — PROVEN · [final-review-completeness][ev-final-review]. Dove: Dati › «Crea istantanea…» › Nome › «Crea istantanea» › «Ripristina come copia…» (components chosen) › «Ripristina come copia»
- **CA-87** Esportazione della campagna JSON reimportabile e Markdown leggibile — PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data]. Dove: Dati › «Esporta e importa» › JSON or Markdown › «Prepara l’esportazione»
- **CA-88** Copiare elementi fra le proprie campagne — PROVEN · [audit/reaudit3-c][ev-reaudit3-c]. Dove: «Copia in un’altra campagna…» found in: a handout's «Altro» (Preparazione › Materiali), a Diary entry's «Altro», an Archive page, a scene's «Altre azioni», the creature token menu ›…

<!-- Riferimenti delle prove (stato delle capacità) -->

[ev-campaign-hub-world]: ../../../changes/interview-01/audit/campaign-hub-world.md
[ev-campaign-settings-data]: ../../../changes/interview-01/audit/campaign-settings-data.md
[ev-features-management]: ../../../changes/interview-01/audit/features-management.md
[ev-final-fixes]: ../../../changes/interview-01/final-fixes.md
[ev-final-review]: ../../../changes/interview-01/final-review-completeness.md
[ev-home-creation]: ../../../changes/interview-01/audit/home-creation.md
[ev-library]: ../../../changes/interview-01/audit/library.md
[ev-prep-encounters]: ../../../changes/interview-01/audit/prep-encounters.md
[ev-prep-scenes]: ../../../changes/interview-01/audit/prep-scenes.md
[ev-reaudit]: ../../../changes/interview-01/audit/reaudit.md
[ev-reaudit3-a]: ../../../changes/interview-01/audit/reaudit3-a.md
[ev-reaudit3-b]: ../../../changes/interview-01/audit/reaudit3-b.md
[ev-reaudit3-c]: ../../../changes/interview-01/audit/reaudit3-c.md
[ev-services]: ../../../changes/interview-01/audit/services.md
[ev-sessions-members-safety]: ../../../changes/interview-01/audit/sessions-members-safety.md
[ev-sheet]: ../../../changes/interview-01/audit/sheet.md
[ev-spells-inventory]: ../../../changes/interview-01/audit/spells-inventory.md
[ev-table-combat]: ../../../changes/interview-01/audit/table-combat.md
[ev-table-dice-time]: ../../../changes/interview-01/audit/table-dice-time.md
[ev-table-map-vision]: ../../../changes/interview-01/audit/table-map-vision.md
[q166]: ../OPEN.md#q166--dadi-karmici
[q167]: ../OPEN.md#q167--capacità-dei-leader-oltre-il-censimento
[i-233]: ../DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate
[gap-01]: ../REFERENCE_COVERAGE.md
