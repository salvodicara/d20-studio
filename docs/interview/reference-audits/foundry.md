# Foundry — inventario esterno e confronto con il contratto

**Consultazione: 23/09/2026. Ricerca: R182.** Inventario costruito dalla
[knowledge base ufficiale](https://foundryvtt.com/kb/) e dalle fonti del sistema
D&D, poi confrontato con [COVERAGE](../COVERAGE.md),
[NAVIGATION_COVERAGE](../NAVIGATION_COVERAGE.md), [NAVIGATION](../NAVIGATION.md)
e [Biblioteca](../pages/library.md). Le 63 voci interne sono il termine del
confronto, non il catalogo da cui sono state ricavate le famiglie esterne.

Questo è un audit documentale circoscritto: nessun account, installazione,
runtime o test umano. Le 30 famiglie sotto non attestano ogni singolo comando
Foundry, la completezza delle nostre funzioni o l'esame di tutte le estensioni.
«Da valutare» e «non mappato» non significano «escluso». La presenza di una
capacità in Foundry non ne dimostra la superiorità né ne approva automaticamente
l'adozione. Il confronto con altri prodotti pertinenti resta aperto.

## Versioni e limiti delle fonti

Tutti i collegamenti esterni della tabella sono stati consultati il **23/09/2026**.

- **C**: Foundry core, pagina della knowledge base senza versione/data dichiarata.
  La lettura odierna non rende la pagina una specifica immutabile della UI attuale.
- **S6**: sistema ufficiale **dnd5e**, wiki aggiornata il **10/09/2026** e
  contrassegnata **6.0.0**; non è Foundry core. Le wiki sono fonti mobili.
- **V14**: core **14.359**, release stabile del **01/04/2026**, quando indicato.
- Le date/versioni più precise presenti nelle singole pagine prevalgono sulla
  legenda. La pagina Tiles dichiara **14.368, 22/09/2026**.
- La baseline funzionale richiesta **dnd5e 6.0.0** non è l'ultima patch:
  le [release ufficiali](https://github.com/foundryvtt/dnd5e/releases) riportano
  anche **6.0.2, 15/09/2026**, commit `c9f6f2d`. La
  [release 6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0)
  richiede Foundry core 14 o superiore. Nessuna compatibilità di moduli viene
  dedotta da quella del sistema.

## Trenta famiglie documentate

La colonna centrale indica un raccordo, non una funzione conclusa. Le lacune
sono distinte dalle esclusioni esplicite già acquisite.

| #   | Famiglia esterna documentata, strato e fonte                                                                                                                                                                                                                    | Collocazione nel nostro contratto                      | Lacuna o esclusione reale                                                                                                                                                                                               |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Creare, configurare, avviare e riaprire mondi — C, [Game Worlds](https://foundryvtt.com/article/game-worlds/)                                                                                                                                                   | F-006; Campagne/Inizio, NAV-02/03                      | Ciclo amministrativo e cancellazione incompleti. Il mondo Foundry dipendente da un sistema non impone un motore multisistema al nostro prodotto.                                                                        |
| 2   | Utenti, ruoli e permessi sui documenti — core 13.350, 20/10/2025, [Users](https://foundryvtt.com/article/users/)                                                                                                                                                | F-006/F-007; Campagna/Gruppo e impostazioni            | Matrice completa, revoche e più controllori aperti. Non copiare il GM che vede tutti i documenti sopra **Solo io**.                                                                                                     |
| 3   | Attori, tipi di scheda, duplicazione, import/export e token prototipo — C, [Actors](https://foundryvtt.com/article/actors/)                                                                                                                                     | F-008/F-023/F-035; Personaggi, Extra, Veicoli          | CRE/ADV precisano i personaggi; editor PNG/veicoli e sincronizzazione delle rappresentazioni restano parziali.                                                                                                          |
| 4   | Oggetti, editor, copie possedute, permessi e JSON — C, [Items](https://foundryvtt.com/article/items/)                                                                                                                                                           | F-003/F-009/F-027/F-028; INV e Biblioteca              | Editor per categoria e aggiornamenti delle copie in uso non completi.                                                                                                                                                   |
| 5   | Avanzamenti: scelte/concessioni, PF, caratteristiche, tratti, sottoclassi, scaling e modifica oggetti — S6, [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement)                                                                                 | F-008/F-009; CRE/ADV, Biblioteca                       | Il percorso giocatore è definito ordinariamente; authoring di ogni tipo di avanzamento ancora da specificare.                                                                                                           |
| 6   | Attività: Attack, Cast, Check, Damage, Enchant, Forward, Heal, Save, Summon, Teleport, Transform, Utility — S6, [Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities)                                                                               | F-001/F-009/F-023/F-024; TABLE, MAG, INV               | **Enchant e Forward**, attività multiple e combinazione di costi non hanno ancora un contratto di authoring completo.                                                                                                   |
| 7   | Effetti passivi/temporanei, incantamenti, condizioni, durata/scadenza e modifiche al tiro — S6, [Active Effects](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects)                                                                                       | F-001/F-009; MAG/TABLE_REACTIONS                       | Editor generale degli effetti, cumulo, conflitti e dipendenze restano parziali; non equivalgono a un semplice interruttore «condizione».                                                                                |
| 8   | Incontri, iniziativa, turni, combattenti nascosti/sconfitti e più incontri — C, [Combat](https://foundryvtt.com/article/combat/)                                                                                                                                | F-001/F-012/F-060; Tavolo/Preparazione                 | Incontri simultanei, iniziativa speciale e gruppo diviso da completare. Spostare l'indice del turno non prova un riavvolgimento delle conseguenze.                                                                      |
| 9   | Chat IC/OOC, sussurri, risultati espandibili e modalità di tiro — C, [Chat](https://foundryvtt.com/article/chat/)                                                                                                                                               | F-002/F-034; registro/richieste/Tavolo                 | Chat sociale, destinatari e storico non sono completamente specificati dalla grammatica dei dadi.                                                                                                                       |
| 10  | Scene: consulta, attiva, precarica, duplica; finestre separate — C [Scenes](https://foundryvtt.com/article/scenes/) e V14 [release](https://foundryvtt.com/releases/14.359)                                                                                     | F-005/F-013; NAV e Preparazione                        | NAV distingue consultazione/attivazione. Precaricamento, errori e gestione completa delle finestre restano da dettagliare.                                                                                              |
| 11  | Token: selezione/bersaglio, prototipo/copia, nome, immagine, visione e stati — C, [Tokens](https://foundryvtt.com/article/tokens/)                                                                                                                              | F-005/F-050; TABLE_MOVEMENT e Tavolo                   | Aggiornamento dei prototipi, molte rappresentazioni e dettagli delle impostazioni ancora parziali.                                                                                                                      |
| 12  | Misura di distanza, costo del movimento, tappe e aree — C, [Measurement](https://foundryvtt.com/article/measurement/)                                                                                                                                           | F-005/F-004; TABLE_MOVEMENT/ACTIONS                    | Gesto ordinario definito; geometrie, volo e costi speciali incompleti. V14 usa **Template Regions**, non il vecchio documento MeasuredTemplate, come precisato nella [release](https://foundryvtt.com/releases/14.359). |
| 13  | Pareti, porte, porte segrete, finestre e restrizioni distinte — C, [Walls](https://foundryvtt.com/article/walls/)                                                                                                                                               | F-005/F-013; Preparazione/Tavolo                       | Editor e controllo separato di movimento, luce e visione da completare.                                                                                                                                                 |
| 14  | Luci, oscurità e memoria della nebbia — C, [Lighting](https://foundryvtt.com/article/lighting/)                                                                                                                                                                 | F-005/F-056; Tavolo/Preparazione                       | Memoria individuale/condivisa e reset sono scelte ancora incomplete; non adottare automaticamente la condivisione introdotta nella [V14](https://foundryvtt.com/releases/14.359).                                       |
| 15  | Piani sovrapposti, quote, superfici e caduta — V14 [release](https://foundryvtt.com/releases/14.359), sistema [6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0)                                                                           | F-005/F-013, 2D con quote/piani                        | Geometria e conseguenze ancora parziali. **Ambienti 3D esclusi esplicitamente**; piani 2D non lo sono.                                                                                                                  |
| 16  | Regioni: forme/fori, fasce di quota, eventi, teletrasporti, pause, costi e attivazione di comportamenti — C, [Scene Regions](https://foundryvtt.com/article/scene-regions/)                                                                                     | F-005/F-013/F-036; Preparazione                        | **Editor riutilizzabile di comportamenti regionali non mappato compiutamente**: trappole/passaggi ne coprono solo una parte.                                                                                            |
| 17  | Disegni geometrici/liberi, testo e segni sulla mappa — C, [Drawings](https://foundryvtt.com/article/drawings/)                                                                                                                                                  | F-052; Tavolo → strumenti                              | Creazione, proprietà, cancellazione e modifiche concorrenti ancora aperte.                                                                                                                                              |
| 18  | Tile immagini/video, trasformazioni, quote, selezione multipla e modifica collettiva — core 14.368, **22/09/2026**, [Tiles](https://foundryvtt.com/article/tiles/)                                                                                              | F-013; editor scene                                    | **Composizione con asset e modifica in gruppo** non sono esaurite da «carica mappa». Campi e comandi mancanti.                                                                                                          |
| 19  | Journal multipagina, testo/immagini/video/PDF, collegamenti, segreti, rivelazioni e scrittura collaborativa — C, [Journal](https://foundryvtt.com/article/journal/)                                                                                             | F-007/F-014/F-015/F-029/F-039; Appunti/Diario/Mondo    | Editor multimediale, collaborazione, allegati e porzioni rivelabili non completi. Non confondere diario e soli resoconti.                                                                                               |
| 20  | Tabelle pesate, ripetizioni/esaurimento, scelta manuale, sottotabelle e risultati multipli — C, [Tables](https://foundryvtt.com/article/roll-tables/)                                                                                                           | F-018/F-043; Biblioteca/Preparazione                   | Già nominate le lacune, ma manca il percorso operativo completo.                                                                                                                                                        |
| 21  | Carte, mazzi, mani, pile, pesca, distribuzione, scambio e reset — C, [Cards](https://foundryvtt.com/article/cards/)                                                                                                                                             | F-059; Biblioteca/Tavolo                               | Modello e partita distinti; permessi, trasferimenti e correzioni ancora incompleti.                                                                                                                                     |
| 22  | Compendi, import/export e ricerca filtrata fra fonti — C [Compendium](https://foundryvtt.com/article/compendium/), S6 [Browser](https://github.com/foundryvtt/dnd5e/wiki/Compendium-Browser)                                                                    | F-009/F-033/F-062; Biblioteca/Cerca                    | Filtri per categoria, raccolte grandi e fonti accessibili ancora parziali. Modalità contestuale del browser utile per le scelte del personaggio.                                                                        |
| 23  | Avventure riutilizzabili: pacchetto, collegamenti, import selettivo e ricostruzione — [Adventure](https://foundryvtt.com/article/adventure/), header 13.350/20-10-2025, corpo anche V14                                                                         | F-038/F-027/F-028; Biblioteca/Preparazione             | Dipendenze, aggiornamenti e media da completare. Reimportazione Foundry può sovrascrivere la partita.                                                                                                                   |
| 24  | Calendario, avanzamento del tempo, recuperi alba/tramonto/giorno e ordini bastioni — S6, [Calendar](https://github.com/foundryvtt/dnd5e/wiki/Calendar)                                                                                                          | F-010/F-025/F-040/F-041/F-056                          | Calendario e riposo non sono sinonimi. Eventi attraversati, recuperi e correzione del tempo richiedono ancora un flusso unitario.                                                                                       |
| 25  | Macro chat/script, directory, hotbar personale, condivisione e import/export — C, [Macros](https://foundryvtt.com/article/macros/)                                                                                                                              | Preferiti/scorciatoie solo adiacenti a F-008/NAV       | **Famiglia distinta non mappata**. Valutare automazioni composte e comandi personali; non dedurre subito JavaScript pubblico o escluderli perché manca una voce.                                                        |
| 26  | Selezione/caricamento file, cartelle, anteprime e accessi — C, [File Picker](https://foundryvtt.com/article/file-picker/)                                                                                                                                       | F-013/F-027/F-028; allegati di Preparazione            | **Gestione riutilizzabile degli asset non definita**: riuso, sostituzione, riferimenti rotti, permessi e rimozione delle dipendenze.                                                                                    |
| 27  | Backup individuali, snapshot, ripristino e gestione dello spazio — C, [Backups](https://foundryvtt.com/article/backups/)                                                                                                                                        | F-061; Campagna → Impostazioni                         | Percorso parziale. I backup Foundry non includono automaticamente media esterni alle cartelle dei pacchetti.                                                                                                            |
| 28  | Preferenze client/utente/mondo, tasti, prestazioni, font, guide e diagnostica — core 13.351, 26/01/2026, [Settings](https://foundryvtt.com/article/settings/)                                                                                                   | NAV menu personale; F-016/F-031, impostazioni campagna | **Inventario delle impostazioni non completo**. La voce generica non definisce ambito, sincronizzazione, default e ritorno di ciascuna preferenza.                                                                      |
| 29  | Playlist, suoni ambientali e chiamate — core, [indice ufficiale](https://foundryvtt.com/kb/)                                                                                                                                                                    | F-017/F-030                                            | **Esclusioni esplicite**: chiamate interne e musica gestita esternamente per ora. Non estendere l'esclusione a qualsiasi feedback visivo o sonoro dell'interfaccia.                                                     |
| 30  | Estensioni: collegamento di oggetti e automazioni su tile — moduli [Token Attacher](https://foundryvtt.com/packages/token-attacher) 4.6.12/verificato 13; [Monk's Active Tile Triggers](https://foundryvtt.com/packages/monks-active-tiles) 14.01/verificato 14 | Adiacenti F-013/F-035/F-036                            | **Insiemi che muovono/ruotano/scalano insieme** e **sequenze configurabili di azioni** non sono equivalenti a selezione multipla o singola trappola: capacità da valutare esplicitamente.                               |

## Estensioni: precedenti utili e parte non auditata

Il catalogo delle estensioni resta aperto. Il [registro di ricerca](../RESEARCH.md)
ha già studiato, su assi delimitati, **Midi-QOL, Item Piles/Give Items, Party
Inventory, Rest Recovery, Monk's TokenBar, Polyglot, Spell Book, Health Estimate,
Quick Insert, Mindful Encounters e Variant Encumbrance**. Si riusano quelle
ricerche con le loro revisioni e i loro limiti: questo elenco non dichiara una
nuova verifica corrente di ciascun modulo né un audit integrale delle sue funzioni.

[Item Piles](https://foundryvtt.com/packages/item-piles), riletto il 23/09/2026,
riporta **3.3.4**, Foundry **13–14**, verificato **14**, aggiornamento relativo
«2 mesi fa». Distingue bottino sulla scena, contenitori, mercanti e scambi.
Le opzioni avanzate dei mercanti non sono tutte comprese in INV; la pagina
richiede inoltre un'integrazione specifica per il sistema, non la compatibilità
universale implicita del solo modulo.

Due capacità distinte emerse dalla verifica mirata del catalogo:

- [Token Attacher](https://foundryvtt.com/packages/token-attacher): **4.6.12**,
  verificato **13**, aggiornamento relativo «1 anno, 2 mesi fa». Elementi
  collegati a un token seguono movimento, rotazione e ridimensionamento.
  Non è stato dimostrato il funzionamento su Foundry 14. F-013/F-035 non
  definiscono ancora compiutamente questo comportamento composto.
- [Monk's Active Tile Triggers](https://foundryvtt.com/packages/monks-active-tiles):
  **14.01**, verificato **14**, aggiornamento relativo «3 mesi fa». Comprende
  eventi di entrata/uscita, filtri sui token, probabilità e più azioni per trigger,
  incluse modifiche a porte/token, tabelle e macro. F-036 e le regioni coprono
  solo parte del percorso; manca l'editor generale delle sequenze.

Queste sono capacità pubblicate, non osservazioni runtime. Installazione, API,
marketplace, hosting e l'intero catalogo dei moduli non sono stati auditati in
questa passata. La distinzione core/sistema/modulo identifica la fonte della
capacità; non prescrive la stessa architettura o procedura tecnica nell'app.

## Note precise per homebrew e copie già in uso

### Definizione e copia posseduta

Trascinare un Item sulla scheda crea una copia indipendente. Modificare
l'originale non aggiorna la copia e viceversa. Il precedente sostiene I-067,
ma non dimostra un aggiornamento guidato delle versioni. L'importazione JSON
nel documento scelto può invece sovrascriverlo.
Fonte: [Items](https://foundryvtt.com/article/items/), core, senza data/versione.

### Importare non equivale a fondere

L'import singolo del compendio crea un nuovo identificativo; l'import completo
può preservare gli identificativi e sovrascrivere documenti corrispondenti.
Il reimport di un'avventura avverte della sovrascrittura. Nessuno dei due prova
la conservazione intelligente di consumi e modifiche locali.
Fonti: [Compendium](https://foundryvtt.com/article/compendium/), core senza
data/versione; [Adventure](https://foundryvtt.com/article/adventure/), header
**20/10/2025, 13.350**, ma corpo con aggiunte V14: documento con riferimenti
di versioni diverse, non una fotografia univoca della vecchia UI.

### Sezioni dell'editor meccanico

Activities separa identità, tempi/durata, bersagli/area, costi multipli, usi
dell'attività e dell'oggetto, effetti. Advancement separa scelta, concessione,
modifica, PF e valori dipendenti dal livello. Sono precedenti concreti per
sezioni distinte, non prova di un editor universale.
Fonti S6: [Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities)
e [Advancement](https://github.com/foundryvtt/dnd5e/wiki/Advancement).

### Formula dinamica, revisione e stato applicato

Gli effetti possono mantenere riferimenti valutati dinamicamente oppure
fissare valori dell'origine/destinatario all'applicazione. Conservare una
versione non significa congelare ogni valore derivato. La revisione della
definizione, la formula e lo stato applicato devono quindi essere distinguibili.
Fonte S6: [Active Effects](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects).

### Modello e partita

La release 6.0.0 documenta il reset di dati dell'attore sugli Item spostati
nella sidebar e l'acquisizione di dati Item/Activity nelle nuove carte chat.
Non importarli come rimborso delle risorse o riscrittura degli esiti storici.
Fonte: [Release 6.0.0](https://github.com/foundryvtt/dnd5e/releases/tag/release-6.0.0),
**10/09/2026**, sistema dnd5e; rispettivamente #1943/#2907 e sezione Chat Cards.

**Adattamento nostro:** confronto fra revisione in uso e proposta, destinazioni
autorizzate, applicazione esplicita e conservazione dei dati vivi. Nelle fonti
lette non è dimostrato un aggiornamento automatico che fonda tutte le modifiche
di definizione con consumi, effetti attivi e personalizzazioni della partita.
Non attribuire quel comportamento a Foundry per analogia con Duplicate o Import.

## Lacune da mantenere visibili

I vuoti più netti di definizione o valutazione sono **macro/comandi composti,
editor di regioni, composizione e modifica collettiva degli elementi della
scena, gestione degli asset e inventario delle impostazioni**. Sono raccordi
da approfondire, non nuove esclusioni. Le capacità già collocate in una pagina
richiedono ancora comandi, conseguenze, salvataggio/annullamento, permessi,
errori e ritorni: una voce di navigazione non ne prova il completamento.

Restano ferme le esclusioni acquisite di chiamate interne, musica interna per
ora e ambienti 3D. Questo audit non taglia altre capacità, non istituisce un
motore multisistema e non chiude il confronto con Beyond, BG3 o altri prodotti.
