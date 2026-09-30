# Personaggi — pagina concettuale iniziale

**Raccordo homebrew I-216:** dalla scelta mancante si raggiunge
[HOMEBREW_FLOW](../HOMEBREW_FLOW.md), poi si torna alla stessa scheda o bozza.
Salvare/condividere non concede benefici; aggiornare esplicitamente una
revisione conserva consumi e distingue accesso da utilizzabilità.

23/09/2026, raccordo I-213/I-214 dopo I-205/I-206. Sintesi dell'agente su delega
I-180/I-190/I-202/I-209. Definizione progressiva del percorso, non pagina completa,
mappa approvata, mock o implementazione. Le etichette dei comandi sono funzionali;
testi EN/IT e composizione visiva restano da sviluppare nel progetto unitario.

## Navigazione comune — I-212, 23/09/2026

Personaggi è un accesso globale. Sezioni della scheda e comandi di modifica restano locali; campagna e ritorno al Tavolo sono contestuali. La stessa scheda si apre nel pannello di gioco.
Fonti, ritorni e comportamento trasversale in [NAVIGATION](../NAVIGATION.md);
gli [ingressi delle funzioni](../NAVIGATION_COVERAGE.md) non ne attestano la completezza.

## Scopo e arrivo

Personaggi permette di creare, ritrovare e usare una scheda anche senza una
campagna digitale, I-052. Si arriva dall'inizio dell'app, da un invito, dalla
campagna o dal tavolo. Il punto d'arrivo conserva personaggio e contesto:
aprire la scheda dal tavolo non crea una copia e non termina il turno.

L'elenco distingue schede proprie, schede affidate e bozze, senza attribuire
gli stessi poteri a tutte. Ogni voce mostra nome, livello/classi, campagna
pertinente, stato di bozza e possibilità di modifica consentite. Ricerca e
filtri aiutano a ritrovare il personaggio; Archivio resta un accesso distinto,
I-173. Non serve configurare filtri o preferiti per aprire la prima scheda.

Nell'elenco vuoto sono disponibili **Crea personaggio**, **Ricostruisci una
scheda**, **Importa** e **Scegli un personaggio pronto**. I personaggi pronti
sono basi personali modificabili con provenienza lecita, non copie dei
contenuti dei concorrenti, I-170. L'invito offre anche la selezione di una
scheda esistente o affidata, secondo le autorizzazioni della campagna.

## Dall'elenco alla prima scheda

| Ingresso                | Percorso e risultato                                                                                                                      | Confini                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Crea personaggio        | Scegli contenuti e opzioni; compila le sezioni necessarie; rivedi il riepilogo e conferma la creazione.                                   | Nome, ritratto e biografia non devono obbligare a una preparazione narrativa completa. Dati mancanti sono riconoscibili, non scelte inventate.      |
| Ricostruisci una scheda | Indica livello attuale, classi e dati già noti; ricostruisci le scelte disponibili e confronta il risultato con la scheda esistente.      | Un totale manuale esplicito prevale sul calcolato finché impostato, I-053/I-054; non prova corretta la storia mancante.                             |
| Importa                 | Seleziona una sorgente supportata; esamina dati riconosciuti, mancanti e non compatibili; correggi e conferma ciò che entra nella scheda. | F-028/I-116: niente importatore universale, formato promesso o sostituzione silenziosa di una scheda esistente. Il fallimento conserva l'originale. |
| Personaggio pronto      | Consulta l'anteprima, scegli la base e personalizzala con gli stessi strumenti della creazione.                                           | La scelta non abilita automaticamente contenuti non consentiti nella campagna. Catalogo e revisioni da definire.                                    |

La compilazione usa sezioni raggiungibili direttamente: **Identità e fonti**,
**Classi e livelli**, **Background e specie**, **Caratteristiche**, **Competenze
e capacità**, **Magie**, **Equipaggiamento**, **Storia**, **Riepilogo**.
Sono gruppi di lavoro proposti, non altre destinazioni principali dell'app.
Si può tornare a una sezione senza perdere le altre scelte. Cambiare una
scelta che ne invalida altre mostra quali richiedono revisione; non sceglie
automaticamente le sostituzioni e non elimina silenziosamente il lavoro.

I punteggi supportano serie, budget, dadi fisici/digitali e inserimento diretto,
I-171; regole e conteggi dei metodi sono in [CHARACTER_CREATION](../CHARACTER_CREATION.md).
Non si assegna una distribuzione per classe al posto del giocatore. L'equipaggiamento
iniziale conserva dotazioni, acquisti previsti e inserimento manuale, con
quantità e monete nel riepilogo, I-172. I talenti pertinenti compaiono per primi;
**Mostra anche gli altri** distingue requisiti mancanti e sconosciuti. La deroga
esplicita I-060 riguarda i talenti, non ogni requisito o il multiclasse.

Fonti e homebrew si aprono dalla Biblioteca e ritornano alla scelta iniziale.
Consultare, acquisire nella propria libreria e abilitare per la campagna
rimangono distinti, I-065/I-066/I-126. Una capacità assente può essere ricostruita
o creata tramite homebrew; non si fabbrica una citazione SRD per renderla valida.

