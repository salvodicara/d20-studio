# Blueprint — ricerca su geometrie, porte e avvicinamento

Verifica documentale del 23/09/2026, `review_journey`, modello e sforzo
ereditati invariati. Unico file scritto per questo incarico. Nessuna prova
runtime dei concorrenti, accesso ad account, installazione o modifica del
codice. Le raccomandazioni sotto non attestano che il blueprint le implementi.

Raccordi riletti: [TABLE_MOVEMENT](../../docs/interview/TABLE_MOVEMENT.md),
[TABLE_ACTIONS](../../docs/interview/TABLE_ACTIONS.md),
[TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md), R001–R010,
R144–R145/R164–R168 in [RESEARCH](../../docs/interview/RESEARCH.md),
[audit BG3/Solasta](../../docs/interview/reference-audits/bg3-solasta.md)
e [ricerca reazioni](blueprint-reactions-research.md).
Nessun grafo locale presente: consultazione mirata, senza generarne uno fuori
dal perimetro del singolo documento.

## Esito utile all'incremento

I precedenti sostengono calibrazione visuale, geometrie esplicite, porte
interattive, percorsi facoltativi a tappe e costo mostrato prima della mossa.
Non provano un unico prodotto con esattamente la nostra combinazione.
Due punti più distanza nota e l'intera sequenza clic–avvicinamento–attacco
restano adattamenti dichiarati: il secondo conserva I-016, già acquisita,
senza richiedere una nuova approvazione ordinaria.

Movimento, visione e percorso dell'effetto devono restare distinti. Il
permesso di aprire una porta non autorizza sblocco, scasso, rivelazione di un
segreto, movimento remoto o un numero illimitato di interazioni gratuite.

## Fonti primarie riaperte e ampiezza della prova

Tutte consultate nuovamente il 23/09/2026. Quando non indicato, la pagina
non espone una build applicativa o revisione immutabile; è capacità pubblicata,
non comportamento osservato durante una partita.

