# Homebrew — creare, usare e aggiornare senza perdere la partita

23/09/2026, I-216/R184. Composizione dell'agente su delega I-180/I-215:
contratto parziale, nessuna approvazione del contratto completo o prova runtime.
Attua I-061–I-069/I-127/I-128/I-160–I-162. Collega [Biblioteca](pages/library.md),
[creazione](CHARACTER_CREATION.md), [avanzamento](CHARACTER_ADVANCEMENT.md),
[inventario](INVENTORY_FLOW.md), [magie](SPELLCASTING_FLOW.md) e [navigazione](NAVIGATION.md).

## Il percorso riconoscibile

**Biblioteca → Crea contenuto → tipo e base → descrizione e regole → Anteprima →
Salva contenuto → uso personale oppure Condividi → eventuale abilitazione in
campagna → scelta sulla scheda.** Si può iniziare anche da una scelta mancante
nel personaggio e tornarvi con il contenuto selezionabile. Salvare non lo concede.

La testata identifica nome, tipo, stato Bozza o Salvato, revisione e visibilità.
Le sezioni sono **Identità e fonte**, **Descrizione**, **Requisiti e scelte**,
**Capacità e attività**, **Effetti e risorse**, **Anteprima**. Compaiono solo
quelle pertinenti al tipo; una semplice nota o un contatore non obbliga ad
attraversare un editor completo. Il caso semplice resta breve, quello avanzato
espande i suoi campi. Non sono sei finestre obbligatorie o un layout definitivo.

## Fonti e motivo delle scelte

Lettura pubblica il 23/09/2026, senza account o test dei concorrenti. Le fonti
storiche documentano principi di editor, non l'interfaccia attuale o regole 2024.
Le formulazioni sotto sono scelte nostre quando manca un precedente esatto.