**Dettaglio I-213:** [CHARACTER_CREATION](../CHARACTER_CREATION.md) specifica
campi, dipendenze, dati manuali, riepilogo, bozze e casi dei quattro ingressi.
Ricostruire conserva lo stato già giocato; non assegna una seconda dotazione
o inventa una storia dei livelli. I gruppi CRE conservano fonti e adattamenti.

## Scheda: informazioni e comandi raggiungibili

La scheda mostra anzitutto identità, livello applicato, PF, CA, velocità,
risorse, condizioni e contesto di gioco. Dati manuali ed effetti hanno origine
riconoscibile. Il dettaglio del valore apre il calcolo e la correzione consentita.
Le sezioni complete rimangono disponibili anche senza preferiti configurati.

| Sezione o comando                          | Comportamento ordinario                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Azioni e preferiti                         | Apri arma, magia, capacità o oggetto e preparane l'uso pertinente. Aggiungere un preferito non equipaggia, prepara magie o spende risorse, I-159.                                            |
| Caratteristiche e competenze               | Consulta contributi e richiama una prova fisica/digitale; una richiesta esterna conserva destinatario e visibilità propri. Abilità personalizzate seguono I-161.                             |
| Magie e capacità                           | Consulta testo, origine, disponibilità e costi; prepara le magie quando consentito, confronta opzioni e richiama liste salvate, I-143/I-144. Leggere non significa lanciare.                 |
| Inventario                                 | Consulta quantità, contenitori, equipaggiamento, sintonia e scorte. Gli scambi e gli acquisti hanno i propri percorsi; aprire la scheda non li conclude.                                     |
| Risorse, stati e creature collegate        | Distingui risorse strutturate, contatori liberi, condizioni e promemoria, I-160/I-162/I-181. Compagni e trasformazioni mantengono identità e risorse pertinenti, F-023/F-024.                |
| Storia e progetti                          | Consulta biografia, spunti facoltativi I-175 e progetti F-041. Gli appunti personali si aprono nel loro contesto e con i loro permessi.                                                      |
| Modifica scheda                            | Modifica i dati autorizzati; **Salva modifiche** rende effettivo il cambiamento, **Annulla modifica** abbandona il lavoro non applicato. Nessuna conferma aggiuntiva per ogni singolo campo. |
| Avanza / Rivedi scelte / Piano futuro      | Apri il percorso pertinente mantenendo distinguibili livello attuale, bozza di revisione e possibilità future.                                                                               |
| Campagna / Vai al tavolo / Torna al tavolo | Raggiungi il contesto autorizzato con lo stesso personaggio; nessuna copia, nuova spesa o riavvio del turno.                                                                                 |

Le azioni di gioco conservano preview, gesto di esecuzione, dadi e correzioni
dei percorsi del [tavolo](game-table.md). Non passano da «Salva modifiche» e non
ricevono una seconda conferma generale. In uso individuale la scheda consente
di annotare esiti e risorse propri, dichiarando i dati che non conosce del
tavolo reale; non finge di risolvere bersagli, turni o segreti esterni all'app.

## Inventario e magie dalla stessa scheda — 23/09/2026

I-210/I-211 precisano i percorsi collegati senza duplicare la scheda:

- [Inventario](../INVENTORY_FLOW.md): aggiunta anche manuale, quantità,
  contenitori, equipaggiamento/sintonia, uso, offerte e conseguenze. Ogni
  gruppo INV collega comandi, fonte e adattamento.
- [Magie](../SPELLCASTING_FLOW.md): disponibilità per capacità, preparazione,
  liste e confronto, modalità/costo, bersagli, lancio, concentrazione e ritorno.
  I gruppi MAG conservano regole 2024 e gesti già decisi al Tavolo.

Questi flussi chiudono il raccordo ordinario; regole speciali, autorità
residue e conflitti sono elencati nei documenti, non dichiarati risolti.
La provenienza dell'impianto comune è in [DESIGN_SOURCES](../DESIGN_SOURCES.md).

## Avanzamento, revisione e piano futuro

**Avanza** apre una bozza separata dalla scheda applicata, I-055/I-056. PE e
milestone sono entrambi supportati: assegnare PE o indicare un traguardo non
applica automaticamente il livello. Si aumenta una classe o se ne aggiunge
un'altra secondo I-169, conservando livelli per classe e totale.

Il riepilogo confronta prima/dopo: livelli, PF, caratteristiche, competenze,
capacità, magie e risorse interessate. Evidenzia scelte mancanti, opzioni non
più valide e totali manuali da riconciliare. **Applica avanzamento** conferma
una sola volta il risultato rivisto; non ricarica implicitamente ogni risorsa.
Il trattamento di valori manuali, PF, risorse e modifiche concorrenti è
specificato con esempi in [CHARACTER_ADVANCEMENT](../CHARACTER_ADVANCEMENT.md),
I-214. Le capacità personalizzate senza dati sufficienti restano esplicite,
senza attribuire loro un ricalcolo verificato.

