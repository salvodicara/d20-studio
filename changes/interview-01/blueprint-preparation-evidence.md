# Blueprint — incremento Preparazione / scene

23/09/2026. Worker `blueprint_preparation`, modello e sforzo ereditati senza
override. D-013/I-218 autorizza questo prototipo locale. L'incremento è una
parte della candidata integrata, non il completamento di Preparazione o di
F-012/F-013/F-018/F-036/F-038.

## Perimetro e piano eseguito

Ownership limitata a `design/blueprint/preparation.mjs`, `preparation.css`,
`tests/preparation.test.mjs` e questa nota. Shell, stato e Tavolo appartengono
al coordinatore; scheda/personaggi a un altro worker. Nessuna modifica ai
loro file, commit, installazione o dipendenza nuova.

1. Leggere API condivisa, brief, NAV-06, pagina Preparazione e ricerca scene.
2. Verificare prima con test gli invarianti di salvataggio, permessi, copia,
   conflitti, rivelazione e attivazione; implementare le mutazioni locali.
3. Costruire raccolta/editor con bozza, input e anteprima reali, quindi
   collegare salvataggio, annullamento e azioni contestuali.
4. Integrare geometria comune e guardia di navigazione con il coordinatore;
   verificare codice e suite, lasciando prova browser integrata al coordinatore.

## Cosa è effettivamente rappresentato

| Percorso                | Comandi, dati e risultato                                                                                                                                | Vincoli osservabili                                                                                                                                                                                                                |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Campagna → Preparazione | Ricerca scene per nome, elenco con anteprima, stato riservata/condivisa/attiva, Modifica e Apri per me.                                                  | DM soltanto; la vista giocatore non rende nomi, note o immagini private neppure con ID noto.                                                                                                                                       |
| Nuova scena             | Nome e partenza vuota, cortile o accampamento originali; editor prima del salvataggio.                                                                   | La bozza non viene inserita nello stato comune, rivelata o attivata finché non si salva. I due preset sono schemi geometrici originali, non asset di concorrenti.                                                                  |
| Editor                  | Nome, descrizione pubblica, note DM, base, dimensioni pixel, pixel/cella, metri/cella, offset X/Y, griglia visibile e aggancio indipendenti.             | Anteprima si aggiorna durante la modifica, senza consumi o riposizionamenti di pedine. Input invalidi evidenziati e messaggio di recupero.                                                                                         |
| Caricamento immagine    | PNG/JPG/WebP locali fino a 1 MB; controllo peso/tipo, decodifica, nome/dimensioni rilevate, rimozione e adozione delle dimensioni quando entro i limiti. | Errore conserva immagine e bozza precedenti. Salva e nuovo upload indisponibili durante la lettura. Limite dimostrativo esplicito, non limite definitivo del prodotto. Nessun upload remoto.                                       |
| Anteprima               | Vista DM oppure contenuto da rivelare al gruppo.                                                                                                         | La seconda mostra nome, mappa e descrizione pubblica senza note DM o pedine. Non simula sensi/visione geometrica.                                                                                                                  |
| Salva / Annulla         | Salvataggio locale attraverso store comune; bozza scartata soltanto dopo conferma se modificata. ESC/Annulla nella conferma mantiene la bozza.           | Riconvalida autorità e versione dei campi editati; preserva posizioni correnti, attori e consumi. Dimensioni che lasciano pedine oltre i limiti vengono rifiutate. Salva su scena attiva richiede conferma dell'effetto al Tavolo. |
| Duplica / Elimina       | Copia indipendente di mappa, griglia e note, senza pedine o accessi; nome della copia modificabile. Eliminazione con nome di conferma.                   | Scena attiva non eliminabile prima di attivarne un'altra. Personaggi non eliminati. Correzione tramite cronologia comune, senza promettere undo distribuito.                                                                       |
| Rivela contenuto        | Solo DM / tutto il gruppo, conferma esplicita.                                                                                                           | Cambia `revealed`/`revealedTo`, non `activeSceneId`; note DM e pedine escluse dal materiale consultabile. La revoca non cancella ciò che è già stato letto.                                                                        |
| Attiva al Tavolo        | Scena di destinazione e partecipanti espliciti, conferma; ritorno al Tavolo sulla stessa scena salvata.                                                  | Primo incremento: tutto il gruppo. Nessun trasferimento di pedine, iniziativa automatica, riposo o ripristino di risorse. Sottogruppi ancora da costruire.                                                                         |

EN/IT per tutti i testi dell'interfaccia; dati dell'autore conservati nella
lingua scelta dall'autore. HTML dinamico escapato. Background ammesso soltanto
come immagine raster locale verificabile, non URL arbitrario o SVG caricato.

## API e integrazione

