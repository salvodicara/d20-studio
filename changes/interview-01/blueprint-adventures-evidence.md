# B49 — Avventure e pacchetti riutilizzabili: prove

24/09/2026 (cartella prove datata 2026-09-25). Area `adventures` (scheda B49 in
`docs/interview/CAPABILITY_CENSUS.md`, capacità BI-36, BI-37, BI-38, BI-39, BI-40, BI-41,
BI-44, CA-75). Dati sintetici originali della campagna «Le lanterne di Bruma» (scena
`old-watch`, Sentinella ed Esploratore, handout «Cripta sotto l’osservatorio» e «Avviso della
gilda», tabelle «Incontri nella palude» → «Consistenza della pattuglia», incontro «Chi ha
riacceso la lanterna») più un pacchetto d’esempio ricevuto già pronto, «Il faro sommerso».
**Nessun file condiviso modificato:** l’area entra solo dal registro (`extensions.mjs` la
elencava già) e scrive negli spazi delle aree vicine con le loro stesse strutture.

## File

| File                                                          | Contenuto                                                                                                                                                                                                                            |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `design/blueprint/adventures.mjs`                             | dominio (pacchetto, dipendenze, versioni e differenze, import/aggiornamento con ricollegamento, contenuti richiesti, nuova campagna, export HTML, Undo delle campagne parcheggiate) e interfaccia (Biblioteca, pagina, Preparazione) |
| `design/blueprint/adventures.css`                             | stili con prefisso `adv-`, caricati da `registerStyles`                                                                                                                                                                              |
| `design/blueprint/tests/adventures.test.mjs`                  | 11 test: store vero, registro vero con B13, B15, B25, B19 e B49; gestori della pagina tramite il registro                                                                                                                            |
| `changes/interview-01/blueprint-checks/adventures-journey.js` | percorso nel browser reale (IT 1440 DM e giocatore, EN 390 al tocco)                                                                                                                                                                 |

Punti del registro: `library-section` «Avventure» (solo DM), `route` `adventures` (solo DM,
dettaglio e sottopagine `?tab=new|import|rebuild|campaign|print`), `preparation-section`
«Avventure» (solo DM), `notifications` (aggiornamento disponibile), `search`, `draft-guard`
(scelte non salvate dell’editor); eventi `role-changed` e `reset`. Sezione di stato `adventures`
(`undo: "snapshot"`) con `afterUndo` per le campagne parcheggiate (vedi «Annulla»).

Moduli esistenti usati solo tramite funzioni pure esportate: `campaign-members.mjs` (B13:
`createCampaign`, `canManage`, `listCampaigns`, `metaOf`), `homebrew.mjs` (bozza di import
della Biblioteca con revisione e `reviewKey`, `enableHomebrewRevision`, `exportHomebrewBundle`),
`handouts-art.mjs`, `srd-sample.mjs`, `character-access.mjs`.

## Dove si trova (≤ 2–3 clic)

- **Biblioteca › Avventure** (`#library?tab=adventures`): elenco a schede, «Crea avventura»;
  una scheda apre il dettaglio (`#adventures?id=…`) con «Importa in una campagna», «Crea
  campagna con l’avventura», «Nuova versione», «Esporta HTML», «Elimina».
- **Campagna › Preparazione › Avventure** (`#preparation?tab=adventures`): avventure usate o
  create da questa campagna, versione, voci modificate qui, «Rivedi aggiornamento».
- **Campanella** (B24): «Aggiornamento disponibile: La cripta v2» porta al dettaglio.
- **Ricerca** (B23): le avventure per titolo.
- Il giocatore non vede la sezione né la pagina (ruolo DM); riceve solo ciò che il DM mostra
  (introduzione in Materiali, B15).

## Capacità → percorso → prova