| Gruppo                                                         | Precedente documentato                                                                                                                                                                                                                                                    | Decisione, motivo e adattamento                                                                                                                                                                              |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **HB-01 — Crea, Da zero, Usa come base, Duplica**              | Shard [Create](https://www.shardtabletop.com/create), senza data/build: tipi 5e, copia di contenuto e scheda modificabile. Beyond [sottoclassi](https://www.dndbeyond.com/posts/845-new-players-guide-how-to-homebrew-on-d-d-beyond), 11/07/2020: modello e progressione. | Stesso editor dopo l'ingresso; duplicazione indipendente distinta da nuova revisione. Ricostruire una sottoclasse non la trasforma in talento.                                                               |
| **HB-02 — Identità, Fonte, Edizione, Revisione**               | Beyond [versioni](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published), 10/11/2021: versione visibile e cronologia del pubblicato.                                                                                                            | Provenienza e revisione immutabile dell'app estese anche al privato per I-067; non attribuire questa garanzia a tutti gli edit privati Beyond.                                                               |
| **HB-03 — Aggiungi privilegio, livello, scelta o concessione** | Foundry sistema dnd5e [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement), wiki 10/09/2026, badge 6.0.0.                                                                                                                                                  | Blocchi per concessioni, alternative, progressione e modifiche; l'autore vede cosa il personaggio dovrà scegliere. La loro esatta matrice di compatibilità resta da completare.                              |
| **HB-04 — Aggiungi attività, bersagli, costi ed effetto**      | dnd5e [Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities), stessa data/versione: molte attività per oggetto e risorse distinte.                                                                                                                             | Separare azione, costo ed esito rende possibile automatizzare le parti strutturate; non promette comprensione automatica della prosa.                                                                        |
| **HB-05 — Effetto, formula, durata, domanda narrativa**        | dnd5e [Active Effects](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects), stessa data/versione, valori dinamici o fissati all'applicazione. I-069/R050 per il caso della gilda.                                                                                    | Chiarire valore corrente o valore fissato; domande solo sulle condizioni pertinenti non calcolabili. L'autore scrive la regola di casa, l'app non la presenta come SRD.                                      |
| **HB-06 — Anteprima e Prova**                                  | Beyond [oggetti](https://www.dndbeyond.com/posts/1103-how-to-create-a-homebrew-magic-item-using-d-d), 06/11/2021: descrizione, campi specifici, cariche, modificatori e magie separati.                                                                                   | Anteprima leggibile più prova su dati fittizi: mostra cosa è automatizzato e cosa è solo descritto. Prova senza consumare risorse reali è adattamento nostro.                                                |
| **HB-07 — Salva bozza, Salva contenuto, Riprendi, Scarta**     | Beyond distingue contenuto privato e pubblicato nelle [versioni](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published); CRE/ADV conservano il precedente Roll20 della bozza.                                                                   | Bozza separata dall'oggetto utilizzabile; stato del salvataggio esplicito. Nessuna promessa di collaborazione simultanea o offline totale presa da questi riferimenti.                                       |
| **HB-08 — Condividi, Abilita, Aggiungi al personaggio**        | Beyond [Sharing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content), 29/09/2025: uso privato/condivisione/pubblicazione distinti.                                                                             | Autorità e passaggi I-065/I-066: accesso, opzioni comuni e scelta personale separati; nessun permesso aggiuntivo per ogni uso. Non si copia la condivisione indiscriminata della raccolta.                   |
| **HB-09 — Modifica, Nuova revisione, Confronta**               | Beyond [versioni](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published): nuova versione distinta dal modello. Foundry core [Items](https://foundryvtt.com/article/items/), senza build: copia sulla scheda indipendente.                       | L'originale in uso resta identificato; aggiornamento esplicito. Il confronto guidato fra regola, modifiche locali e stato attuale è nostro adattamento, non una fusione Foundry verificata.                  |
| **HB-10 — Rivedi aggiornamento, Applica, Mantieni versione**   | I-067; controevidenza core [Compendium](https://foundryvtt.com/article/compendium/): alcune importazioni sovrascrivono.                                                                                                                                                   | Applicare alla scheda viva conservando risorse e correzioni evita la sovrascrittura della partita. I casi non riconciliabili chiedono input nel riepilogo.                                                   |
| **HB-11 — Pubblica, Cronologia, Rimuovi dalla raccolta**       | Beyond [Sharing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content) e versioni storiche; R104/R105 conservano limiti e fonti discordanti.                                                                     | Pubblicazione originale facoltativa I-127; rimozione dalla raccolta non cancella copie usate. Ritiro pubblico, revoche e moderazione richiedono un flusso dedicato, non si importa l'irreversibilità Beyond. |
| **HB-12 — Torna alla scelta, Correggi, Riprendi invio**        | Raccordi NAV/CRE/ADV/INV/MAG e I-028/I-029/I-114; nessuna prova concorrente di tutte le garanzie insieme.                                                                                                                                                                 | Stesso contesto e nessun doppio inserimento; verificare l'esito incerto prima del nuovo tentativo. Permessi ricontrollati all'applicazione.                                                                  |

## Scegliere il tipo senza chiudere l'homebrew nei soli talenti

Le categorie non sono altrettante pagine globali. Danno campi pertinenti nello
stesso percorso; le opzioni avanzate restano espandibili. La tabella definisce
le famiglie di input, non attesta già ogni possibile regola speciale.

| Tipo                                      | Input specifici e risultato visibile                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Classe e sottoclasse                      | Classe collegata per la sottoclasse; livelli e privilegi; scelte o concessioni, competenze, progressioni numeriche, magie e risorse. Per una classe completa anche Dado Vita, competenze iniziali/multiclasse e progressione degli incantesimi. Le concessioni iniziali non vengono duplicate nel respec. Beyond non supporta classi complete; Shard e Foundry sono i precedenti pertinenti. |
| Talento, specie e background              | Prerequisiti descritti e strutturati quando supportati; privilegi, alternative, competenze, caratteristiche e dotazione pertinenti. Distinguere «scegli uno» da «ottieni tutti», quantità e livello di acquisizione. Nessun requisito inventato dal nome.                                                                                                                                    |
| Incantesimo                               | Livello, scuola, tempi, componenti, portata, bersagli/area, durata/concentrazione; attività con tiro per colpire, TS, danni/cure o utilità; eventuale progressione per livello. La disponibilità su una lista è separata dal prepararlo o lanciarlo.                                                                                                                                         |
| Oggetto, arma, armatura o consumabile     | Tipo/base, descrizione, peso e valore se noti, proprietà pertinenti, danno/difesa, sintonia, cariche/recupero, attività e quantità consumata. Creare la definizione non assegna una copia, non equipaggia e non riempie cariche già spese.                                                                                                                                                   |
| Creatura                                  | Identità e dati dello stat block: taglia/tipo, difese, PF, caratteristiche, sensi, velocità, competenze, tratti/attività e risorse. Pedina, controllo e stato dell'istanza sono separati dal modello. Il dettaglio dell'editor PNG appartiene anche a Preparazione.                                                                                                                          |
| Privilegio riutilizzabile                 | Descrizione, requisiti, scelte, attività ed effetti, poi collegamento a classe/talento/altro contenuto. Evitare di ricopiare lo stesso testo non autorizza a propagare revisioni in silenzio.                                                                                                                                                                                                |
| Stato, contatore o abilità personalizzata | I-160–I-162: nome e descrizione; per contatore valore/massimo facoltativo, per abilità caratteristica e competenza effettiva, per stato eventuali effetti espliciti. Accesso rapido dalla scheda; si può conservare un semplice promemoria senza automatismi.                                                                                                                                |

Tabelle, mazzi, avventure, scene e mappe restano contenuti riutilizzabili nella
Biblioteca, ma hanno editor propri e stato di partita distinto: F-043/F-059/F-038/
F-013 non sono assorbite da una generica descrizione homebrew.

## Identità, descrizione e regole eseguibili

**Identità e fonte:** nome, tipo e lingua; testo breve e descrizione estesa;
autore e origine dichiarata; regola originale di casa oppure ricostruzione di
un contenuto esistente, edizione e riferimento se conosciuti. I riferimenti
privati mantengono i loro accessi. Una fonte sconosciuta resta tale, non riceve
una citazione SRD fittizia. EN e IT possono essere traduzioni dello stesso
contenuto; una lingua mancante è indicata senza fingere una traduzione.

**Requisiti e scelte:** ogni scelta mostra titolo, quante alternative selezionare,
quando si ottiene, opzioni e dipendenze. «Concedi competenza» è distinto da
«permetti di sceglierla». Si può mantenere un requisito solo testuale: sarà
visibile come controllo manuale, non verificato automaticamente. Le deroghe
per talenti I-060 restano riconoscibili e non aggirano tutti i controlli per
qualsiasi contenuto.

**Attività:** ogni attività ha nome e forma d'interazione: senza bersaglio,
creatura/oggetto, punto, sagoma o più bersagli. Se pertinenti espone tempo,
portata, quantità, tiro/TS e CD, effetti, danno/cura, risorsa e costo, durata,
recupero e progressione. Il requisito per rendere disponibile un comando è
diverso dall'effetto dopo un esito e dal costo pagato al tentativo. TABLE/MAG
restano autorità sul momento del consumo: niente consumo all'apertura della
scheda o alla preview. Attività multiple restano distinte nella stessa capacità.

**Effetti:** valore interessato, operazione supportata, origine, destinatario,
condizione, inizio e fine. L'autore distingue un valore derivato dal livello
corrente da uno calcolato quando l'effetto viene applicato. Un contenuto fermo
alla revisione 1 può ancora calcolare il bonus di competenza corrente: versione
fissata non significa congelare ogni numero del personaggio.

Il catalogo delle operazioni ammesse e le combinazioni di effetti richiedono
ancora specifica normativa. Campo non supportato → spiegazione e parte manuale
visibile, mai finto automatismo. Prima di salvare per l'uso si segnalano campi
richiesti mancanti, riferimenti non accessibili, cicli e formule non valide.
Si può salvare sempre una bozza incompleta. Una capacità descrittiva valida può
essere usata manualmente; una parte strutturata non valida non viene eseguita.

## Anteprima, prova e salvataggio

**Anteprima** mostra la voce come apparirà in Biblioteca, nella scheda e fra le
azioni, con l'elenco delle parti automatizzate e manuali. **Prova** usa dati
fittizi modificabili, per esempio livello, caratteristica, risorse e bersaglio;
mostra domande, calcolo e risultato senza creare log, tiri pubblici, copie o
consumi nella partita. L'assenza di dati per la prova non certifica correttezza.

**Salva bozza** conserva il lavoro d'autore. **Salva contenuto** crea una revisione
utilizzabile e torna al dettaglio; se provenivo da una scelta, **Torna alla scelta**
mi riporta lì. **Annulla** esce dalle modifiche non applicate: se non sono ancora
salvate propone conservarle o scartarle. Non cancella una versione in uso.
ESC chiude prima il dettaglio più interno senza eliminare lavoro non salvato.

Il solo salvataggio non pubblica, condivide, abilita in una campagna né cambia
una scheda. Dopo un salvataggio fallito il testo resta visibile e copiabile;
«salvato sul dispositivo» è distinto da «sincronizzato». L'editor non dichiara
supporto offline completo della Biblioteca: se i dati non sono disponibili,
indica il limite. L'eventuale bozza locale non applica modifiche condivise fuori
rete e non garantisce la disponibilità di allegati non scaricati.

## Accesso, abilitazione e impiego

| Persona/comando                                        | Effetto autorizzato                                                                | Cosa non concede                                                                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Autore o editor delegato → Modifica                    | Nuova bozza/revisione del contenuto che può modificare.                            | Controllo delle schede che lo usano.                                                         |
| Persona con diritto di condivisione → Condividi        | Destinatari leggibili e accesso al materiale secondo i permessi.                   | Abilitazione comune o pubblicazione. Non concede copie esportabili di ogni allegato privato. |
| DM/co-DM autorizzato → Abilita in campagna             | Rende quella revisione disponibile come opzione comune e ne indica la provenienza. | Assegnazione automatica a tutti, lettura di note Solo io o controllo di schede esterne.      |
| Controllore autorizzato della scheda → Scegli/Aggiungi | Usa la revisione selezionata nel relativo flusso CRE/ADV/INV/MAG.                  | Nuova approvazione DM a ogni tiro, duplicazione dei benefici o pubblicazione.                |
| Autore autorizzato → Pubblica                          | Avvia il percorso I-127/I-128 per contenuto originale destinato al pubblico.       | Pubblicazione obbligatoria per il gruppo, acquisto o incarico dell'owner come moderatore.    |

Il DM può sempre correggere nel perimetro della campagna stabilito, con
conseguenza leggibile. «Il DM può correggere» non equivale a «ogni DM può
modificare qualsiasi oggetto personale privato». La matrice completa dei ruoli
resta nel relativo ramo F-006/F-007.

## Nuova revisione e contenuto già in uso

**Modifica** parte dalla revisione salvata; una bozza successiva non tocca gli
utilizzatori. **Duplica** crea invece un'altra identità indipendente. Se una
nuova revisione è disponibile e accessibile, il dettaglio può mostrare **Aggiornamento
disponibile**; la persona può ignorarlo, leggere le differenze o preparare
l'aggiornamento. Nessuna conversione automatica neppure per correzioni editoriali.

**Confronta** mostra revisione attuale/proposta, origine e differenze: testo,
privilegi aggiunti/rimossi, scelte richieste, valori e attività, risorse e
recuperi. Distingue modifiche locali dell'utilizzatore e dati vivi della partita.
Le dipendenze elencano la revisione richiesta; salvare una nuova versione di
un privilegio collegato non aggiorna di nascosto il talento che lo contiene.

**Rivedi aggiornamento** lavora su una bozza della modifica, non su una copia
obsoleta dell'intera scheda. Conserva PF attuali, beni, consumi, storia e altre
scelte estranee. Se la stessa riserva passa da massimo 3 a massimo 4 con 2 usi
spesi, propone 2 disponibili, non 4. Se il nuovo massimo è 1 con 2 usi spesi,
mostra 0 disponibili e 1 uso eccedente storico da riconciliare, senza valori
negativi o rimborso automatico. Non sommare riserve diverse perché hanno lo
stesso nome. Una risorsa rimossa o sostituita chiede dove conservarne la traccia;
finché la scelta necessaria manca **Applica** spiega il motivo e resta indisponibile.

I benefici passivi e le concessioni della definizione sostituita vengono
ricalcolati o rimossi secondo le differenze approvate, come in ADV: un bonus
eliminato dalla revisione 2 non rimane attivo solo perché esisteva nella 1.
Le istanze temporanee già avviate e gli esiti risolti conservano invece fonte,
durata e valori fissati secondo la propria regola, mantenendo dinamici i
riferimenti dichiarati tali. L'aggiornamento non riscrive un esito storico
né prolunga una durata. **Correggi effetto** è un comando separato,
autorizzato e tracciato. Per trasformazioni, concentrazione e risorse non
equivalenti vale la riconciliazione specifica ancora aperta in ADV/MAG.

**Applica a questo personaggio** ricontrolla autorità, dati attuali e
utilizzabilità della nuova revisione: leggerla non significa poterla scegliere
nella campagna. Se il DM ha abilitato la revisione 1, la 2 non diventa
implicitamente opzione comune. Il confronto mostra la disponibilità o il
motivo dell'indisponibilità; conserva le eccezioni individuali già concordate
nel loro perimetro, senza creare un permesso da chiedere a ogni tiro. Quindi registra
la sostituzione una volta e torna alla stessa scheda. Se un tiro nel frattempo
ha consumato una risorsa pertinente, il riepilogo viene aggiornato; una nota
indipendente non è motivo per perdere tutta la bozza. Su conflitto reale si
mostrano i valori, si può rivedere o mantenere la versione attuale. Un risultato
incerto per caduta di rete resta «verifica in corso», non invito a duplicare
l'operazione. La prima specifica non introduce un pulsante globale che riscriva
tutte le schede altrui.

**Correggi aggiornamento** propone la revisione precedente con confronto sullo
stato attuale, preservando consumi successivi. Non è un riavvolgimento indiscriminato.
Rimuovere dalla raccolta nasconde la voce dalla propria raccolta; eliminazione
dell'originale, ritiro pubblico e revoca di accessi sono operazioni diverse.
Per materiale privato revocato non promettere accesso perpetuo né cancellare
progressi in silenzio: permessi sul testo, dati derivati e conservazione della
partita necessitano ancora una politica comune esplicita.

## Due esempi completi

### Ricostruire lo Spadaccino usato dal gruppo

Il giocatore apre Biblioteca, Crea, Sottoclasse; sceglie la classe Ladro e una
base disponibile oppure Da zero. Registra che sta ricostruendo una precedente
opzione senza cambiarne le capacità, I-062/I-063. Fonte ed edizione precise
restano da fornire: questa specifica non inventa il manuale o i suoi privilegi
e non ne inserisce il testo nel repository pubblico.

Aggiunge privilegi ai livelli pertinenti alla fonte selezionata, descrizioni e
parti strutturate supportate. Se il raccordo con la classe 2024 richiede una
scelta, viene mostrata come adattamento esplicito, non fatto passare per copia
invariata. Prova le concessioni su un personaggio fittizio, salva e condivide
con la campagna. Il DM abilita l'opzione comune; il giocatore la seleziona in
Rivedi scelte. Il riepilogo ADV confronta le capacità senza duplicare inventario
o recuperare risorse. Nessuna pubblicazione richiesta.

Più tardi l'autore corregge la descrizione nella revisione 2: la scheda conserva
la 1. Il controllore legge le differenze e applica quando opportuno. Chi tiene
la 1 continua a giocare; una fonte resa inaccessibile segue la politica di
revoca ancora da completare, non una promessa di accesso illimitato.

### Capacità originale: reputazione della gilda

Caso sintetico da I-069, **regola di casa**, non regola SRD. L'autore crea un
talento con condizione per una prova di Persuasione: «Stai facendo leva sulla
reputazione della tua gilda?» e conseguenza vantaggio quando confermata. La
scelta No conserva il tiro normale; chiudere la domanda annulla la preparazione
di quel tiro. Non è richiesta un'autorizzazione digitale del DM.

In Anteprima imposta Carisma +2 e competenza +3. Sì mostra due d20 e +5,
con la capacità come origine del vantaggio; No mostra un d20 e +5. Con dadi
fisici il giocatore inserisce i risultati richiesti, con dadi digitali li genera
l'app; in entrambi i casi vede valori grezzi, selezione del dado e modificatori.
Non viene aggiunto un ulteriore +5 al totale già comprensivo. Se coesiste
svantaggio il resolver della regola selezionata decide la combinazione: l'editor
non rende questo vantaggio speciale capace di ignorarlo.

Salva e usa senza campagna digitale. Cambiare la descrizione della gilda non
conferma la condizione a ogni tiro futuro; la domanda compare solo quando
pertinente e impostata così, non per ogni azione. Non si deduce che un PNG
conosca la gilda o che sia favorevole, né si rivela una CD segreta.

## Verifica concettuale e lavoro residuo

| Caso                                            | Risultato richiesto                                                                                           |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| HB-01a — bozza incompleta, esco e riprendo      | Nessuna capacità concessa; testo conservato se salvato, stato esplicito.                                      |
| HB-01b — duplico un talento                     | Due definizioni indipendenti, zero benefici doppi sulla scheda.                                               |
| HB-02 — testo senza campi meccanici             | Consultabile e utilizzabile manualmente, non dichiarato automatizzato.                                        |
| HB-03 — formula non valida                      | Bozza salvabile; errore localizzato, nessuna esecuzione nascosta.                                             |
| HB-04 — condivido col gruppo                    | Non abilita l'opzione comune e non pubblica.                                                                  |
| HB-05 — nuovo testo/revisione                   | Nessun aggiornamento silenzioso dei personaggi.                                                               |
| HB-06 — massimo 3→4, spesi 2                    | Stessa riserva: disponibili 2, senza riposo implicito.                                                        |
| HB-07 — consumo durante il confronto            | Riepilogo sullo stato corrente, non ripristino del vecchio consumo.                                           |
| HB-08 — editore privo di controllo della scheda | Può proporre revisione, non applicarla alla scheda altrui.                                                    |
| HB-09 — esito di Applica incerto                | Verifica dello stesso invio; nessuna seconda concessione.                                                     |
| HB-10 — reputazione, dadi fisici/digitali       | Stessa domanda e breakdown; vantaggio non deduce fatti narrativi.                                             |
| HB-11 — formula dinamica, revisione fissa       | Legge il valore corrente dove dichiarato; conserva il valore applicato dove previsto.                         |
| HB-12a — revisione 2 rimuove bonus passivo      | Bonus ricalcolato/rimosso nel confronto; non confuso con un effetto temporaneo già avviato.                   |
| HB-12b — campagna abilita solo revisione 1      | La nuova revisione leggibile non è automaticamente utilizzabile; disponibilità ed eventuale deroga esplicite. |
| HB-12 — revisione ritirata o accesso revocato   | Segnala il problema senza inventare accesso perpetuo o cancellare progressi. Politica completa ancora aperta. |

Questi sono casi di contratto, non test eseguiti. Restano: catalogo completo
campi/operazioni e stacking per tutti i tipi, authoring di attività speciali,
risorse non equivalenti, traduzioni divergenti, dipendenze private revocate,
ritiro/moderazione/pubblicazione, formati di import/export e offline completo.
I successivi editor di scene, incontri, tabelle e mazzi restano lavoro distinto.
La review documentale non dimostra funzionamento, ergonomia o realizzabilità
di tutte le combinazioni già provata.