- Export richiesti: `renderPreparation(ctx)`, `bindPreparation(root, ctx)`.
- `renderSceneBase(scene, ctx)` è condiviso col Tavolo, evitando che il
  medesimo preset cambi disegno passando dall'editor al gioco.
- `hasPreparationDraft()`, `confirmPreparationNavigation(ctx, next)` e
  `resetPreparationDraft()` permettono alla shell di proteggere l'uscita da
  una bozza e pulire la simulazione nel cambio ruolo/reset.
- `ctx.role/state/view` sono getter correnti: ogni mutazione rivalida il ruolo
  anche dopo l'apertura di una finestra. La shell chiude il dialog al cambio
  ruolo. Questa difesa locale non dimostra autorizzazione server.
- Salvataggio negato offline dalla shell conserva la bozza. Se lo storage
  browser fallisce, l'app conserva l'applicazione in memoria e segnala che
  non è salvata nel browser: non si ripete la mutazione creando duplicati.
- I campi opzionali sono `publicDescription`, `template`, `gridVisible`,
  `gridSnap`, `gridOffsetX/Y`, `imageName/Width/Height`, `revealedTo`.
  Il coordinatore raccorda aggancio, offset e materiali consultabili.

## Fonti e sintesi

Ricerca primaria già verificata il 23/09/2026 in
[scene-editor-research](scene-editor-research.md), senza nuova attribuzione
di prove runtime ai prodotti. Dati/versioni/accesso e limiti restano lì.

| Scelta                                                    | Evidenza riutilizzata                                                                                                     | Adattamento e limite                                                                                                                                              |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Raccolta → editor, salva/apri/rivela/attiva distinti      | [NAV-06](../../docs/interview/NAVIGATION.md#nav-06--preparazione-e-scena-corrente); S1 Foundry Scenes, S2 Owlbear Scenes. | Conferma destinatario esplicita; supporto sottogruppi rimane da costruire. Non si adotta implicitamente Activate → tutti.                                         |
| Vuota/preset/file proprio                                 | SC-R01/R02 e decisioni I-096/I-097.                                                                                       | Preset originali semplici. Il catalogo e l'editor geometrico completo restano scoperti.                                                                           |
| Scala pixel, misura di gioco, offset e linee indipendenti | SC-R03/R05; S1 Foundry Scenes, S3 Owlbear Aligning a Map.                                                                 | Calibrazione numerica reale nell'anteprima. Non dichiarata calibratura universale da metadati. Il percorso visivo ancoraggio/rifinitura SC-R04 è ancora mancante. |
| Copia separata e consumi preservati                       | SC-R10/R11; S3 Owlbear, S6 Foundry Compendium Packs.                                                                      | Copia solo mappa/note/griglia dichiarata: non ripristino di una partita iniziale o copia universale di avventura/attori.                                          |
| Anteprima immagine senza muri inventati                   | SC-R09 e pagina [Preparazione](../../docs/interview/pages/preparation.md).                                                | Nessuna estrazione automatica di geometrie, luci, collisioni o regole da un raster.                                                                               |

## Verifica eseguita e prova browser da raccordare

- Nove test di invarianti scritti prima delle implementazioni e osservati
  fallire; ora passano. Due controlli successivi di rendering verificano
  mancata esposizione dei segreti al giocatore ed escaping dei contenuti.
- `node --test design/blueprint/tests/preparation.test.mjs`: **11/11**.
- Suite integrata dopo gli ultimi controlli e raccordo snapping: **31/31**;
  il coordinatore ripete la suite finale dopo le eventuali integrazioni concorrenti.
- `node --check design/blueprint/preparation.mjs`: passa.
- Prettier applicato ai file posseduti. Nessuna prova runtime concorrente sul
  browser del coordinatore, per non alterare i suoi dati durante il test.

Prove browser pertinenti: creare/salvare/ricaricare una scena; modificare
campi e annullare/ESC; import valido, formato/peso non valido e file raster
corrotto; errore dimensioni; anteprima pubblica senza nota DM; copia privata;
rivela senza attivazione; attiva senza risorse azzerate; delete nome errato/
corretto/attiva; uscita dalla bozza via menu globale; ruolo cambiato prima
di una conferma; salvataggio offline; interfaccia EN/IT e laptop/telefono.

## Lacune conservate

Editor incontri/PNG/tesori/trappole/avventure, Biblioteca asset e riuso tra
campagne, strumenti geometrici/muri/porte/luci, piano/quote, selezione e
trasformazione di elementi, formati strutturati, allineamento visuale,
destinatari individuali/sottogruppi, aggiornamento asset/scena con confronto,
cronologia revisioni e conflitti multiutente, recupero automatico della bozza
dopo chiusura, servizi e persistenza reali. La superficie vuota non dimostra
ancora tutta l'esperienza senza mappa. Nessuna di queste capacità conta come
coperta perché collegata dai documenti o presente in un menu futuro.