| Capacità (census)                                         | Percorso e comandi                                                                                                                                                                                                                                                                                 | Risultato verificato                                                                                                                                                                                                                                                                                                                                                                                      | Regola / fonte                                                                                                                                                                                                                               | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                             | Prova                                                                                                       |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| BI-36 avventura da scene, PNG, handout, tabelle           | Biblioteca › Avventure › Crea avventura: titolo «La cripta», scena iniziale, introduzione, spunte su cortile, due handout (una con Spazio da tastiera), «Incontri nella palude», incontro → Crea                                                                                                   | anteprima dal vivo: «1 scena · 2 PNG · 2 materiali · 2 tabelle · 1 incontro»; «Aggiunte perché richieste»: Sentinella ed Esploratore (pedine), Consistenza della pattuglia (sottotabella); dipendenze esterne SRD e immagini; «Esclusi»: pedine di Livia, Doran, Mira; dettaglio con 8 voci; stato iniziale (scena nascosta, PF pieni, materiali mai mostrati); reload conserva                           | F-038 (I-136): materiale iniziale distinto dai progressi; privato/condiviso: note «Solo io» e personaggi dei giocatori mai nel pacchetto; mostri SRD 5.2.1 citati con pagine EN/IT (Sacerdote EN 316 / IT 369–370, Cultista EN 278 / IT 305) | Foundry Create Adventure (FVT-177); Module Maker con dipendenze (FVT-178); export di modulo FG con pedine referenziate incluse (R20-125); inclusione delle dipendenze di Scene Packer (FVT-179)                                                             | journey (1); test «(1) La cripta…»; `01-…png`, `02-…png`                                                    |
| BI-37 import per tipo, sovrascrittura, azioni facoltative | dettaglio › Importa: destinazione «Gruppo del giovedì» (creata con B13), tolta la spunta «Tabelle» → Importa; poi «Importa di nuovo» con tutti i tipi                                                                                                                                              | 6 voci nuove, tabelle non scritte; la campagna d’origine è disattivata come destinazione; al secondo import l’avviso «6 voci sono già in questa campagna: se non le hai modificate vengono sovrascritte…», nessun duplicato; «Attiva e mostra la scena iniziale» e «Mostra ai giocatori l’introduzione» facoltative (attive al primo import)                                                              | F-038: ogni gruppo gioca la propria copia                                                                                                                                                                                                    | dialogo d’import Foundry per tipo con avviso di sovrascrittura (FVT-177); azioni dnd5e «activate start scene», «display intro journal» (FVT-005)                                                                                                            | journey (2); test «(2) Import…»; `05-…png`, `06-…png`                                                       |
| BI-39 riferimenti ricollegati                             | anteprima «Collegamenti ricostruiti» prima dell’import                                                                                                                                                                                                                                             | «pedine → PNG: 2», spilli → materiali, materiali → scene, sottotabelle; nella campagna di destinazione le pedine puntano ai PNG copiati con `campaignIds` della campagna, «Swamp › pattuglia» punta alla copia di «Consistenza»; nel pacchetto «Il faro» lo spillo della lente punta alla sezione del diario importato; collegamenti mancanti elencati come «non ricollegati»                             | —                                                                                                                                                                                                                                            | Scene Packer: pedine → attori, spilli → diari, link interni; rapporto dei riferimenti rotti (FVT-179)                                                                                                                                                       | journey (2); test «(2)…», «(4)…»                                                                            |
| BI-40 contenuto riusabile vs contenuto della partita      | Biblioteca (pacchetto) e Preparazione › Avventure (copia della campagna)                                                                                                                                                                                                                           | il pacchetto resta invariato quando la campagna sposta pedine o rinomina la scena; Preparazione dichiara «copie di questa campagna… tutto il resto è solo di questa partita» e conta le voci modificate qui                                                                                                                                                                                               | F-038 confini: nessun mondo sincronizzato fra gruppi                                                                                                                                                                                         | Alchemy universe vs in-game (VTL-079, VTL-204)                                                                                                                                                                                                              | journey (3); test «(2)…» (progresso separato); `07b-…png`                                                   |
| BI-38 nuova versione e aggiornamento rispettoso           | Preparazione della campagna d’origine: note DM del cortile modificate → dettaglio › Nuova versione: tolto l’incontro, aggiunta «Voci alla Lanterna», note → Pubblica; poi avviata «Gruppo del giovedì» (B13), scena copiata rinominata, Preparazione › Avventure › Rivedi aggiornamento → Aggiorna | differenze Rebuild: «+ Voci alla Lanterna», «− Chi ha riacceso la lanterna», «~ Il cortile… · descrizione»; note della v2 mostrate nella campagna; la scena rinominata «non verrà sovrascritta», copia «Il cortile dell’osservatorio (v2)» aggiunta accanto; voci non toccate sovrascritte; nuova tabella creata; l’incontro tolto resta; Undo e riapplicazione; reload conserva la v2; origine invariata | F-038: nessun azzeramento automatico di una partita; aggiornamento solo accettato dalla campagna                                                                                                                                             | Rebuild Adventure verde/rosso (FVT-177); patch Roll20 con note, sovrascrittura dei soli elementi cambiati, consiglio di duplicare le voci modificate (qui proposto come copia) e di non aggiornare durante un combattimento (qui blocco) (R20-186, SVC-132) | journey (3); test «(3)…», «Blocked imports…»; `07-…png`, `07b-…png`, `08-…png`                              |
| CA-75 homebrew mancante all’ingresso                      | «Il faro sommerso» › Importa in «Le lanterne di Bruma»                                                                                                                                                                                                                                             | «Lanterna del faro · Manca nella tua Biblioteca», Importa disattivato; «Installa dal pacchetto» (passa dalla revisione d’import della Biblioteca) → «Non abilitato in questa campagna» → «Abilita nella campagna» → «Pronto», Importa sbloccato; il PNG porta la lanterna homebrew rev. 2                                                                                                                 | homebrew con revisione esatta e abilitazione per campagna (Inc. 6, `homebrew.mjs`)                                                                                                                                                           | finestra di verifica delle mod di BG3 con un’azione per voce (CRP-171)                                                                                                                                                                                      | journey (4); test «(4) Missing homebrew…»; `03-…png`                                                        |
| BI-41 nuova campagna da avventura                         | dettaglio › Crea campagna con l’avventura: nome «La cripta · one-shot», scena iniziale e introduzione (facoltative) → Crea campagna                                                                                                                                                                | pagina della nuova campagna (B13) con «Avvia la campagna»; scena iniziale attiva e mostrata, scena vuota di partenza tolta; introduzione mostrata a chi entrerà; 3 tabelle e 2 PNG; senza le opzioni resta la scena vuota e nessuna introduzione (test); homebrew del pacchetto abilitato                                                                                                                 | creazione di campagna B13 (D&D 2024, SRD 5.2.1 fissati)                                                                                                                                                                                      | «Create game with module» di Roll20 (R20-187); quickstart d’avventura Foundry (FVT-004)                                                                                                                                                                     | journey (5); test «(5) New campaign…»; `09-…png`, `10-…png`                                                 |
| BI-44 esportazione in HTML stampabile                     | dettaglio › Esporta HTML: anteprima, «Includi note, statistiche e incontri del DM», Stampa, Scarica HTML                                                                                                                                                                                           | documento unico con indice, scene, PNG, materiali, tabelle con intervalli, incontri; senza note del DM è l’«edizione per i giocatori» (niente PNG, incontri, testi DM, tabelle riservate); Stampa chiama la stampa del documento; file «la-cripta-v2.html»; attribuzione CC-BY-4.0 dell’SRD quando il pacchetto cita contenuti SRD; titoli ostili escapati                                                | SRD 5.2.1 CC-BY-4.0: dichiarazione di attribuzione di pagina 1 (`SRD_ATTRIBUTION`)                                                                                                                                                           | export di libro in HTML di Shard (VTL-199)                                                                                                                                                                                                                  | journey (6); test «(6) Printable HTML…»; `11-…png`                                                          |
| Ruoli, Undo, offline, bozza, EN/IT, telefono, persistenza | giocatore; «Annulla» nella pagina; Preferenze › senza rete; uscita dall’editor; EN 390 al tocco; reload                                                                                                                                                                                            | il giocatore non ha sezione né pagina e legge l’introduzione senza il testo DM; «Annulla» toglie solo l’import (installazione e abilitazione restano), anche su una campagna parcheggiata; senza rete l’import è rifiutato con il motivo e le scelte restano; l’editor chiede «Scartare le scelte?»; EN 390: Install → Enable → Import, controlli ≥ 40 px, nessun overflow; reload conserva tutto         | privato/condiviso del contratto; scritture condivise bloccate offline; Undo del core                                                                                                                                                         | —                                                                                                                                                                                                                                                           | journey (4), (2), (1), EN phone; test «Undo of an import…», «Persistence…», «Pages…»; `04`, `12`, `13-…png` |

