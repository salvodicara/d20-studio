# Oggetti — dalla Biblioteca al tavolo e ritorno

23/09/2026. Percorso concettuale dell'agente su delega I-180/I-190/I-202,
nel raccordo I-205–I-208. Completa scelte ordinarie e collegamenti; non dichiara
completa F-003, le pagine coinvolte o il contratto. Nessun mock o comportamento
implementato. Le nuove adozioni e la ricerca confluiscono in I-210/R173.

**Percorso:** [Biblioteca](pages/library.md) → scegli un oggetto → aggiungi
all'inventario → [scheda](pages/characters.md) → equipaggia o prepara l'uso →
[Tavolo](pages/game-table.md) → esito/correzione → stessa scheda o Biblioteca.
Si può iniziare dalla scheda, usare solo l'inventario personale o registrare
una dotazione decisa fuori dall'app: nessuna campagna, acquisto o crafting
obbligatori, I-052/I-106/I-172.

## Quale comportamento copiamo e perché

Le righe identificano **tutti i gruppi di comandi di questo percorso**. Le fonti
sono documentazione primaria pubblicata o codice già letto, non osservazioni
runtime né prove che una soluzione sia ottimale. Verifiche nuove: 23/09/2026.
R052–R065, R135 e R149 mantengono date e limiti delle verifiche precedenti.