**Salva bozza ed esci** conserva le scelte e il punto di ripresa; **Riprendi
bozza** riapre quel lavoro. **Scarta bozza** elimina solo quelle scelte, dopo
averne reso chiara la perdita. La scheda usabile conserva il livello già
applicato. **Piano futuro** raccoglie più livelli senza concederne capacità,
I-057. Richiamarne le scelte nella bozza richiede rivalidazione, non applicazione
automatica. **Rivedi scelte** segue il riepilogo I-124 e conserva storia,
appunti ed equipaggiamento; dipendenze particolari restano da completare.

## Campagna, tavolo e rientro

Da un invito si riconoscono campagna e persona invitata e si sceglie la scheda
consentita. La conferma del collegamento non pubblica appunti privati, non
converte regole e non concede al nuovo DM accesso ai segreti personali.
Prima dell'ingresso si segnalano incompatibilità conoscibili di contenuti;
ammissione e conflitti richiedono il percorso della campagna, non un bypass.

Dal tavolo si apre la scheda come dettaglio dello stesso personaggio, mantenendo
scena e richieste in attesa. **Torna al tavolo** riporta al contesto disponibile;
se nel frattempo cambia turno, scena o permesso mostra lo stato corrente, non
riapplica una vecchia snapshot. Dal tavolo a Personaggi si ritrovano consumi,
effetti e modifiche realmente registrati, non la scheda precedente alla sessione.

**Duplica**, **Trasferisci**, **Archivia**, **Ripristina dall'archivio**,
**Condividi in sola lettura** ed **Esporta** sono operazioni distinte,
I-125/I-173/I-174/I-176 e F-027. Si aprono dalla gestione del personaggio:
duplicare produce una copia indipendente; trasferire prosegue con la scheda
attuale; archiviare non uccide, revoca controlli o cancella pedine. Le anteprime
mostrano destinazione e dati coinvolti prima dell'applicazione. Le autorità
su schede condivise e i campi esportabili/pubblicabili non sono chiusi qui.

## Salvataggio, permessi ed errori

- **Scheda applicata, bozza e piano** hanno stato distinto. Passare sezione
  conserva la bozza; un'indicazione distingue salvato, in corso, errore e solo
  sul dispositivo. Non dichiarare sincronizzato un salvataggio non confermato.
- Chiudere un dettaglio o usare Esc non applica una bozza e non equivale a
  scartarla. Un'uscita con modifiche non salvate offre salvataggio, ritorno o
  scarto esplicito; nessun avviso ripetitivo quando il lavoro è già conservato.
- Dopo l'applicazione rimane la correzione I-028/I-029: non un annullamento
  silenzioso di azioni, consumi o decisioni condivise avvenuti nel frattempo.
- I controllori autorizzati possono modificare la scheda condivisa, I-041/I-043;
  questo non conferisce proprietà, cancellazione o accesso alle note «Solo io».
  DM/co-DM, controllo, sola lettura e link esterno non sono permessi equivalenti.
- Se i permessi cambiano durante una modifica, interrompere la scrittura non
  più autorizzata e spiegare lo stato. Non continuare a mostrare dati revocati
  per inerzia; recupero del lavoro locale e conflitti richiedono specifica.
- Senza rete si consultano/modificano scheda e appunti già disponibili e
  autorizzati, I-114. Non promettere cataloghi assenti o partita sincronizzata.
  Gli effetti condivisi non si eseguono implicitamente al ritorno della rete.
- Salvataggio o applicazione incerti richiedono verifica dello stato corrente
  prima di ripetere. Un conflitto mostra versioni e dati interessati; non
  sovrascrive tacitamente la modifica altrui né perde la bozza del giocatore.
- Importazione non supportata, contenuto mancante e dati insufficienti hanno
  messaggi diversi. Restano ricostruzione/manuale consentito e bozza; niente
  scelta fittizia, cancellazione dell'originale o conversione automatica di regole.

Elenco, sezioni, riepiloghi e azioni devono essere usabili con tastiera e touch,
con nomi leggibili, focus restituito al comando d'origine e segnali oltre al
colore. I testi EN/IT e nomi lunghi fanno parte della definizione; laptop resta
il contesto principale e telefono l'obiettivo con riserva I-129. Nessuna prova
di accessibilità o layout finale viene attestata da questo documento.

## Fonti, adozioni ordinarie e limiti

Fonti primarie rilette il 22/09/2026, documentazione pubblicata senza account o
test runtime. Nessuna build applicativa immutabile è indicata dalle pagine.

- [Beyond — Character Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods),
  aggiornato 24/03/2026: procedura per passi, guida e anteprima di personaggi
  pronti modificabili. Riutilizzo R037/R147; non importa il limite al primo
  livello del Quickbuilder né personaggi/catalogo del concorrente.
- [Beyond — Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections),
  aggiornato 27/08/2025: sezioni di compilazione e raccordo finale a scheda e
  campagna, R038. Sostiene la navigazione proposta; non fissa qui default delle
  regole. Il testo conserva un richiamo all'export futuro in beta: non è prova
  della disponibilità corrente di tutti i formati.