## Scelte di dominio (in breve)

- **Pacchetto:** ogni versione è un’istantanea immutabile per voce (`scene|npc|material|table|encounter`
  con chiave `tipo:id`), con `dataHash`, dipendenze esterne, esclusi, homebrew richiesto e il
  bundle della Biblioteca quando esportabile. Spilli e scena senza mappa viaggiano con la scena;
  immagini caricate con il materiale; blocchi personalizzati con l’incontro. I campi facoltativi
  della scena ricevono i valori predefiniti del core, così salvare una scena senza cambiarla non
  diventa una differenza.
- **Import:** una registrazione per campagna e avventura (`imports[campagna][avventura]`) con id
  di destinazione e impronta locale per voce. «Modificata nella campagna» = cambiati valori o
  progressi di gioco (pedine spostate, PF, handout mostrato): mai sovrascritta. Le altre sono
  sovrascritte; una voce eliminata viene ripristinata (Roll20: riaggiungere ripristina le parti
  cancellate). Le campagne non in corso sono scritte nel loro record parcheggiato di B13.
- **Annulla:** import, aggiornamenti, pubblicazione, installazione, abilitazione ed eliminazione
  sono annullabili. Il record delle campagne parcheggiate vive nella sezione B13 che l’Undo
  conserva: l’area tiene in memoria di sessione (come la pila di Undo) lo stato precedente e il
  suo `afterUndo` lo rimette. La creazione di una campagna non è annullabile (amministrazione
  B13) e riapplica PNG e record agli snapshot ancora in pila (`rebaseHistory`).