| Gruppo                                                                     | Prodotto e comportamento verificato, URL                                                                                                                                                                                                                                                                                                                                                                                                                                             | Data/versione e accesso                                                                                                               | Scelta adottata e motivo                                                                                                                                                     | Adattamento o lacuna                                                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **INV-01 — Cerca, Apri, Aggiungi, Aggiungi manualmente**                   | Foundry core [Items](https://foundryvtt.com/article/items/): ricerca, creazione e oggetto posseduto distinto dalla definizione. Beyond [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections): aggiunta dall'inventario.                                                                                                                                                                                                             | Lette 23/09; Foundry senza versione/data; Beyond aggiornato 17/09/2025, avverte che la documentazione può differire dalla UI attuale. | Una scelta di catalogo porta all'inventario indicato; aggiunta manuale sempre disponibile per registrare quanto già ottenuto, I-106.                                         | Riepilogo destinazione/quantità e provenienza è sintesi nostra; niente trascinamento obbligatorio né aggiornamento retroattivo silenzioso dalla Biblioteca.                                                                                                                                        |
| **INV-02 — Dettagli, Confronta, Cambia confronto, Nascondi confronto**     | BG3 [Patch 7](https://baldursgate3.game/news/patch-7-now-live_121): confronto richiamabile su controller. Last Epoch [annuncio Season 2](https://forum.lastepoch.com/t/quality-of-life-dungeon-other-improvements-coming-to-last-epoch-april-17th/75217): confronto con l'altro oggetto equipaggiato.                                                                                                                                                                                | R064/R065, consultati 15/09; pubblicati 05/09/2024 e 10/04/2025. Nessun test.                                                         | Confronto facoltativo con un oggetto equipaggiato alla volta, per scegliere senza modificare la scheda, I-083/I-084.                                                         | Non importiamo slot, due-anelli-massimo o giudizio universale «migliore». Scorciatoie controller di Last Epoch discordanti fra fonti R065: non adottate.                                                                                                                                           |
| **INV-03 — Apri contenitore, Sposta, Dividi quantità, Correggi quantità**  | Foundry dnd5e [3.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0): contenitori e spostamento con contenuto. [6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0), #5156: separazione di una pila dal menu.                                                                                                                                                                                                                                    | R135; rilette 23/09. Tag storico 3.0.0, commit 075dd2e, Foundry 11+; release 6.0.0 del 10/09/2026, Foundry 14.                        | Borse consultabili e spostabili con ciò che contengono; quantità esplicite per separare una parte, così non si duplica la dotazione.                                         | Non adottiamo i cinque livelli del riferimento o la copia tra attori. Correzione quantità è adattamento I-028, distinta dal trasferimento. Capacità e borse magiche restano specifiche delle regole.                                                                                               |
| **INV-04 — Equipaggia, Riponi/togli**                                      | Beyond [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections): equipaggiamento in inventario e armi equipaggiate nelle azioni. Foundry dnd5e [3.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-3.0.0): equipaggiamento nella modalità di gioco.                                                                                                                                                                       | Lette 23/09; limiti Beyond e tag storico sopra.                                                                                       | Comando vicino all'oggetto, risultato visibile sulla stessa scheda e fra le azioni pertinenti; riduce la ricerca durante il turno.                                           | Gesto UI non decide durata, mani o competenze. Si applica la regola 2024 del caso, non un interruttore gratuito universale.                                                                                                                                                                        |
| **INV-05 — Gestisci sintonia**                                             | Beyond [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections): sintonia dall'inventario. [SRD EN 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), pp. 102–103: requisiti, riposo e limite.                                                                                                                                                                                                           | Beyond letta 23/09; SRD immutabile locale verificato, edizione 2024.                                                                  | Stato e requisiti sull'oggetto; scelta collegata al riposo pertinente, per non confondere possesso e benefici magici.                                                        | Preparare la scelta non conclude il riposo. Correggere uno stato già avvenuto è registrazione esplicita, non sintonia istantanea concessa dalla UI.                                                                                                                                                |
| **INV-06 — Usa, Scegli attività, Scegli risorsa, Registra tiro**           | Foundry dnd5e [Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities): attività di un oggetto, tempi, bersagli, consumi e usi/recuperi.                                                                                                                                                                                                                                                                                                                                    | Letta 23/09; aggiornata 10/09/2026, dichiara 6.0.0. Nessun runtime.                                                                   | Dall'oggetto all'azione pertinente con costo leggibile; quantità, cariche e munizioni non diventano lo stesso contatore.                                                     | Dadi fisici, facoltatività delle scorte e risoluzione/correzione sono raccordi nostri con I-026/I-027/I-028/I-155/I-156. Nessun recupero o identificazione automatici dedotti dalla configurabilità Foundry.                                                                                       |
| **INV-07 — Offri, Trasferisci, Accetta, Rifiuta**                          | Modulo Foundry [Give Items Between Players](https://foundryvtt.com/packages/give-item-to-player): accetta/rifiuta. Modulo [Item Piles, Trading](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/docs/trading.md): oggetti e monete nello stesso scambio; ramo diretto in [private-api.js](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/API/private-api.js#L1999). | R052–R054, letti 15/09; Give Items 1.0.2/Foundry 13; Item Piles revisione 85ab971, 18/07/2026. Moduli, non core.                      | Offerta unica accettata per intero; passaggio diretto solo se l'utente è unico controllore di entrambi, I-070–I-072. Mantiene consenso senza un DM per ogni scambio.         | Autorità dei controllori condivisi e scambi in combattimento non derivano dal modulo. Nessuna seconda conferma ordinaria dopo Accetta.                                                                                                                                                             |
| **INV-08 — Offerte, Modifica offerta, Ritira, Riapri dettaglio**           | [Item Piles, trade-store.js](https://github.com/fantasycalendar/FoundryVTT-ItemPiles/blob/85ab971406623fb1c5d01eb1f093fe4855ede6e4/src/applications/trading-app/trade-store.js#L106): variazioni invalidano consensi. Valve [Trade Offers](https://store.steampowered.com/oldnews/11395): lista e stesso oggetto in più offerte, incompatibili decadute dopo il trasferimento.                                                                                                       | R055–R057, letti 15/09; commit sopra; Valve 04/09/2013, client non specificato. Storico, non runtime corrente.                        | Lista senza interrompere il dettaglio aperto, contenuto aggiornato e unica accettazione valida, I-074–I-076. Evita perdere il contesto o assegnare due volte lo stesso bene. | Ritiro, differenze visibili, rivalidazione di quantità/monete e gestione rete sotto sono adattamenti; non si attribuiscono a Steam garanzie tecniche non verificate.                                                                                                                               |
| **INV-09 — Bottino comune, Prendi per il personaggio, Consulta portatore** | Shard [Using Character Sheet](https://www.shardtabletop.com/howto/using-character-sheet): Shared Treasure dalla scheda. Adventure Codex [Track party loot](https://adventurecodex.app/guides/track-party-loot/): beni e portatori.                                                                                                                                                                                                                                                   | R058/R059, letti 15/09; Shard 22 agosto, anno/build non esposti; Codex 07/07/2026, build non esposta.                                 | Ricompense disponibili senza assegnazione immediata; bene comune e portatore leggibili senza copie, I-077/I-078.                                                             | Non è uno zaino accessibile ovunque. Autorità per assegnare/cambiare portatore e contributi dei giocatori restano da definire; non inventiamo un comando libero per chiunque.                                                                                                                      |
| **INV-10 — Inventari dei compagni, Visibilità, Informazioni note**         | BG3 [Community Update 12](https://baldursgate3.game/news/community-update-12-patch-4-nature-s-power_21): inventari multiplayer visibili. [Party Inventory README](https://github.com/teroparvinen/foundry-party-inventory/blob/b688b99c96bcd945365beaf808249e40ebcd10d1/README.md): controllo per oggetto. Fantasy Grounds [Item Sheet](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996641969/5E+Item+Sheet+and+Treasure+Parcels): dati identificati/apparenti. | R060–R063, letti 15/09; BG3 25/02/2021 Early Access; modulo v11.0, commit 10/07/2023; FG aggiornato 01/04/2025, build non esposta.    | Consultazione comune, eccezione personale e proprietà note separate: I-079–I-082. Consente collaborazione senza esporre i segreti del DM.                                    | La riservatezza coerente fra tutte le viste è nostra; bloccare accesso in BG3 non prova privacy. Foundry [6.0.0 #3993](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0), letta 23/09, nasconde sintonia di oggetti non identificati: ulteriore precedente contro le fughe laterali. |
| **INV-11 — Esito, Correggi, Torna alla scheda/Biblioteca/Tavolo**          | Foundry dnd5e [6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0), #3300/#4529/#5934: accesso configurabile del giocatore all'applicazione di danni/effetti propri; R158.                                                                                                                                                                                                                                                                                        | Letta 23/09, release 10/09/2026. Non documenta un riavvolgimento completo degli scambi.                                               | Correzioni leggibili con autore e dati precedenti; ritorno all'origine conservando la consultazione, I-027–I-030.                                                            | Autorità e default di correzione vengono da I-028/I-029; persistenza del percorso è sintesi nostra. Nessun «undo Foundry» universale assunto.                                                                                                                                                      |

## INV-01/02 — cercare, aggiungere e leggere senza attivare

**Aggiungi oggetto** nella scheda apre la Biblioteca nel contesto del personaggio;
da una consultazione libera, **Aggiungi a…** richiede una destinazione autorizzata.
Ricerca per nome, filtri pertinenti e **Apri dettagli** precedono qualsiasi modifica.
La selezione mostra nome, fonte/revisione, quantità e contenitore di destinazione
facoltativo. **Aggiungi** registra la dotazione; **Annulla** lascia l'inventario
intatto. Il comando conclusivo basta: nessuna seconda conferma per un'aggiunta ordinaria.

**Aggiungi manualmente** permette nome, quantità, descrizione e dati conosciuti;
peso, valore e proprietà ignoti restano ignoti, non zero. Fonte personale o
provenienza ricostruita resta distinta da una regola SRD. La creazione di una
definizione homebrew riutilizzabile torna all'editor della Biblioteca: annotare
un oggetto personale non lo pubblica né abilita nuove opzioni nella campagna.
Per iniziare bastano dati descrittivi; un uso automatizzato può richiederne altri.

L'aggiunta non compra, equipaggia o mette in sintonia. Una ricompensa acquisita
manualmente e un acquisto guidato sono percorsi distinti; il secondo dovrà
mostrare la spesa prima di concludersi, senza pagarla di nuovo registrando la dotazione.
Aggiornare la definizione di Biblioteca non riscrive gli esemplari già in uso.

Il dettaglio espone informazioni note, quantità, collocazione, proprietà/portatore,
stato equipaggiato, eventuale sintonia e risorse pertinenti. **Confronta** affianca
nome, requisiti, caratteristiche e fonte dell'oggetto equipaggiato scelto; valori
non comparabili o mancanti sono indicati. Il primo confronto si riferisce a un
oggetto pertinente già equipaggiato, selezionabile se ce ne sono più di uno.
**Cambia confronto** conserva l'oggetto esaminato; chiudere non cambia benefici.
Un eventuale calcolo «se lo equipaggiassi» deve dichiarare ipotesi e dati mancanti:
qui non viene introdotto un simulatore completo del personaggio.

## INV-03 — quantità e contenitori sulla stessa scheda

L'inventario mostra elenco e contenitori apribili; ricerca e filtri permettono
di ritrovare un contenuto con la sua collocazione. L'organizzazione resta facoltativa.
**Sposta** sceglie quantità e destinazione nello stesso inventario, con anteprima
dei dati coinvolti. Drag è un'alternativa, non l'unico modo. La conferma sposta
gli stessi esemplari; spostare una borsa comprende il contenuto. Un ciclo che
inserisce una borsa dentro sé stessa non è una destinazione valida.

**Dividi quantità** separa una parte disponibile senza aumentare il totale.
Quantità, cariche residue, monete e numero di esemplari non sono intercambiabili.
Non si uniscono automaticamente oggetti che differiscono per proprietà, segreti,
custodia o risorse. **Correggi quantità** mostra prima/dopo e registra la rettifica;
non maschera un uso o un trasferimento e segue INV-11 se coinvolge altre azioni.
Con quantità errata o cambiata nel frattempo resta aperta la scelta da correggere,
senza valori negativi o spostamenti parziali impliciti.

Il peso facoltativo segue I-157: effetti delle regole, solo conteggio o gestione
disattivata. Il bene comune portato da un personaggio si conta una volta sola;
un peso mancante rende il totale incompleto, senza inventarlo. L'organizzazione
non decide capacità fisica, tempo per estrarre un oggetto o disponibilità a distanza.

## INV-04/05 — equipaggiamento e sintonia

**Equipaggia** espone il cambiamento pertinente e gli eventuali conflitti noti
prima di applicarlo; **Riponi/togli** è l'operazione inversa secondo la regola
dell'oggetto, non un rimborso universale. Le armi utilizzabili sono raggiungibili
anche dalle azioni del Tavolo, senza creare una seconda dotazione.

Il motore 2024 distingue registrare una situazione già vera dal compiere
un'operazione durante la scena. Lo [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf),
p. 92, prescrive tempi diversi per indossare/togliere armature e un'azione Utilize
per lo scudo; mancanza di addestramento non vieta universalmente di indossare
un'armatura, ma ne applica le conseguenze. Non importare slot da videogioco o
un gesto gratuito per qualsiasi cambio. Mani, estrazione/riponimento delle armi
e casi speciali richiedono il raccordo puntuale all'azione pertinente.

**Gestisci sintonia** mostra oggetti già sintonizzati, limite e requisiti noti.
Una nuova scelta entra nell'attività del riposo: lo SRD, pp. 102–103, richiede
un riposo breve dedicato, contatto e requisiti; l'interruzione impedisce il
completamento. Massimo ordinario tre oggetti, niente doppio esemplare dello
stesso oggetto; il riposo usato per conoscerne le proprietà è distinto. Il comando
non rimuove istantaneamente una sintonia precedente: cessazione volontaria e
altri casi seguono la regola, comprese le eccezioni degli oggetti maledetti.
L'eventuale registrazione di una sintonia già avvenuta è una rettifica esplicita.

## INV-06 — usare un oggetto senza perdere il contesto

**Usa** dal dettaglio o dal Tavolo apre la stessa azione. Se esistono attività
diverse, si sceglie quella desiderata; se è una sola, non serve un selettore vuoto.
Prima di eseguire si vedono destinatario/bersaglio, tempo o azione richiesta,
quantità/cariche/munizioni coinvolte, requisiti e formula nota. Selezionare o
annullare la preview non consuma; il consumo effettivo segue il momento previsto
dalla specifica azione. Un tiro fisico ancora da registrare non annulla un uso
già avvenuto né produce un secondo consumo quando viene inserito.

Per munizioni, luce e scorte valgono I-155/I-156: scelta della risorsa pertinente,
conteggio quando abilitato, nessuna freccia rara scelta automaticamente. Non si
deduce recupero dal semplice rientro alla scheda o da un cambio schermata.
Cariche o dati non disponibili impediscono l'automatismo specifico con spiegazione;
la consultazione resta disponibile e l'eventuale registrazione manuale conserva
fonte e autore. L'app non inventa un effetto da una descrizione incompleta.

**Esempio sintetico normativo:** due pozioni di guarigione, PF 10/18, azione bonus
disponibile. Il personaggio sceglie di berne una. SRD EN p. 99: azione bonus,
cura 2d4 + 2; due risultati fisici 1 e 2 producono 5, quindi PF 15/18,
quantità 1 e azione bonus spesa. Si registrano due valori naturali fra 1 e 4;
input incompleto o fuori intervallo resta da correggere, senza inventare la cura.
Prima dell'uso Annulla non cambia nulla; dopo
l'uso, chiudere la richiesta del tiro lascia la cura in attesa. Il tiro digitale
produce risultati reali dell'app: 1 e 2 sono solo dati di esempio, non esiti
prefissati. La stessa regola permette somministrazione entro 1,5 m; disponibilità
effettiva e bersaglio vanno verificati, non dedotti dall'essere nella stessa campagna.

## INV-07/08 — passaggi e offerte concorrenti

Dal dettaglio o da una selezione di inventario, **Offri** sceglie destinatario,
oggetti, quantità e monete; riepilogo e invio mantengono il mittente nella scheda.
Il caso acquisito è fuori combattimento, personaggi vicini e giocatori presenti.
Con unico controllore di entrambe le schede il comando diventa **Trasferisci**
e conclude una volta sola, I-071. Avere accesso in lettura o controllare una sola
delle schede non abilita quel percorso diretto.

**Offerte** mostra ricevute/inviate e stato comprensibile: pendente, aggiornata,
conclusa, rifiutata, ritirata o non più disponibile. Il destinatario sceglie quale
leggere; un arrivo non sostituisce il dettaglio aperto. **Accetta** trasferisce
l'intero contenuto attuale; **Rifiuta** conclude senza trasferire; chiudere il
dettaglio mantiene pendente l'offerta. Nessun consenso dal silenzio o dalla chiusura.

**Modifica offerta** mantiene l'identità della proposta e mostra il contenuto
aggiornato. Il destinatario è avvisato della variazione; l'accettazione di una
versione precedente non viene applicata a quella nuova. **Ritira** rende
inaccettabile una proposta ancora pendente, senza «riprendere» beni già trasferiti.
Se l'accettazione valida l'ha già conclusa, appare l'esito effettivo e INV-11.

L'oggetto non viene riservato all'invio. Prima del trasferimento si rivalidano
disponibilità, quantità, monete, contenuto della borsa e permessi attuali. Un'unica
conclusione valida aggiorna entrambi gli inventari; ripetere il clic o ricevere
due risposte non duplica. Le offerte incompatibili diventano non accettabili,
con indicazione comprensibile della voce cambiata senza divulgare dati riservati.
Se rimangono quantità sufficienti, non si invalida un'offerta solo perché usa
lo stesso tipo di oggetto; se non bastano, non si trasferisce silenziosamente il
resto. Per proporre quantità diverse occorre aggiornarla e ottenere il consenso
sul nuovo contenuto. Nessun ordine imposto fra offerte, né garanzia al clic più
veloce: conta la conclusione valida riconosciuta dallo stato condiviso.

## INV-09/10 — gruppo, informazioni note e permessi

Da scheda e campagna si raggiunge lo stesso **Bottino comune**. Il DM può aggiungere
ricompense disponibili; **Prendi per il personaggio** assegna un bene ancora
disponibile secondo I-077. Concorrenza significa una sola assegnazione dello
stesso esemplare; l'altro tentativo trova il risultato aggiornato. Portare un
bene per il gruppo resta distinto dal prenderlo come proprio, I-078.

**Inventari dei compagni** è consultazione, non controllo. **Visibilità** riguarda
il proprio oggetto personale: visibile ordinariamente al gruppo oppure riservato
ai controllori e DM. L'oggetto comune non può diventare segreto per iniziativa
del solo portatore. Il dettaglio, confronto, ricerca e avvisi rispettano gli
stessi limiti; non mostrano il nome segreto attraverso un filtro o un messaggio
d'errore. Nascondere ora non cancella ciò che altri hanno già visto.

Le **Informazioni note** sono un asse distinto: nome apparente e descrizione
conosciuta per un oggetto non identificato; proprietà ancora segrete riservate al
DM, anche se il possessore può modificare la propria dotazione. Per il bene comune
identificato a gruppo riunito, le proprietà scoperte diventano visibili a chi
può consultarlo senza un'ulteriore pubblicazione, I-082. Non rivela ogni maledizione,
non concede sintonia e non definisce qui una procedura universale di identificazione.

## INV-11 — esito, correzione, rientro e rete

L'esito distingue cambiamenti registrati e passaggi ancora pendenti: inventario,
risorsa/azione, tiro e conseguenze. **Correggi** sul proprio tiro fisico riapre il
dato dello stesso tentativo, conserva originale, rettifica e autore e non tira
di nuovo, I-028. Rettificare quantità o stato personale usa lo stesso principio;
non autorizza a recuperare unilateralmente un oggetto ormai posseduto da altri.
Per conseguenze condivise o azioni successive vale I-029: situazione attuale
come default, DM sulle conseguenze comuni, riavvolgimento solo esplicito con
riepilogo. Un'offerta conclusa rimane nella storia; non torna pendente per magia.

**Torna alla scheda/Biblioteca/Tavolo** recupera origine, ricerca e contenitore
aperto con i dati correnti; non equipaggia, usa o accetta. La navigazione non è
Annulla su un'operazione già conclusa. Campi ancora in modifica restano bozza
riconoscibile: **Salva** applica, **Annulla** scarta quei campi, senza annullare
altre operazioni concluse. Le scelte da usare al Tavolo vengono rivalidate se
nel frattempo cambiano turno, inventario, permessi o bersagli.

Offline si distinguono dati disponibili localmente, bozze e modifiche personali
ammesse da I-114. Non si presentano scambi, prelievi comuni o accettazioni come
conclusi senza riscontro dello stato condiviso. Per invio dall'esito incerto si
mostra «verifica in corso» e si recupera l'esito della stessa operazione; non si
reinvia creando una seconda offerta. La riconnessione non accetta al posto del
destinatario né sovrascrive modifiche concorrenti. Una bozza personale in conflitto
resta leggibile con prima/dopo; non si perde il testo perché è cambiata una risorsa.

## Regole e lacune materiali residue

Fonti normative: SRD **5.2.1, edizione 2024**, copie immutabili EN/IT già in R165;
[EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf) e
[IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf).
Pagine sopra riferite all'EN, lette localmente il 23/09. SHA256 EN
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`, IT
`a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.
La UI dei concorrenti non è una fonte normativa per costo, capacità o sintonia.

Restano circoscritti, senza bloccare i percorsi acquisiti:

- Autorità fra controllori condivisi, deleghe, cambio di controllo durante un'offerta;
  autorità per assegnare portatori/contribuire al bottino comune. Nessun permesso inventato.
- Scambi in combattimento, distanza e accesso fisico; estrarre/riporre armi, mani,
  contenitori annidati o magici, capacità, cancellazione di borse piene e monete nel peso.
- Accettazioni parziali, controproposte, ripartizione monete, scadenze e notifiche esatte;
  non necessarie per la singola offerta intera già descritta.
- Segreti in contenitori misti, totali indiretti di peso/conteggi, destinatario di un
  oggetto riservato, gruppo separato e conoscenza parziale: non risolti dal solo filtro UI.
- Correzioni su oggetti poi consumati, trasformati o passati ancora; recupero puntuale
  delle risorse per ciascuna attività e gestione completa dei conflitti offline.
- Verifica futura della UI pertinente, accessibilità concreta, testi EN/IT e integrazione
  delle pagine: i comandi sono utilizzabili concettualmente senza scorciatoie obbligatorie,
  ma questa lettura documentale non dimostra il loro uso su tastiera o telefono.
