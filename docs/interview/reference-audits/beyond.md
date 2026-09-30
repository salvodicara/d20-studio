# Audit esterno — D&D Beyond

23/09/2026 · R181. Inventario ricavato dall'indice ufficiale del prodotto e dalle
sue pubblicazioni, poi confrontato con i contratti di d20 Studio. Le 25 famiglie
qui raggruppate non rappresentano tutte le funzioni Beyond né un limite del
prodotto da progettare. Le 63 voci attuali di d20 Studio non sono state usate come
confine del censimento. Nessuna parità funzionale, completezza o qualità d'uso
dimostrata dal conteggio.

## Metodo e significato della copertura

Punto di partenza: [Tools and Features](https://dndbeyond-support.wizards.com/hc/en-us/categories/6712747082260-Tools-and-Features),
relative guide, [changelog](https://www.dndbeyond.com/changelog) e articoli di
rilascio recenti. Fonti primarie pubbliche consultate il 23/09/2026, senza login,
apertura di dati privati, installazioni, acquisti o test del prodotto.

La matrice descrive capacità **documentate**, non osservazioni runtime. Le date
sono quelle di pubblicazione o aggiornamento mostrate dalle fonti; nessuna delle
pagine consultate dichiara una build applicativa immutabile. Un tutorial storico
rimane un precedente di interazione e non dimostra il comportamento del prodotto
oggi. I testi delle guide non sono fonti normative per le nostre regole 2024.

Il confronto usa [COVERAGE](../COVERAGE.md), [NAVIGATION](../NAVIGATION.md),
[Biblioteca](../pages/library.md), i flussi collegati e le decisioni I061–069,
I127–128. La copertura indica lo stato del contratto concettuale:

- **Dettaglio parziale:** esistono comandi e comportamenti, con lacune nominate.
- **Solo ambito:** il bisogno è registrato, ma manca il percorso concreto completo.
- **Mancante:** non è stato trovato un contratto per quella sottofunzione; non
  equivale a esclusione o approvazione implicita di scope.
- **Esclusione esplicita:** una decisione esclude la capacità dal nostro scopo
  attuale. Non si deduce dal silenzio dei documenti.

## Matrice delle capacità

| ID    | Prodotto e capacità documentata: comandi e sottofunzioni                                                                                                       | Fonte e data                                                                                                                                                                                                                                                                                                                            | Raccordo d20 Studio e copertura reale                                                                                                                                          |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| DB-01 | Builder: creazione Standard guidata, Quickbuilder, anteprima e acquisizione premade; modifica successiva.                                                      | [Creation Methods](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193997716-Character-Creation-Methods), 24/03/2026.                                                                                                                                                                                                       | F008/F031, CRE: **dettaglio parziale**. Le assegnazioni automatiche del Quickbuilder non sono state adottate.                                                                  |
| DB-02 | Builder/scheda: modificare livello e classe, multiclasse, scelte delle capacità, PE o milestone.                                                               | [Builder Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747202748436-Builder-Sections), 27/08/2025; [Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header), 17/09/2025.                                                                                                   | F008, ADV: **dettaglio parziale**; PE di gruppo e casi speciali residui.                                                                                                       |
| DB-03 | Scheda: caratteristiche, TS, abilità, sensi e velocità; modificare difese, competenze e talenti.                                                               | [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections), 17/09/2025, con avviso di documentazione arretrata.                                                                                                                                                                             | F004/F008, Personaggi/CRE/ADV: **dettaglio parziale**; modifiche durante la partita non completamente attraversate.                                                            |
| DB-04 | Scheda: azioni/bonus/reazioni e personalizzazione; Manage Spells, conosciute/preparate, slot, CD e dettagli. La scheda è utilizzabile dentro Maps.             | [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections), 17/09/2025; [Sheet in Maps](https://dndbeyond-support.wizards.com/hc/en-us/articles/48753179456020-What-can-I-do-with-my-character-sheet-in-Maps), 29/04/2026.                                                                  | F001/F008/F044–046, MAG/TABLE_ACTIONS/TABLE_REACTIONS: **dettaglio parziale**.                                                                                                 |
| DB-05 | Scheda: contatori di utilizzi; riposo breve/lungo, Dadi Vita e recuperi all'alba.                                                                              | [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections), 17/09/2025.                                                                                                                                                                                                                     | F010: **solo ambito** per il percorso completo; citare risorse in MAG/ADV non completa riposi, partecipanti e interruzioni.                                                    |
| DB-06 | Inventario: aggiungere/equipaggiare/sintonizzare, monete e peso; inventario comune, contenitori, trasferimento e utilizzatore visibile.                        | [Party Inventory FAQ](https://dndbeyond-support.wizards.com/hc/en-us/articles/40964522619540-Shared-Party-Inventory-FAQ), 09/09/2025; [Sheet Sections](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193946388-Sheet-Sections).                                                                                           | F003/F018/F058, INV: **dettaglio parziale**; controllo condiviso, rimozione del partecipante e revoche ancora aperti.                                                          |
| DB-07 | Extras: Manage Extras/Add an Extra per cavalcature, famigli, compagni e forme, con stat block pertinenti.                                                      | [Extras](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747209465748-Extras), 17/09/2025.                                                                                                                                                                                                                                     | F023/F024/F035: **solo ambito**; fonte, controllo, durata, pedina e fine della forma incompleti.                                                                               |
| DB-08 | Ciclo/presentazione della scheda: nome, ritratto, aspetto, preferenze ed export PDF; su mobile modifica, copia ed eliminazione del personaggio.                | [Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header), 17/09/2025; [My Characters mobile](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747209378964-D-D-Beyond-Mobile-App-My-Characters-Tool), 17/09/2025.                                                                       | F008/F027: **solo ambito** per export, copie e archivio. Personalizzazioni cosmetiche equivalenti **mancanti**, non automaticamente richieste.                                 |
| DB-09 | Campagna e disponibilità: Enable/Disable Content Sharing, Content Management e fonti abilitate sulla scheda.                                                   | [Campaign Sharing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210355604-Campaign-Content-Sharing-and-You), 17/09/2025.                                                                                                                                                                                                 | F006/F009/F033, Campagna/Biblioteca: **dettaglio parziale**; ruoli e revoche incompleti. Limiti commerciali Beyond non adottati.                                               |
| DB-10 | Biblioteca: cataloghi per materiale, ricerca/filtri, raccolta e preferiti; accesso al mazzo digitale Tarokka dalla libreria.                                   | [My Library](https://www.dndbeyond.com/en/library), letta 23/09/2026; [Tarokka](https://dndbeyond-support.wizards.com/hc/en-us/articles/50609998444436-How-do-I-access-my-digital-Tarokka-deck), 25/06/2026.                                                                                                                            | F033/F059/F062, NAV/Biblioteca: **dettaglio parziale**. Tarokka prova l'accesso a un prodotto specifico, non un editor universale di mazzi.                                    |
| DB-11 | Dadi dalla scheda/Maps, registro e destinatari; Shared Dice visibili al tavolo.                                                                                | [Shared Dice](https://dndbeyond-support.wizards.com/hc/en-us/articles/46494171349524-What-is-Shared-Dice), 23/02/2026; [Header](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193980820-Character-Header).                                                                                                                | F002: **dettaglio parziale**. Attese, dadi fisici segreti e richieste concorrenti rimangono lacune proprie.                                                                    |
| DB-12 | Map Browser: mappe base/manuali/upload; titolo, caricamento, scala, anteprima, salva/annulla, modifica/elimina.                                                | [Adding a Map](https://dndbeyond-support.wizards.com/hc/en-us/articles/46363322024340-Adding-a-Map) e [Upload/Scale](https://dndbeyond-support.wizards.com/hc/en-us/articles/46363324655508-Uploading-and-Scaling-a-Map), 16/02/2026.                                                                                                   | F013/F028/F038, Preparazione: **dettaglio parziale**; editor geometrico non definito.                                                                                          |
| DB-13 | Token: selezionare/spostare, rinominare/ripristinare nome, colore, nascondere/rivelare ed eliminare pedine.                                                    | [Controlling Tokens](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385107476116-Controlling-Tokens), 17/02/2026.                                                                                                                                                                                                            | F005/F006/F050, TABLE_MOVEMENT: **dettaglio parziale**. Il controllo libero di qualsiasi token descritto dalla guida non corrisponde ai nostri permessi.                       |
| DB-14 | Visibilità/presentazione: coprire/rivelare tutta la mappa o dipingere/cancellare nebbia; mostrare immagini/video personali al tavolo.                          | [Fog of War](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385202659732-Fog-of-War), 17/02/2026; [Custom Reveals](https://www.dndbeyond.com/posts/2247-show-tell-introducing-custom-reveals-on-d-d-beyond), **22/09/2026**.                                                                                                 | F005/F013/F016: **dettaglio parziale** per visibilità; caricamento/rivelazione multimediale e suo ciclo **mancanti**.                                                          |
| DB-15 | Strumenti sulla mappa: righello privato; puntatore/ping condiviso; disegni e overlay con forme, dimensioni, rotazione, visibilità e cancellazione.             | [Ruler/Point/Ping](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385180954772-Ruler-Point-and-Ping), [Overlays](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385298657556-Overlays) e [indice Maps](https://dndbeyond-support.wizards.com/hc/en-us/sections/46363327444884-How-to-Use-Maps), guide 17/02/2026. | F005/F051/F052: **solo ambito** per gli strumenti completi; preview di movimento/azione già parzialmente definita.                                                             |
| DB-16 | Incontri: aggiungere partecipanti, iniziativa manuale/automatica, avviare/avanzare/arretrare/terminare; aggiunte durante lo scontro, PF e stat block con tiri. | [Combat in Maps](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385529638164-Combat-Encounters-on-Maps), 17/02/2026; [Encounters legacy](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747237485716-Encounters), 15/09/2025.                                                                                      | F001/F012/F048–050, TABLE\_\*: **dettaglio parziale**; builder, stima 2024 e iniziativa speciale incompleti. Legacy Encounters usa 2014; Maps distingue il percorso 2024.      |
| DB-17 | Spectator View: finestra separata, mappa corrente con segreti occultati, proiezione sul secondo schermo.                                                       | [Spectator View](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385447642004-Spectator-View), 17/02/2026.                                                                                                                                                                                                                    | F016: **solo ambito** per esperienza TV/schermo condiviso; il requisito remoto non la completa.                                                                                |
| DB-18 | Scene Prep: Add a Scene, Edit, formato facoltativo, autosalvataggio, pin DM e richiamo note; organizer senza battlemap.                                        | [Scene Prep](https://www.dndbeyond.com/posts/2236-how-to-use-scene-prep-d-d-beyonds-new-prep-tool), **31/08/2026**.                                                                                                                                                                                                                     | F012/F014/F018/F036/F038, Preparazione: **dettaglio parziale**; note localizzate e lavoro durante il gioco da precisare.                                                       |
| DB-19 | Journals: Quick Jot con J, diario DM privato e diario comune; formattazione, modifica delle voci e blocco della voce durante editing altrui.                   | [Player Editing/Journals](https://www.dndbeyond.com/posts/2241-whats-new-in-maps-player-editing-comes-to-journals), **02/09/2026**.                                                                                                                                                                                                     | F007/F029, Campagna: **dettaglio parziale**; concorrenza e organizzazione non risolte dalla sola visibilità.                                                                   |
| DB-20 | Homebrew: editor per background, talenti, oggetti magici, mostri, specie, magie e sottoclassi; base o modello e campi strutturati.                             | [Creation Basics](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238519700-Homebrew-Creation-and-Collection-Basics), 29/09/2025; tutorial sotto.                                                                                                                                                                           | F009, Biblioteca: **dettaglio parziale** d'impianto; campi/editor ed effetti esatti ancora mancanti.                                                                           |
| DB-21 | Raccolta homebrew: My Creations distinto da Collection; Add/Remove from Collection, disponibilità negli strumenti/campagne, uso privato senza pubblicazione.   | [Creation Basics](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747238519700-Homebrew-Creation-and-Collection-Basics); [Sharing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content), 29/09/2025.                                                                 | F009/F033, Biblioteca: **dettaglio parziale**. I066 conserva l'abilitazione DM; non copia indiscriminatamente la condivisione Beyond.                                          |
| DB-22 | Pubblicazione homebrew: pubblica, nuova versione, cronologia, copia da modello distinta dalla revisione; versioni pubblicate preservate.                       | [Updating Published Homebrew](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published), 10/11/2021; [Sharing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content), 29/09/2025.                                                                       | F009/F033, I067/I127/I128: **dettaglio parziale**; confronto/applicazione, dipendenze, revoche e moderazione da concretizzare.                                                 |
| DB-23 | App iOS/Android: fonti scaricate offline, schede precedentemente aperte, banner offline/refresh e recupero lista.                                              | [Mobile App](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747193137684-D-D-Beyond-Mobile-App), 05/01/2026; [My Characters](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747209378964-D-D-Beyond-Mobile-App-My-Characters-Tool), 17/09/2025.                                                                     | F026: **dettaglio parziale**. Non prova editing completo o multiplayer offline.                                                                                                |
| DB-24 | Avrae: collegare Discord all'account e usare contenuti acquisiti attraverso il bot.                                                                            | [Avrae integration](https://dndbeyond-support.wizards.com/hc/en-us/articles/7741344507668-Avrae-Discord-Bot), 15/09/2025.                                                                                                                                                                                                               | **Mancante** come integrazione. Usare la nostra scheda accanto a Discord non equivale a sincronizzazione/bot; l'esclusione voce/video non esclude automaticamente questo tema. |
| DB-25 | Looking for Group: eventi/negozi locali, sessioni professionali StartPlaying e comunità Discord.                                                               | [Looking for Group](https://dndbeyond-support.wizards.com/hc/en-us/articles/51836977304212-What-is-Looking-For-Group), 30/07/2026.                                                                                                                                                                                                      | F063: **solo ambito, decisione ancora aperta**. Distinto dal calendario di un gruppo già formato F011.                                                                         |

## Homebrew: fonti operative per editor e contenuti già in uso

### Definizione e comportamento strutturato

- **Talento:** [Design Workshop: Feats](https://www.dndbeyond.com/posts/168-design-workshop-feats),
  James Introcaso, **13/03/2018**. Dopo la creazione della base: prerequisiti,
  opzioni, modificatori, magie e usi limitati. È un precedente di editor, non una
  regola 2024 né la prova che qualunque talento sia automatizzabile.
- **Oggetto:** [Magic Item tutorial](https://www.dndbeyond.com/posts/1103-how-to-create-a-homebrew-magic-item-using-d-d),
  **06/11/2021**. Modello/da zero, identità/versione, tipo e campi dipendenti,
  descrizione, sintonizzazione, cariche/recupero, modificatori e magie. Le
  condizioni elencate nell'apposita sezione sono descritte ma non applicate
  automaticamente alla scheda: controesempio all'equivalenza testo=effetto.
- **Sottoclasse:** [New Player's Guide to Homebrew](https://www.dndbeyond.com/posts/845-new-players-guide-how-to-homebrew-on-d-d-beyond),
  **11/07/2020**. Capacità con azioni, modificatori, magie, creature e
  progressione. [No Homebrew Classes](https://dndbeyond-support.wizards.com/hc/en-us/articles/14175512652308-No-Homebrew-Classes),
  **22/03/2023**, distingue esplicitamente sottoclassi da classi complete.

Questi tutorial sono storici e precedenti al 2024. La loro utilità è rendere
visibili i gruppi di campi e la separazione fra descrizione e comportamento.
Non autorizzano la copia di regole, l'adozione della loro matematica, un catalogo
già disponibile o un interprete universale di testo libero.

### Revisione pubblicata, copia indipendente e scheda

[Same Vision, New Version](https://www.dndbeyond.com/posts/1104-same-vision-new-version-updating-published),
**10/11/2021**, documenta `Create New Version`: nuova revisione privata,
modifica e successiva pubblicazione. `Use as template` crea invece un contenuto
indipendente. Cronologia e versioni precedenti restano accessibili.

La [risposta #14 di Davyd](https://www.dndbeyond.com/forums/d-d-beyond-general/bugs-support/5486-edit-magic-items#c14),
**03/02/2022, 09:07 UTC**, specifica che una nuova versione pubblicata aggiorna
l'elenco pubblico senza cambiare le schede/raccolte che hanno quella vecchia.
È lo stesso autore del tutorial ufficiale, presentato in quest'ultimo come
moderatore Beyond: dichiarazione primaria storica, non test corrente. La
risposta menziona separatamente problemi causati da modifiche a contenuti non
pubblicati. **Non generalizzare questo mantenimento della versione Beyond a
ogni modifica privata.**

La nostra I067 resta più generale: definizione in libreria e versione usata dal
personaggio sono distinte, con aggiornamento esplicito. Il suo precedente
originario Foundry R048/R049 non viene sostituito né riscritto come se ogni
comportamento Beyond fosse identico. Restano da specificare chi propone/applica,
differenze, risorse già consumate, dipendenze, effetti attivi, recupero e revoca.

[Deleting Published Homebrew](https://dndbeyond-support.wizards.com/hc/en-us/articles/14175427969428-Deleting-Published-Homebrew-Content),
**29/09/2025**, conserva l'irreversibilità della pubblicazione. È un limite del
concorrente, non un obbligo per d20 Studio. La guida
[Sharing and Publishing](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747210455828-Sharing-and-Publishing-Homebrew-Content),
**29/09/2025**, continua a descrivere una coda di revisione preventiva: resta il
contrasto con il precedente storico conservato in R105. Questa lettura non
attesta il runtime attuale della moderazione e non cambia I128.

## Novità, omissioni e controevidenze

- **Rilascio del 22 settembre:** [Custom Reveals](https://www.dndbeyond.com/posts/2247-show-tell-introducing-custom-reveals-on-d-d-beyond)
  documenta immagini/video personali rivelati nella sessione, per Master Tier.
  Libreria persistente degli upload, Custom Stickers e Custom Token Art sono
  ancora annunciati nell'articolo: non contarli come consegnati. Nessun
  abbonamento o limite commerciale è adottato implicitamente.
- **Incontri diversi:** [Encounters](https://dndbeyond-support.wizards.com/hc/en-us/articles/7747237485716-Encounters)
  conserva il percorso 2014; [Combat Encounters on Maps](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385529638164-Combat-Encounters-on-Maps)
  descrive la stima 2024. Non fondere strumenti, formule o maturità dei percorsi.
- **Segnalazione e feedback:** [Safety and Feedback](https://dndbeyond-support.wizards.com/hc/en-us/articles/46385504274196-Safety-and-Feedback-Features),
  **17/02/2026**, documenta `Report Image` e `User Feedback`. Sono sottofunzioni
  ulteriori rispetto alle 25 famiglie raggruppate. Nei nostri contratti il
  percorso completo è **mancante**; F032 accordi del gruppo non lo copre.
- **3D:** è una nostra **esclusione esplicita**. La
  [Sigil Sunset FAQ](https://dndbeyond-support.wizards.com/hc/en-us/articles/42550438974868-Sigil-Sunset-FAQ),
  **28/01/2026**, mantiene il servizio disponibile fino al **31/10/2026** e
  dichiara l'inaccessibilità dei contenuti dopo la chiusura. Non chiamarlo già
  spento alla data dell'audit; non confondere il 3D del tavolo con dadi animati.
- **Navigazione e documentazione datate:** i tutorial homebrew citano ancora
  `Collections`, mentre le pagine pubbliche correnti espongono `Play D&D` e
  `More Tools`. Builder Sections conserva una frase storica sull'export futuro,
  mentre Character Header documenta l'export PDF. La data di aggiornamento
  della pagina non garantisce che ogni suo paragrafo sia stato aggiornato.
- **Oltre il raggruppamento:** account/commercio, tutti i cataloghi,
  decorazioni, audio di pronuncia e ogni comando delle categorie non sono
  esauriti qui. Conservare l'indice esterno come ingresso per passate
  successive; non trasformare 25 famiglie in attestato di censimento completo.

## Conseguenze per il lavoro successivo

Le lacune più concrete sono editor homebrew per tipo, applicazione delle
revisioni ai contenuti in uso, riposi completi, creature/formazioni collegate,
copie/export, permessi condivisi, preparazione geometrica, schermo comune,
annotazioni, media rivelati e scrittura concorrente. I percorsi CRE/ADV/INV/MAG
e TABLE\_\* forniscono raccordi utili; non completano queste famiglie per
associazione.

Il confronto rimane aperto a prodotti ulteriori. Authoring/compendi, tabelle e
mazzi, luce/visione, preparazione, mondo/calendari, trasferimenti/backup ed
estensioni sono categorie da mantenere nell'audit più largo. I precedenti già
registrati di Foundry, Shard e Roll20 illuminano parti non documentate da
questo censimento Beyond. L'assenza in questa lettura non prova l'assenza nel
prodotto, né riduce lo scopo alle capacità dei tre riferimenti principali.

Questo file raccoglie evidenza e confronto. Le nuove adozioni concrete restano
nei contratti e nel registro delle decisioni; non sono autorizzate da una riga
classificata come mancante. Il raccordo di ricerca è R181 in
[RESEARCH](../RESEARCH.md).