## Comandi ed esiti

```sh
node --test design/blueprint/tests/adventures.test.mjs
# 11/11 pass
node --test design/blueprint/tests/*.test.mjs
# 1540/1540 pass (24/09, con le aree degli altri costruttori presenti in quel momento)
node /Users/salvatoredicara/Workspace/d20-studio/node_modules/prettier/bin/prettier.cjs --write \
  design/blueprint/adventures.mjs design/blueprint/adventures.css \
  design/blueprint/tests/adventures.test.mjs changes/interview-01/blueprint-checks/adventures-journey.js
# dal cwd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B49/
playwright-cli -s=d20-b49 open http://127.0.0.1:8879/
playwright-cli -s=d20-b49 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/adventures-journey.js
# tutti i passi (1)(4)(2)(3)(5)(6) + EN phone: superati; «Cosa è pronto» mostra l’area attiva senza avvisi
```

Il percorso azzera lo stato sintetico del browser nominato, lavora in un contesto 1440×900
nuovo (download abilitati) e in un contesto telefono 390×844 con tocco; fallisce su qualsiasi
`pageerror`. Dopo la formattazione è stato tolto il `;` finale aggiunto da Prettier (la CLI
avvolge il file come espressione).

Schermate (1440×900 salvo indicazione), in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B49/`:
`01-create-la-cripta-it-1440.png`, `02-detail-la-cripta-v1-it-1440.png`,
`03-faro-requirements-it-1440.png`, `04-player-materials-it-1440.png`,
`05-import-by-type-it-1440.png`, `06-reimport-overwrite-warning-it-1440.png`,
`07-rebuild-diff-it-1440.png`, `07b-prep-adventures-update-it-1440.png`,
`08-update-review-it-1440.png`, `09-new-campaign-it-1440.png`,
`10-new-campaign-created-it-1440.png`, `11-export-html-it-1440.png`,
`12-phone-en-import-390.png`, `13-phone-en-detail-390.png` (le ultime due a pagina intera).
Controllate a vista: rientri delle liste, etichette di tipo in linea e plurali corretti dopo
un primo giro di correzioni.

## Limiti onesti

- **Tipi:** solo i cinque della scheda (scene con spilli e scena senza mappa, PNG, materiali,
  tabelle, incontri). Missioni, fazioni, voci dell’archivio/mondo, diario, bottino, mercanti,
  mazzi e modelli di testo non viaggiano; un collegamento di uno spillo a una voce dell’archivio
  è tolto e segnalato. Personaggi dei giocatori e note «Solo io» sono esclusi per principio.
- **Campagna d’origine:** non è una destinazione (Foundry sovrascriverebbe gli originali): lì si
  usa «Nuova versione». Un pacchetto ricevuto già pronto non si ricostruisce.
- **Rilevamento delle modifiche locali:** su un sottoinsieme esplicito di campi per tipo; campi
  aggiunti da altre aree fuori da quel sottoinsieme non contano come modifica e vengono
  sovrascritti. La sovrascrittura di una voce non modificata rigenera gli id di pedine e spilli.
- **Aggiornamento:** si applica subito con anteprima e Annulla; la coda annullabile di Roll20
  non è riprodotta. Durante un combattimento nella campagna di destinazione import e
  aggiornamento sono bloccati (il consiglio Roll20 diventa un blocco).
- **Annulla su campagne parcheggiate:** usa una copia in memoria della sessione, come la pila di
  Undo del core: dopo un reload non c’è Undo (come nel resto dell’app). La creazione di una
  campagna non si annulla: si archivia o elimina da Campagne (B13).
- **Contenuti richiesti (CA-75):** rilevati solo dalle righe d’inventario homebrew dei PNG; la
  verifica avviene all’import e alla creazione della campagna, non quando un giocatore entra in
  una campagna (ingresso dei membri: B13/B20). Nessuna revisione più vecchia viene proposta
  («downgrade» di BG3 non necessario qui).
- **BI-44:** solo esportazione HTML; l’import di un DOCX non è costruito. Le etichette seguono la
  lingua dell’interfaccia, i contenuti restano come scritti (italiano nei dati d’esempio).
- **BI-45** (pacchetti di sole meccaniche): non costruito, decisione sui contenuti ancora aperta;
  qui si mostra solo la fonte per voce (SRD con pagine EN/IT, homebrew, immagini).
- **Media:** le immagini della Biblioteca personale sono citate, non incluse (come Foundry); le
  immagini del catalogo dell’app sono disponibili ovunque; le immagini caricate nei materiali
  viaggiano col materiale. Nessun file di pacchetto JSON (il formato proprio esiste solo per
  l’homebrew, BI-42).
- **Percorso nel browser:** Stampa è verificata sostituendo `print` del documento in anteprima
  (Chromium senza interfaccia), non con la finestra del sistema. In un giro intermedio la
  striscia ha mostrato per un momento «Aree aggiuntive: 1 con avvisi» mentre altri costruttori
  modificavano i propri file; il giro successivo non l’ha riprodotto e il percorso ora
  controlla che B49 risulti attiva senza avvisi.
- Dimostrazione locale a due identità: nessun backend, nessuna sincronizzazione fra browser,
  permessi applicati solo in questo prototipo.

## Review and fixes

24/09/2026, revisore-correttore indipendente (non ha costruito B49). Sessione playwright-cli
`d20-b49-rf`, prove in `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B49-rf/`
(schermate del percorso `01…13-*.png` rigenerate lì, più le sonde `p4-*`, `p5-*`, `p9-*`).
Controllati: scheda B49 del census (capacità e accettazione 1–6), pattern citati
(FVT-177, FVT-005, FVT-179, R20-186/SVC-132, R20-187, CRP-171, VTL-079, VTL-199), coerenza con
Tavolo/Materiali/Tabelle/Incontri/Campagne, ruoli, offline, Undo, EN/IT, tastiera, telefono 390,
collocazione B61, file condivisi.

### Difetti trovati e correzioni (prima il test, poi il codice)

| #   | Gravità | Riproduzione                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2      | DM › `#adventures?id=adv-faro&tab=import` appena aperta: si toglie la spunta «Mostra ai giocatori l’introduzione» → la pagina si ridisegna, la spunta torna attiva e il fuoco finisce sul `body`. Il primo cambiamento era scambiato per un cambio di campagna (moduli in memoria ancora vuoti), che riapplica i valori predefiniti: il DM poteva mostrare l’introduzione ai giocatori contro la propria scelta. Anche il vero cambio di campagna perdeva il fuoco. | **Corretto.** Il modulo dichiara la campagna mostrata (`data-adv-shown-campaign`); la funzione pura `importFormChange` ridisegna con i valori predefiniti solo quando cambia davvero la destinazione e altrimenti conserva ogni scelta; dopo il cambio di campagna il fuoco torna sulla selezione. Test «Review: a change on the import form…»; percorso: Spazio sulla spunta al primo cambiamento (4) e cambio di destinazione da tastiera prima di (6). |
| 2   | P3      | Aggiornamento con voci modificate: la casella «Aggiungi accanto una copia» salvava la scelta senza ricalcolare il piano. Se la copia era l’unica cosa da importare, «Importa» restava disattivato («Niente da importare»); togliendo tutte le copie restava attivo e finiva in un rifiuto.                                                                                                                                                                          | **Corretto.** La casella passa dallo stesso aggiornamento del piano (avviso, blocco, pulsante) e mantiene il fuoco sulla stessa casella. Percorso (3): Spazio due volte sulla copia offerta.                                                                                                                                                                                                                                                              |
| 3   | P3      | Esporta › «Includi note, statistiche e incontri del DM» da tastiera: la pagina si ridisegna e il fuoco va perso.                                                                                                                                                                                                                                                                                                                                                    | **Corretto** (fuoco riportato sulla casella). Percorso (6): Spazio sulla casella, fuoco e stato verificati.                                                                                                                                                                                                                                                                                                                                               |
| 4   | P3      | Contenuti richiesti: dopo l’ultima azione (Abilita) la riga non ha più pulsanti e il fuoco cadeva sul `body`.                                                                                                                                                                                                                                                                                                                                                       | **Corretto.** Il fuoco va all’azione successiva della riga, poi a un’altra voce da sistemare, poi al comando sbloccato («Importa» o «Crea campagna», come nel flusso BG3). Percorso (4): Invio su «Abilita», fuoco su «Importa».                                                                                                                                                                                                                          |
| 5   | P3      | «Installa dal pacchetto» su una riga installava l’intero bundle homebrew del pacchetto (tutte le voci richieste), non solo quella voce (CRP-171: un’azione per voce).                                                                                                                                                                                                                                                                                               | **Corretto.** `installRequirements(…, ref)` passa alla revisione d’import della Biblioteca solo quel contenuto e, transitivamente, quelli da cui dipende e che viaggiano nel pacchetto. Test «Review: Install fixes only its own entry…» (tre voci, una con dipendenza).                                                                                                                                                                                  |
| 6   | P3      | Percorso «Revisione precedente → Aggiorna alla revisione richiesta» senza test.                                                                                                                                                                                                                                                                                                                                                                                     | **Coperto** (nessun difetto): test «Review: Upgrade adds the required revision…» con la sola revisione 1 già in Biblioteca.                                                                                                                                                                                                                                                                                                                               |
| 7   | P3      | EN, differenze di «Nuova versione»: campo «armour class».                                                                                                                                                                                                                                                                                                                                                                                                           | **Corretto** in «armor class» (grafia SRD 5.2.1 e del resto dell’app).                                                                                                                                                                                                                                                                                                                                                                                    |