| ID  | Fonte, versione/data                                                                                                                                          | Riscontro utilizzabile e limite                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S01 | [Foundry Scenes](https://foundryvtt.com/article/scenes/), guida core corrente senza build fissata                                                             | Scala in pixel, unità per cella, offset e strumento di allineamento. La guida distingue griglia quadrata e gridless e segnala conseguenze dell'allineamento sugli elementi preparati. Non descrive esattamente due punti più distanza nota.                                                                                                                                                                          |
| S02 | [Owlbear Aligning a Map](https://docs.owlbear.rodeo/docs/aligning-a-map/), core, build/data non esposte                                                       | Righe/colonne e righelli visuali; strumenti nell'importazione, nella scena e nell'editor immagine. Modalità Transform rende la griglia più visibile. Non basta a provare il gesto esatto della calibrazione proposta.                                                                                                                                                                                                |
| S03 | [Roll20 Align to Grid](https://blog.roll20.net/posts/align-to-grid-new/), beta pubblicata 19/08/2026                                                          | Procedura Anchor → Scale del campione 3×3 → Fine Tune → Done. Offre frecce e pulsanti X/Y per piccoli spostamenti. La beta è dichiarata tale; non viene presentata come versione stabile. La pagina dice di preservare gli elementi già collocati.                                                                                                                                                                   |
| S04 | [Grid Scaler](https://foundryvtt.com/packages/scaleGrid), modulo di Atom Mac, versione elencata 1.4.4, Foundry 10+ verificato 11                              | Disegno di una cella o blocco 3×3 per ricavare la scala, offset X/Y separati. Precedente di modulo storico, non core Foundry né prova di compatibilità 14. Non prova due punti arbitrari con distanza fisica.                                                                                                                                                                                                        |
| S05 | [Foundry Walls](https://foundryvtt.com/article/walls/), core, guida corrente senza build fissata                                                              | Segmenti disegnati trascinando, concatenazione e configurazione; movimento distinto da sight/light/sound. Porte aperte/chiuse/bloccate, segrete senza icona ai giocatori normali; apertura delle non bloccate subordinata al permesso di ruolo. Non documenta raggio d'uso né proprietà di un token. Il bypass del GM tramite drag descritto nella pagina non è il nostro default: TM richiede correzione esplicita. |
| S06 | [Roll20 Placing Doors & Windows](https://help.roll20.net/hc/en-us/articles/11462645998999-Placing-Doors-Windows), guida 27/10/2025, Dynamic Lighting          | Endpoint regolabili, Secret/Locked/Opened distinti; porta aperta non bloccabile e Locked impedisce l'apertura. Richiede Restrict Movement e preparazione coerente. Non prova scasso, chiavi, distanza o economia 2024. Le barriere già disegnate non vanno lasciate a chiudere il varco della porta.                                                                                                                 |
| S07 | [Smoke & Spectre](https://extensions.owlbear.rodeo/smoke), estensione di Battle-System per Owlbear, revisione completa non fissata                            | Linee di ostacolo con Fine/Annulla/Togli ultimo; passabile e blocco visione distinti. Linea convertibile in porta o finestra, apertura e serratura. Visibilità delle porte ai giocatori configurabile; le finestre possono lasciare vedere ma impedire il passaggio. Non attribuire queste capacità al core Owlbear né copiarne i default di visione condivisa.                                                      |
| S08 | [Foundry Measurement](https://foundryvtt.com/article/measurement/), testo core esplicitamente V13                                                             | Drag misura costo, righello misura distanza; tappe aggiunte/rimosse, destinazione finale confermata o annullata. Region Behaviors possono modificare il costo. Non prova il consumo delle capacità D&D né un percorso automatico ottimale.                                                                                                                                                                           |
| S09 | [Foundry Year in Review 2025](https://foundryvtt.com/article/year-in-review-2025/), sezione core V13 Token Measurement and Movement                           | Percorsi con tappe, interventi delle regioni, stop/pausa/ripresa e misura privata. Prova una capacità del framework, non il nostro default dopo Scudo o danno.                                                                                                                                                                                                                                                       |
| S10 | [Owlbear Measure](https://docs.owlbear.rodeo/docs/measure/), core, build/data non esposte                                                                     | Righello libero e misura durante drag distinti; metrica per scena, fra cui Chessboard ed Euclidean, scala personalizzabile. Non prova terreno difficile o un motore di regole automatico.                                                                                                                                                                                                                            |
| S11 | [Segmentable Ruler](https://extensions.owlbear.rodeo/segmentable-ruler), estensione di Seamus Finlayson, versione non fissata                                 | Aggiungere punti, togliere segmento, confermare, misurare privatamente e rispettare i permessi del token. La pagina segnala limiti nella misura mostrata agli altri. Non è il core Owlbear.                                                                                                                                                                                                                          |
| S12 | [Roll20 Using Roll20 to play](https://help.roll20.net/hc/en-us/articles/29258224833431-10-Using-Roll20-to-play), guida senza build fissata                    | Q aggiunge tappe durante misura o spostamento. Le parti tutorial 2014 non sono autorità normativa 2024; qui si riusa soltanto il gesto documentato.                                                                                                                                                                                                                                                                  |
| S13 | [Crucible 0.9.0](https://github.com/foundryvtt/crucible/releases/tag/release-0.9.0), release V14 Alpha 1, tag `release-0.9.0`, commit breve esposto `4a0c23b` | Sistema distinto da dnd5e: Plan Movement nelle azioni pertinenti, percorso limitato alla portata, costo aggiornato, invio impedito senza percorso. Non prova che dnd5e o ogni sistema Foundry faccia lo stesso.                                                                                                                                                                                                      |
| S14 | [BG3 Patch 2](https://baldursgate3.game/news/patch-2-now-live_89), rilascio 31/08/2023, pagina datata 03/09/2023                                              | Indicatore movimento e risorse, dettagli di superfici/bersagli con controller, preview del danno da caduta corretta. Sono componenti del feedback preventivo, non prova dell'intera sequenza proposta.                                                                                                                                                                                                               |
| S15 | [BG3 Patch 4](https://baldursgate3.game/news/patch-4-now-live_96), 02/11/2023                                                                                 | Correzione della corrispondenza fra preview ed esecuzione delle traiettorie dei proiettili. Non dimostra da sola avvicinamento automatico e clic singolo.                                                                                                                                                                                                                                                            |
| S16 | [BG3 Patch 6](https://baldursgate3.game/news/patch-6-now-live_108), 16/02/2024, versione 4.1.1.4763283                                                        | Correzione di lanci di oggetti che consumavano l'azione prima del lancio effettivo; miglioramenti ai percorsi per interagire con oggetti. Il testo parla di `throw actions`, non di una regola universale per tutti i lanci di incantesimi.                                                                                                                                                                          |

**S17 — distanza d'interazione:** [Arms Reach](https://foundryvtt.com/packages/arms-reach),
modulo di 4535992, versione elencata **14.0.0** per Foundry 14–14, verificato 14;
non il precedente package archiviato `foundryvtt-arms-reach`. Il
[README dell'autore](https://github.com/p4535992/foundryvtt-arms-reach),
revisione non fissata, documenta massimo configurato dal GM, token selezionato
o proprio, controllo della distanza token–oggetto e bypass GM. L'API
`isReachable` accetta distanza massima e scelta di misura a griglia; sono
documentate personalizzazioni per oggetto. L'autore dichiara limiti con
diagonali/porte diagonali. È un precedente per la configurabilità, non una
prova di accuratezza, né una regola SRD o un default attestato di 1,5 m.

La ricerca aggiuntiva nelle Patch 1/7/8 Larian e nelle pagine ufficiali non ha
fornito prova sufficiente per attribuire a BG3, nella build corrente, l'intero
gesto «scegli attacco, punta, clicca il nemico, raggiungi la portata e attacca».
I resoconti utenti Early Access trovati sul forum Larian non sono stati usati
come prova tecnica primaria. Questo limite della ricerca non ne dimostra
l'assenza nel prodotto e non ritira I-016.

## Regole 2024 verificate

Fonte normativa `kind:srd`, `edition:2024`, revisione 5.2.1. PDF ufficiali
riaperti; testi delle copie locali riletti alle pagine pertinenti e SHA-256
ricalcolati, coincidenti con la ricerca conservata:

- [SRD EN 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf):
  `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
- [SRD IT 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf):
  `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

Pagine della numerazione stampata, coincidenti con le pagine PDF. Copie in
`~/Workspace/Codex/d20-studio-experience-evidence`. Attribuzione CC BY 4.0 nelle
[regole conservate](../../evidence/experience-01/rules.md#attribuzione-del-materiale-srd).

| ID  | Vincolo normativo parafrasato                                                                                                                                                                                     | Pagine EN / IT          |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| N01 | Su griglia quadrata ogni passo adiacente, anche diagonale, costa una cella da 5 ft/1,5 m; terreno difficile ne costa due. Non adottare automaticamente diagonale alternata o euclidea.                            | 13 / 14                 |
| N02 | Il movimento diagonale non taglia l'angolo di una parete o altro ostacolo che riempie il proprio spazio.                                                                                                          | 13 / 14                 |
| N03 | Terreno difficile costa un'unità aggiuntiva per ogni unità percorsa; più cause nello stesso spazio non moltiplicano ulteriormente.                                                                                | 14,181 / 15,217         |
| N04 | Si sottrae il movimento effettivamente percorso; può essere diviso attorno ad azioni, bonus e reazioni.                                                                                                           | 14 / 15                 |
| N05 | Copertura totale impedisce il bersaglio diretto; un incantesimo richiede percorso libero. Mezza/tre quarti di copertura sono gradi distinti.                                                                      | 15,106,179 / 16,120,206 |
| N06 | Un punto dell'area è escluso quando tutte le linee dall'origine sono impedite da copertura totale; origine invisibile oltre un ostacolo si forma sul lato vicino.                                                 | 177 / 203               |
| N07 | Non vedere un bersaglio non vieta universalmente attaccarlo: l'attacco ha svantaggio; resta distinta la capacità che esige espressamente visibilità.                                                              | 14 / 16                 |
| N08 | Un oggetto può essere interagito senza costo aggiuntivo durante movimento/azione; il secondo richiede Utilizzo. Ostacoli inconsueti possono richiedere azione secondo il GM. Esempio: aprire una porta avanzando. | 13–14 / 15              |

I raggi numerici delle interazioni con porte non sono fissati da questi passi.
Le regole del videogioco e i parametri geometrici dei VTT non sostituiscono
queste fonti. Per opportunità, Scudo e ripresa conservare la ricerca precedente.

## Raccomandazioni implementabili e adattamenti dichiarati

1. **Calibrazione esplicita.** Due punti sulla stessa riga/colonna della griglia
   dell'immagine, distanza o numero di celle dichiarato, risultato in preview,
   poi applicazione alla bozza e Salva preparazione. È un adattamento di S01–S04.
   Scala, origine della griglia e metrica sono dati distinti. Per il caso piano
   non ruotato, `pixelPerCella = distanzaPixel / numeroCelle`; punti coincidenti,
   dati non finiti o valori non positivi sono invalidi. Non interpretare una
   diagonale a quadretti come distanza euclidea. Rotazione, deformazione e
   prospettiva richiedono strumenti ulteriori, non deduzioni silenziose.
2. **Nessuna geometria dall'illustrazione.** Disegnare segmenti o zone e
   modificarli esplicitamente, con annullamento della bozza. Calibrare non
   spende movimento, non ricolloca di nascosto pedine e non resetta risorse.
   Un'immagine di pietre non crea terreno difficile e una porta dipinta non
   diventa un oggetto interattivo. R145/S01/S05/S07 sono i precedenti.
3. **Tre domande distinte.** Il segmento impedisce movimento, visione o
   percorso dell'effetto/copertura? Preset dichiarati possono inizializzare
   questi dati, ma non basta un solo booleano. Un ostacolo trasparente solido
   può lasciare vedere e bloccare un effetto; un oscuramento può impedire
   vista senza essere copertura. Non dedurre bonus di copertura parziale da
   una semplice intersezione centro–centro. Quello è un modello geometrico
   dimostrativo da dichiarare, non una regola completa sulle taglie.
4. **Porte e permessi.** Tipo, stato, segretezza e possibilità di uso da parte
   dei giocatori sono separati. `playerOperable` è un possibile adattamento
   del permesso di ruolo S05 e della visibilità configurata S07. S17 fornisce
   il precedente aggiuntivo per `interactionRangeMeters` configurabile. Il comando
   ordinario deve riferirsi a una porta conosciuta e alla creatura controllata
   pertinente. Distanza, LOS e disponibilità dell'interazione vanno validate
   dalla policy esplicita, senza attribuire un raggio inventato a Foundry o
   allo SRD. Una base di **1,5 m**, configurata nella scena, è un adattamento
   esplicito per il caso dimostrativo, non una portata universale della creatura
   o del modulo. Mostrare distanza e limite; fuori limite proporre Avvicinati
   senza aprire né muovere finché non viene impartito quel comando. Un muro
   interposto non diventa manipolabile perché la sola distanza è breve.
   In combattimento conservare turno e disponibilità di N08: niente aperture
   fisiche fuori turno o gratuite illimitate. Il controllo ambientale del DM
   è una correzione distinta, con autore/motivo, e non simula una mano della
   creatura che raggiunge a distanza. Visibilità dell'icona e capacità fisica
   d'interagire restano verifiche differenti.
5. **Transizione della porta.** Aprire disabilita soltanto le restrizioni
   configurate della porta; chiudere le ripristina. Una finestra/cancellata
   trasparente non diventa opaca per essere chiusa. Locked non autorizza
   auto-unlock. Segreta non equivale a chiusa: nomi, icone e motivi di errore
   restano filtrati per destinatario, anche nel registro. Non confondere
   rivelazione manuale, visuale corrente e accesso alla scena.
6. **Percorso e costo.** Tappe facoltative e modificabili, Togli ultima,
   Esegui/Annulla secondo TM/S08–S12. Misura geometrica e costo normativo sono
   distinguibili; zone difficili sovrapposte restano 2×. La fermata per budget
   è già visibile prima della conferma. Ostacolo ignoto e costo incompleto
   non diventano un percorso certo né rivelano una stanza attraverso una
   deviazione suggerita. Un percorso manuale non viene ottimizzato di nascosto.
7. **Avvicinamento più attacco.** Conservare I-016: il clic sul bersaglio
   singolo conferma la sequenza mostrata, inclusi punto d'arrivo, costo e
   rischi conoscibili. Nessun secondo consenso ordinario. Se la portata non
   può essere raggiunta, niente ripiego silenzioso in solo movimento. Non
   attivare Scatto né cambiare arma, bersaglio o tappe automaticamente.
   L'avvicinamento usa la stessa catena di movimento, opportunità e risorse.
   L'attacco e l'eventuale tiro fisico iniziano all'arrivo valido; abbandonare
   prima conserva movimento/danni avvenuti ma non inventa un attacco effettuato.
   È raccordo del contratto, sostenuto per componenti da S08/S09/S13–S16.
8. **Rivalidazione e interruzioni.** Ogni fase controlla stato e autorità
   correnti. Porta chiusa durante la pausa, bersaglio spostato o morte esplicita
   possono impedire il seguito: non teletrasportare, tirare prematuramente o
   ripartire due volte al reload. Scudo che evita il colpo conserva la ripresa
   già autorizzata; danno richiede Riprendi/Cambia come I-023/I-024. Se la scena
   cambia, dati non più validi producono una richiesta leggibile e priva di
   dettagli segreti. Gli esiti acquisiti restano nel registro delle correzioni.

## Casi da verificare nell'implementazione successiva

Questa è una matrice di esiti attesi, non test già eseguiti.

| Caso                                                    | Esito atteso                                                                                                                                  |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Due punti a 150 px per 3 celle; Annulla / Salva         | Preview 50 px/cella; Annulla conserva scala precedente, Salva conserva pedine/risorse e rende coerenti le misure.                             |
| Stesso percorso in area libera e difficile sovrapposta  | Solo i tratti difficili costano 2×; le sovrapposizioni non diventano 4×.                                                                      |
| Passo diagonale su griglia; angolo occupato             | Costo di una cella nel caso libero; nessun taglio dell'ostacolo pieno.                                                                        |
| Parete, barriera trasparente, oscuramento               | Movimento, vista ed effetto seguono i dati distinti, senza penalità dedotte dai colori o dal nome del preset.                                 |
| Porta visibile apribile / bloccata / segreta            | Solo l'operazione autorizzata cambia stato; niente sblocco implicito o informazione sul segreto al giocatore.                                 |
| Secondo oggetto nello stesso turno                      | Economia dell'interazione riconosciuta, oppure caso esplicitamente pendente per il DM; nessuna dichiarazione falsa di costo zero.             |
| Waypoint dentro/fuori zona difficile e attraverso porta | Costo cumulativo corretto, percorso conservato; una porta chiusa blocca il segmento, non l'intera scena indipendentemente dalla posizione.    |
| Attacco con avvicinamento fisico, OA e abbandono        | Posizione/costo raggiunti conservati; nessun dado d'attacco richiesto prima dell'arrivo e nessuna azione spesa per il tentativo non iniziato. |
| Attacco con avvicinamento, Scudo/mancato, reload        | Riprende la stessa sequenza valida senza secondo consenso, doppio movimento o doppio tiro.                                                    |
| Ostacolo/porta privata nella preview                    | Nessuna icona, nome o deviazione dettagliata rivela informazioni non autorizzate.                                                             |

## Limiti della consegna

La ricerca non approva una metrica universale per griglie diverse, collisioni
di tutte le taglie, volo, piani sovrapposti, scasso o tutte le coperture. Sono
aree da completare nel medesimo prodotto, non tagli allo scopo. Nessuna misura
di prestazioni, usabilità al tavolo o sicurezza del multiplayer discende da
questi testi. La successiva review del dominio e del raccordo UI è un incarico
distinto, sul candidato effettivamente scritto.