- [Beyond — Joining a Campaign](https://dndbeyond-support.wizards.com/hc/en-us/articles/14025808350612-Joining-a-D-D-Beyond-Campaign),
  aggiornato 27/08/2025: invito con scelta fra scheda esistente, nuova, pronta
  o resa disponibile dal DM. Sostiene il raccordo elenco/campagna, R037;
  non determina i nostri permessi, trasferimenti o ammissione di contenuti.
- [Roll20 — D&D 5e Charactermancer](https://help.roll20.net/hc/en-us/articles/360039644133-D-D-5e-Charactermancer),
  10/11/2021, generazione 5e OGL: navigazione fra sezioni, revisione, salvataggio
  e uscita con ripresa; fonte storica R040/R041, non builder 2024 corrente.
  Il testo segnala perdita delle modifiche della sezione alla chiusura con X
  e sovrascrittura della scheda applicando: questi comportamenti non sono
  adottati. Conservazione della bozza e applicazione delle sole modifiche
  pertinenti sono il nostro raccordo di I-028/I-055/I-056/I-124.

**Adozioni su delega:** elenco con stati distinguibili, sezioni
raggiungibili, ritorno al contesto e comandi espliciti di bozza/modifica.
Le fonti sostengono i passaggi; la loro composizione con privacy, offline e
scheda condivisa è nostra. Non attribuire l'intero percorso a un concorrente.

Le verifiche successive R179/R180 e le matrici CRE/ADV precisano i riferimenti
del creatore, del passaggio di livello e delle regole 2024. Le guide storiche
sopra restano evidenza datata, non prova della UI corrente dei prodotti.

## Copertura e lavoro ancora necessario

Raccorda F-008 con F-002/F-003/F-004/F-006/F-007/F-009/F-023/F-024/F-026–028,
F-031/F-033/F-041/F-044/F-045/F-056–058/F-062. La collocazione non chiude
queste funzioni: dettagli restano in [FEATURES](../FEATURES.md#f-008--ciclo-del-personaggio-e-scheda-individuale)
e [COVERAGE](../COVERAGE.md), con decisioni I-052–I-069, I-122–I-125,
I-159–I-162, I-169–I-176, I-181/I-183.

CRE/ADV dettagliano creazione, ricostruzione, multiclasse, avanzamento,
revisione, piano e riconciliazione ordinaria della bozza con la scheda giocata.
Da completare: catalogo eseguibile delle capacità e casi speciali di homebrew;
PF/morte e risorse nella partita; importatori e dati coperti; casi residui di inventario
e magie descritti nei flussi; compatibilità/autorità del collegamento e trasferimento;
condivisione esterna, archivio e cancellazione; dipendenze di creature/forme;
limiti del salvataggio locale e revoche; esperienza EN/IT e dispositivi.
Sono lavoro autonomo da raccordare al blueprint, non altre domande ordinarie
prenotate per l'owner né un'autorizzazione ad avviare l'implementazione.

### Raccordo visuale 23/09/2026 — concentrazione

In Magie, il campione mostra l'effetto corrente o Nessun effetto in corso.
Registra concentrazione richiede nome e fonte/motivo per un effetto già attivo;
se ne sostituisce uno, il comando finale dice Sostituisci concentrazione.
Termina concentrazione rimuove quell'istanza e i soli effetti collegati.
Annullare/Esc prima di registrare conserva il precedente; nessun lancio o
slot è dedotto dalla registrazione. Una modifica accettata è correggibile con
lo stesso registro/undo del Tavolo. CD e richiesta dopo danno appartengono
al servizio Tiri e risultati, non a un secondo foglio scollegato.

### Raccordo visuale23/09/2026 — riposi e recuperi

**Riposa** nell'intestazione apre il pannello dello stesso personaggio usato al
Tavolo. Mostra durata, attività, risorse e fonte; inizio, tempo trascorso e
completamento sono distinti. Dadi Vita fisici/digitali, recupero rapido
facoltativo, Recupero Arcano, interruzioni e correzione motivata seguono
[REST_TIME_FLOW](../REST_TIME_FLOW.md), I-225/R192. Chiudere non restituisce
un dado speso; Undo conserva la faccia già accettata. La scheda personale può
registrare tempo e recuperi locali senza modificare l'orologio della campagna.

## Dove si trova ogni funzione nel blueprint — candidata del 01/10/2026

Una riga per funzione del [censimento](../CAPABILITY_CENSUS.md): stato della candidata con il file di prova (PROVEN, PARTIAL, OPEN-DECISION, EXCLUDED: legenda del censimento) e posto naturale nel blueprint, come lo scrivono i controlli. Superfici costruite da nominare: la scheda come D&D Beyond (fascia, colonne, sezioni), «Avanza di livello» (dal 30/09 chiede solo le scelte del livello nuovo), il numero dei PF che apre la gestione dei PF, i numeri che tirano al clic (clic destro per vantaggio, svantaggio e dadi fisici), «Tempo libero» (scheda › Extra), la Forgia («Forgia un oggetto magico…» in Biblioteca, arma forgiata sulla scheda), il menu contestuale delle righe (clic destro, pressione lunga, Maiusc+F10).

### Personaggi — creazione e avanzamento

- **PG-01** Creazione per sezioni navigabili; riepilogo che applica una volta — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Home › «Crea un personaggio» › «Salva e avanti» through 11 sections › Riepilogo › «Crea scheda»
- **PG-02** Bozza immediata, riprendi/scarta, uscita protetta, ricarica — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Navigating away with unsaved edits asks «Conservare le modifiche alla bozza?» (Scarta solo le modifiche non salvate / Resta nella bozza…
- **PG-03** Scelte mancanti segnalate; riepilogo con aspetti da verificare — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Empty +2/+1 is one (!) error; «Correggi sezione» focuses origin.backgroundBonuses.str (p1-builder-phone).
- **PG-04** Caratteristiche: serie, 27 punti, 4d6 digitale/fisico, manuale con fonte — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Caratteristiche › Metodo
- **PG-05** Origine 2024: background con talento e +2/+1 o +1/+1/+1, lignaggi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Soldato shows only FOR/DES/COS with the reason, origin feat «Aggressore selvaggio», (!) da assegnare; Elf lineage choice listed.
- **PG-06** Selettore contestuale bloccato sulla scelta; crea homebrew e torna — PROVEN · [audit/reaudit3-a][ev-reaudit3-a]. Dove: Player › Personaggi › «Crea personaggio» › «Classi e punti ferita» › «Sfoglia le classi…» › Mago › «Crea variante nell’editor homebrew…»
- **PG-07** Ricostruire una scheda con risorse già spese e storia ignota — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Personaggi › «Ricostruisci una scheda»
- **PG-08** Avanza/Rivedi con bozza, confronto e applicazione sullo stato attuale — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Avanza» › (opens on Identità) › rail Classi › level 2 typed by hand › Metodo PF › Riepilogo («PF massimi 13 → 22») › confirm › «Applica…
- **PG-09** Percorso rapido di livello 1 e personaggi pronti da reclamare — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Percorso rapido» (class, background and species cards, name, summary, «Crea personaggio») produced Pip, a level-1 Ladro
- **PG-10** Suggerimenti di nome e caratteristiche "Aggiungi/Casuale" — PROVEN · [final-review-completeness][ev-final-review]. Dove: name chips (Sefa, Marco, Ada …) and «Suggerisci altri»
- **PG-11** Prerequisiti applicati con eccezione esplicita e segnalata — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Capacità e talenti › «Talenti bloccati dai requisiti» › «Consenti eccezione e scegli…» › reason › «Consenti eccezione»
- **PG-12** Competenza duplicata liberata con avviso della nuova scelta — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) DDB duplicate-proficiency detection. A skill chosen both for the class and by the species is no longer cleared silently: the panel says «Percezione è scelta due volte: dalla classe…
- **PG-13** Equipaggiamento iniziale: pacchetti classe/background o oro, riapribile — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Equipaggiamento › «Scegli pacchetti iniziali…» › Fighter A/B/C (155 gp) and background A/B (50 gp) › «Usa questa dotazione»
- **PG-14** Fonti del personaggio per categoria, con avviso di opzioni nascoste — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Rail › Fonti
- **PG-15** Multiclasse con scelte per classe — PROVEN · [audit/home-creation][ev-home-creation]. Dove: «Avanza di livello» › Classi › «Aggiungi classe» › Mago › «Ordine dei livelli» (two selects) › Metodo PF
- **PG-16** Scendere di livello, modificare scelte passate, rifacimento completo — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Rivedi scelte» › Classi › level 1 › Riepilogo › confirm › «Applica alla scheda»
- **PG-17** Gestione XP/traguardi — PROVEN · [final-review-completeness][ev-final-review]. Dove: DM › Gruppo › «Assegna PE e monete» opens a dialog with XP
- **PG-18** Progressioni non di classe (doni, benedizioni, tracce) — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Sheet › Capacità › «Doni» › choose a boon › «Sblocca
- **PG-19** Co-costruzione DM+giocatore sulla stessa bozza — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Identità › «Costruisci con il DM…» › «Condividi con il DM» › edit › «Pubblica modifiche»

### Personaggi — scheda

- **PG-20** Sezioni Azioni/Inventario/Magie/Capacità/Storia/Extra, stessa scheda al Tavolo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Azioni della scheda» opens the sheet drawer over the map; URL stays #table; close returns focus.
- **PG-21** Correzione dei PF motivata e conservata nel registro — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Danni, cure e condizioni» › «Correggi PF e stato» › PF attuali + «Motivo della correzione (obbligatorio)» › «Anteprima» › «Applica»
- **PG-22** Un solo controllo PF: importo + Cura/Danno + temporanei, identico ovunque — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Pedina: clic destro › «Punti ferita…»
- **PG-23** Tiro dal numero con modificatori, digitale o fisico — PROVEN · [final-review-completeness][ev-final-review]. Dove: Fisici › «Tira»
- **PG-24** Modalità Gioco vs Modifica — PROVEN · [final-review-completeness][ev-final-review]. Dove: Riquadro sotto la carta PF › «Gioco / Modifica»
- **PG-25** Valori derivati non scrivibili; override per componente con nota — PROVEN · [final-review-completeness][ev-final-review]. Dove: «CA 13» → «Classe armatura · Livia · Totale 13 · Base 12 · Destrezza +2 · Mantello della protezione +1», SRD pages, stacking order
- **PG-26** Ordine di cumulo dei modificatori esplicito — PROVEN · [audit/sheet][ev-sheet]. Dove: Clic su «CA» (anche in Gioco) › «Modifiche nell'ordine di cumulo» + «Ordine di applicazione
- **PG-27** 0 PF: tiri salvezza contro morte, stabile, morte esplicita, ritorno in vita — PROVEN · [audit/reaudit][ev-reaudit]. Dove: 0 HP death box, «Riporta a 1 PF», explicit «Morto» and «Riporta in vita…».
- **PG-28** Condizioni e Indebolimento dalla scheda, con descrizione ed effetti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «+ Condizione» › «Avvelenato»: 2 clicks; exhaustion segments 1–6.
- **PG-29** Difese: resistenze, immunità, vulnerabilità con fonti e voci proprie — PROVEN · [audit/sheet][ev-sheet]. Dove: Chip «Difese Nessuna» (o «Gestisci difese») › Tipo, Contro, Fonte «Personalizzata (accordo del tavolo)», Nome, Nota › «Aggiungi difesa»
- **PG-30** Sensi e velocità personalizzati, scelta di quello mostrato — PROVEN · [audit/reaudit][ev-reaudit]. Dove: One «Velocità e sensi» dialog with shown speed and shown sense.
- **PG-31** Abilità e competenze con tiri — PROVEN · [audit/sheet][ev-sheet]. Dove: Elenco «Abilità» con pallino di competenza, caratteristica e valore
- **PG-32** Abilità personalizzate e preferite in alto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Modifica» › nome, caratteristica, competenza/maestria, bonus, nota › «Aggiungi abilità»
- **PG-33** Ispirazione Eroica attivabile e visibile al DM — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Tavolo › «Riepilogo del gruppo» non la mostra
- **PG-34** Contatori e usi limitati con recupero breve/lungo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Limited uses with «Usa»; pips focusable (p2-focus).
- **PG-35** Recupero all'alba e cariche ricaricabili — PROVEN · solo test Node · [audit/reaudit][ev-reaudit]. Dove: (correzione, provata da test) dnd5e dawn recovery: the «Ricarica all'alba» re-render already worked (verified: it appears as soon as the clock passes 06:00); added dawn recovery for features: `rest-time.mjs` `dawnRows`…
- **PG-36** Filtri economia d'azione e azioni generiche 2024 elencate — PROVEN · [audit/sheet][ev-sheet]. Dove: Chip «Tutte 20 / Attacco 3 / Azione 16 / Azione bonus 1 / Reazione 2 / Altro 1 / Usi limitati 5» + «Azioni in combattimento (2024)» +…
- **PG-37** Armi con proprietà e Maestria — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Bastone ferrato: «Versatile 1d8», «Maestria: Rovesciamento» chips.
- **PG-38** Azioni personalizzate con tiro e danno — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Azione personalizzata» on the sheet opens the quick-bar action dialog; list inclusion by p2-actions tests.
- **PG-39** Striscia dei preferiti a un clic — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Favourite chip rolls with no dialog; Atletica appears on the Table «Barra rapida» page.
- **PG-40** Tooltip ricchi con spiegazione del valore — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Every save/skill has «dettagli, clic per fissarli».
- **PG-41** Capacità e tratti con fonte e contatori in linea — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «SRD 5.2.1 · p. 77–78» inline, filter chips Classe/Specie, «Recupero arcano» on Livia.
- **PG-42** Storia: aspetto, biografia, tratti, annotazioni distinte — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Storia › Personalità: four lists with «Aggiungi»/«Casuale», biography separate.
- **PG-43** Note della scheda per sezioni (alleati, nemici, organizzazioni) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Storia» › «Aggiungi nota» › Sezione «Alleati», titolo, testo, «Chi la legge» (scheda / solo io) › «Salva nota»
- **PG-44** Aspetto: ritratto, cornice, tema; ritratto usato come pedina — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Storia › «Aspetto» › «Scegli dalla libreria» › «Livia
- **PG-45** Navigazione a sezioni su telefono con accessi persistenti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Phone: bar at 581 px in the first screen, sticky at 0 when scrolling.
- **PG-46** Barra del personaggio al Tavolo con PF, risorse e azioni — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Hotbar «Livia PF 18/22» opens the HP widget.
- **PG-47** Effetti temporanei attivabili che modificano i tiri (Benedizione, Ira) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Livia’s sheet › EFFETTI › toggle «Benedizione»
- **PG-48** Politica dei tiri: vantaggio chiedi/sempre, sussurro, spareggio, critico — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Politica dei tiri» from the sheet box; palette «tiro nascosto».
- **PG-49** Controllo accessi: DM non legge la scheda privata — PROVEN · [final-review-completeness][ev-final-review]. Dove: DM › Personaggi

### Personaggi — magie

- **PG-50** Scheda Magie: CD e attacco, lancio dal repertorio — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Inizio › carta «Livia» › scheda «Magie» (Attacco +5, CD 13 nell'intestazione) › «Lancia ▾» › «1° · 3/4» › «Lancia»
- **PG-51** Slot per livello e slot del Patto separati — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Magie › riga «Magia del Patto · livello 1: 1 / 1» (separata dagli slot normali) › «Lancia» su Charme su persone › la finestra propone…
- **PG-52** Preparazione collegata al repertorio giocabile — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Iria › Magie › «Gestisci magie» › pannello «Libro» › «Prepara» › «Modifiche non confermate +1» › «Conferma preparazione»
- **PG-53** Gestione incantesimi conosciuti/preparati con filtri di fonte — PROVEN · [final-review-completeness][ev-final-review]. Dove: Livia’s sheet › Magie › «Gestisci magie» › «Lista di classe»
- **PG-54** Liste riutilizzabili di preparati — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Gestisci magie › «Liste salvate» › nome › «Salva le preparate come lista» › «Richiama»
- **PG-55** Confronto fra incantesimi — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: «Confronta» su due righe (lista o pannello) › barra «Confronto (2)» › «Confronta» › tabella › «Torna alla scelta»
- **PG-56** Lancio come rituale (+10 minuti) — PROVEN · [final-review-completeness][ev-final-review]. Dove: Riga › «Come rituale» › finestra già impostata «Come rituale: +10 minuti, nessuno slot» › «Lancia come rituale»
- **PG-57** Varianti di livello raccolte in un'icona; dialogo d'uso con consumo — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: «1° · 3/4 / 2° · 1/2» › «2°» › finestra «Consuma: Slot di livello 2: 1 → 0 · Livello 2 (base 1)» › «Lancia»
- **PG-58** Lanciare da oggetti magici con cariche — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Magie › «Incantesimi dagli oggetti» › «Lancia dall'oggetto» › cariche 1–3 › «Lancia»
- **PG-59** Avviso che un nuovo incantesimo chiude la concentrazione attuale — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: «Lancia ▾» › «2°» › finestra: «Interromperà la concentrazione su Individuazione del magico» › «Lancia e termina la concentrazione»
- **PG-60** Trascrivere incantesimi nel libro del mago — PROVEN · [final-review-completeness][ev-final-review]. Dove: Gestisci magie › «Trascrivi» › «Pergamene nell'inventario» › «Trascrivi dalla pergamena…» › «Trascrivi»
- **PG-61** Componenti e focus — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Magie › «Focus e componenti» › «Riponi» il cristallo › «Lancia» Palla di fuoco › «M · materiale manca» con «Lancia» disattivato ›…

### Personaggi — inventario

- **PG-62** Aggiungi, modifica, equipaggia; stessa quantità al Tavolo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Inventario › «Aggiungi oggetto» › nome, tipo, quantità, peso › «Salva oggetto» › «Equipaggia»
- **PG-63** Consumabile con anteprima, dado digitale/fisico, nessun doppio consumo, undo — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Inventario › «Bevi» › anteprima «Finché non scegli Bevi, non cambia nulla» › «Dadi fisici» › «Bevi · esegui» › facce 3 e 1 › «Registra e…
- **PG-64** Ricerca, filtri, raggruppamenti e colonne — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Sort by weight, value column.
- **PG-65** Contenitori annidati con capacità e peso escluso — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Riga › «Altro» › «Sposta, passa o copia…» › destinazione › «Conferma»
- **PG-66** Monete: gestione, conversione, per contenitore, trasferimento — PROVEN · [final-review-completeness][ev-final-review]. Dove: Inventario › «Gestisci monete» › «Converti monete…» / «Metti o prendi da un contenitore…» / «Passa o offri a un'altra creatura…»
- **PG-67** Dividere una pila; spostare vs copiare fra attori con permessi — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Altro › «Dividi la pila…» › «Dividi»
- **PG-68** Sintonia: tre posti e oggetti che la richiedono — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Carta «Sintonia 2/3» (tre rombi) › «Gestisci sintonia» (filtro e posti) › «Sintonizza» › riposo breve o «Registra come già avvenuto» con…
- **PG-69** Munizioni collegate all'attacco — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Bow outside combat rolls and spends an arrow; «Regola e calcolo» opens.
- **PG-70** Peso e ingombro facoltativi con varianti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Movement shows the effective speed with «−3 m ingombro» (p4-inventory).
- **PG-71** Oggetti non identificati e identificazione — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: «Oggetti non identificati» › «Identifica»
- **PG-72** Inventario del gruppo con chi ha equipaggiato cosa — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Torcia › «Equipaggiato da te»
- **PG-73** Restrizioni di equipaggiamento e avvisi — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Inventario › «Equipaggia» su Bastone
- **PG-74** Set d'armi con cambio rapido — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Cambia set» stows the blocker.
- **PG-75** Valute personalizzate con cambio — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Palette «valuta» → campaign currencies.
- **PG-76** Personalizzare nome, peso, costo, materiale (argento, adamantio) — PROVEN · [audit/spells-inventory][ev-spells-inventory]. Dove: Riga › «Altro» › «Personalizza…» › nome mostrato, peso, costo, materiale (Normale / argento / adamantio), note › «Salva personalizzazione»

### Personaggi — capacità, creature e attività

- **PG-77** Forma Selvatica: applica, ritorno, risorse vive, Undo distinto — PROVEN · [audit/reaudit3-a][ev-reaudit3-a]. Dove: Player › Tavolo › Mira’s token › «Barra rapida» › slot «4: Forma Selvatica · capacità di classe · 1 di 2 usi» › Forme dialog › Lupo ›…
- **PG-78** Compagni, famigli ed evocazioni come Extra con PF e collocazione — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Companion token appears at the chosen point (p2-companion-2). The older p2-companion journey now picks a cell the map refuses («Questo spazio non è disponibile»), with a clear message.
- **PG-79** Metamorfosi, cavalcature, altri compagni ed effetti — PROVEN · [audit/reaudit3-a][ev-reaudit3-a]. Dove: DM › Doran’s token menu › Azioni › «Trasforma…» opens a dialog with creature
- **PG-80** Scelte da riselezionare dopo un riposo — PROVEN · [audit/reaudit][ev-reaudit]. Dove: After a Long Rest: spells and masteries offered.
- **PG-81** Riposi breve e lungo, Dadi Vita uno a uno, riepilogo recuperi — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Hit Dice at the start, HP from Hit Dice in the summary.
- **PG-82** Bastione dal livello 5: strutture, ordini, turno — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Iria (level 5) has a top-level «Bastione» section; palette «bastione» finds it from the sheet or as the player. From the DM's Home the command is not offered.
- **PG-83** Progetti duraturi e attività di tempo libero con progresso — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Extra sub-pages «Creature e piani», «Progetti e tempo libero», «Ricettario». The progress meter cannot be seen with the sample data (no active project).
- **PG-84** Fabbricazione con ricette, tempo, costo, strumenti (2024) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Ricettario» sub-page; palette «fabbrica», «ricetta».

### Personaggi — gestione, esportazione e condivisione

- **PG-85** Collegamento esplicito personale → campagna con destinatari e consenso — PROVEN · [audit/reaudit3-a][ev-reaudit3-a]. Dove: Player › Campagne › Gruppo › «Aggiungi un mio personaggio»
- **PG-86** Elenco personaggi con ricerca, ordinamento e azioni Copia/Elimina/Lascia campagna — PROVEN · [final-review-completeness][ev-final-review]. Dove: Personaggi › campo «Cerca per nome, livello, classe, specie o campagna» («druida» → 1 di 4) › «Ordina per»
- **PG-87** Privacy: solo campagna / privato / pubblico via link in sola lettura — PROVEN · [audit/features-management][ev-features-management]. Dove: Scheda › «Gestisci personaggio» › «Cambia privacy» › «Pubblica con link» › «Salva privacy» → dialogo «Condividi» con link e QR › «Apri…
- **PG-88** Copia indipendente (anche come migrazione di edizione) — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Copy dialog: «Regole di destinazione» and «Cosa cambia».
- **PG-89** Libreria fuori campagna: collegamento vivo vs istantanea, rilascia, trasferisci — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Link/copy through a campaign picker (only one sample campaign to pick).
- **PG-90** Esporta PDF compilabile e stampa — PROVEN · [final-review-completeness][ev-final-review]. Dove: Scheda › «Gestisci personaggio» › «Scarica PDF»
- **PG-91** Esporta/importa la scheda nel formato proprio — PROVEN · [audit/features-management][ev-features-management]. Dove: «Gestisci personaggio» › «Esporta dati
- **PG-92** Import da formati terzi documentati, mai scraping fragile — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Foundry actor preview (mapped/not imported) and import, level 3, 28 HP.
- **PG-93** Condivisione rapida al tavolo (link o QR) — PROVEN · [final-review-completeness][ev-final-review]. Dove: «Gestisci Livia» › «Condividi (link e QR)», «Cambia privacy»
- **PG-94** DM che modifica la scheda di un giocatore autorizzato — PROVEN · [audit/reaudit][ev-reaudit]. Dove: DM header «Scheda di Giocatore · il giocatore ti consente di modificarla»; player «Scheda controllata da te».
- **PG-95** Storico delle revisioni del personaggio — PROVEN · [final-review-completeness][ev-final-review]. Dove: Scheda › «Note» › «Revisioni» › «Salva revisione» › nome › «Salva revisione»
- **PG-96** Registro Adventurers League — PROVEN · [audit/features-management][ev-features-management]. Dove: Scheda › «Note» › «Registro» › «Aggiungi voce» › campi AL › «Aggiungi al registro»

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