### Verificato senza difetti

- **Coerenza fra aree nell’app in esecuzione.** Import de «Il faro sommerso» nella campagna in
  corso con scena iniziale: al Tavolo il DM vede «La sala della lanterna» con la pedina del Custode e
  lo spillo nascosto «La grande lente»; il giocatore vede scena e pedina, riceve «Il DM ti mostra:
  Diario del guardiano del faro» senza il testo del DM. Campagna nata da «La cripta» e avviata (B13):
  Preparazione › Incontri, Tabelle e mazzi (sottotabella collegata), Materiali (introduzione a tutto
  il gruppo) e Tavolo (Sentinella ed Esploratore) mostrano le copie importate. Dopo un reload
  Preparazione › Avventure conta «0 modificate» (nessuna modifica spuria).
- **Ruoli:** il giocatore non ha la sezione né la pagina (`#adventures…` → «Pagina non disponibile
  per questo ruolo»). **Eliminazione:** dialogo, Annulla dalla Biblioteca ripristina il pacchetto.
  **Ricerca** dell’intestazione trova «Il faro sommerso» nella categoria Avventure.
- **Telefono 390 (IT, tocco):** elenco, editor, dettaglio, import, nuova campagna, esportazione,
  Preparazione: nessun overflow, nessun controllo sotto i 40 px. **EN 1280:** tutte le etichette
  dell’interfaccia in inglese (i contenuti restano come scritti).
- **Collocazione B61:** nessun contributo al Tavolo (contenuto di Biblioteca/Preparazione), nessun
  pulsante d’intestazione, pagina senza voce di navigazione raggiunta da Biblioteca › Avventure;
  campanella e ricerca solo tramite i punti del registro. Nessun file condiviso modificato (né dal
  costruttore né in questa revisione).
- La striscia «Aree aggiuntive: 1 con avvisi» osservata durante la revisione riguarda B54
  (`crafting.mjs` non caricabile in quel momento), non B49.

### Scelte confermate (non difetti)

- **CA-75 «all’ingresso»:** la verifica avviene quando un pacchetto entra in una campagna (import e
  nuova campagna), non all’ingresso di un membro. Qui i membri usano l’homebrew abilitato tramite la
  campagna (`homebrew.mjs`), quindi non c’è un’installazione per membro da verificare; il limite
  dichiarato dal costruttore resta valido.
- **Reimport con voci modificate:** Foundry e Roll20 sovrascrivono anche le voci modificate; B49 le
  conserva e propone una copia, come chiede l’accettazione (3) e F-038 (nessun azzeramento automatico
  di una partita). L’avviso di sovrascrittura lo dice esplicitamente.
- **Edizione per i giocatori:** include etichette ed estratti degli spilli e i testi per i giocatori
  di tutti i materiali; esclude note del DM, PNG, incontri e tabelle riservate. È un’esportazione
  scelta dal DM (libro di Shard), non una fuga di dati.

### Comandi ed esiti della revisione

```sh
node --test design/blueprint/tests/adventures.test.mjs
# 14/14 pass (11 del costruttore + 3 della revisione; i due nuovi test del modulo e della
# installazione per voce fallivano prima delle correzioni)
node --test design/blueprint/tests/*.test.mjs
# 1635/1635 pass (24/09; un giro precedente aveva 2 errori transitori in journal-plus e
# quests-review, aree di altri costruttori, spariti al giro successivo)
node /Users/salvatoredicara/Workspace/d20-studio/node_modules/prettier/bin/prettier.cjs --write \
  design/blueprint/adventures.mjs design/blueprint/tests/adventures.test.mjs \
  changes/interview-01/blueprint-checks/adventures-journey.js   # poi tolto il `;` finale
# dal cwd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B49-rf/
# (copia del percorso con la cartella delle schermate B49-rf)
playwright-cli -s=d20-b49-rf --raw run-code --filename=journey-rf.js
# tutti i passi (1)(4)(2)(3)(5)(6) + EN phone superati, con i nuovi controlli di tastiera
```

File toccati dalla revisione: `design/blueprint/adventures.mjs`,
`design/blueprint/tests/adventures.test.mjs`,
`changes/interview-01/blueprint-checks/adventures-journey.js`, questo rapporto.
