# Revisione finale indipendente: riservatezza, ruoli e coerenza dei dati

30/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, base `f7ef92d`,
lavoro non committato) · impronta dei 445 file `.mjs/.css/.html` di `design/blueprint`
(sha256 della lista di sha256 ordinata): `3b51e0c3557b4970` · sessione browser
`d20-final-privacy` · server `http://127.0.0.1:8879/` · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/review-privacy/` (fuori dal checkout). Solo
dati sintetici. Ruolo: revisore in sola lettura del codice; nessun file sorgente modificato.

## In breve

- **La riservatezza regge quasi ovunque.** Né il DM legge schede private o appunti «Solo io» del
  giocatore, né il giocatore legge tiri nascosti, creature nascoste o voci segrete, in nessuno dei
  punti chiesti: registro e chat, notifiche, ricerca e palette dei comandi, assistente, inoltro
  delle integrazioni, esportazioni, dadi 3D, grafo delle relazioni, pagine della comunità, vista
  spettatore, «Vedi come». Il fuori rete blocca le scritture condivise e tiene quelle locali. Punti
  ferita e inventario restano uguali su scheda, Tavolo, campagna e Inizio dopo l'azione, l'Undo e
  il ricaricamento.
- **Un rilievo P1: chi viene espulso continua a leggere le schede della campagna.** Dopo
  «Espelli…», Personaggi elenca ancora «Della campagna e affidate · Doran» e la scheda di Doran si
  apre intera (caratteristiche, PF 27/31, inventario, note per chi consulta la scheda), con
  «Proponi al DM…» e «Aggiungi nota». Tutto il resto della campagna è davvero chiuso.
- **Due rilievi P3:** i tiri «Io e il DM» del vassoio mancano nella cronologia dei dadi 3D del DM
  (nel Registro li vede), e il contratto Markdown non dice agli agenti che dovranno implementare
  il prodotto che le proiezioni per ruolo vanno applicate prima di inviare i dati al client.
- **Test Node:** `node --test design/blueprint/tests/*.test.mjs` **2582/2582** (`suite.log`).

## Metodo

1. **Canarini.** Un probe Node (`probes/p4-sweep.mjs`) scrive dati riservati con le funzioni di
   dominio delle aree e il vero store, come fa l'interfaccia. Per il giocatore crea: una voce
   «Solo io», una nota personale su una missione, una nota «Solo io» sulla scheda di Livia, gli
   appunti della scheda privata Iria, un suggerimento «Solo io» sulla pedina di un goblin, un tiro
   «Solo io», un evento privato del calendario e un tiro «Solo il DM». Per il DM crea: una voce
   «Solo io», una nota personale, un tiro nascosto, una creatura nascosta sulla mappa, una
   creatura privata e un evento «Solo DM». A questi si aggiungono **60 testi segreti già
   presenti nell'esempio**, estratti in automatico (`probes/p1-canaries.mjs`): blocchi segreti e
   note del DM delle missioni, testi DM dei materiali, segreti di preparazione, trappole, pin e
   eventi nascosti della mappa del mondo, scene non rivelate, relazioni segrete, avventure.
2. **Consumatori in Node**, per l'altra identità: `searchPalette`, `registry.search`,
   `registry.notifications`, `chat.projectLog`, `dice-3d.recentRolls`, `integrations.logItems /
journalItems / sessionItems`, `assistant.collectSources` (per me e per la campagna),
   `relations-graph.collectGraph`, `community.searchListings / publicPageView`,
   `campaign-data.captureBundle` e `bundleToMarkdown` (con tutte le aree registrate),
   `character-export.exportCharacter`, e il rendering di ogni contributo del registro (pagine,
   sezioni della campagna, riquadri di Inizio, pannelli del Tavolo, livelli della mappa,
   Biblioteca, Preparazione, schede). Controllo positivo: ognuno ritrova i propri canarini.
3. **Giri nel browser**, uno per comando (`probes/*-journey.js`, `sweep-journey.js`). Lo stato
   costruito in Node viene caricato nell'app. Il giro visita tutte le pagine, le 21 sezioni della
   campagna, le sezioni della Biblioteca e della Preparazione, le 7 categorie di ogni scheda e le
   sezioni e sottoschede della barra laterale del Tavolo. Cerca i canarini nel DOM (testo e
   attributi), come giocatore e come DM.
4. **Percorsi reali con clic:** fuori rete, coerenza di PF e pozioni con Undo e ricaricamento,
   «Vedi come» dalle impostazioni della campagna e dal Tavolo.

## Esito per requisito

| Requisito                                       | Come                                                                                                                                                                                      | Esito                                                                                                                                                                                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schede private e «Solo io» mai leggibili dal DM | 8 canarini del giocatore, tutti i consumatori e il DOM come DM; controllo positivo come giocatore (7/8 visti)                                                                             | **Regge**: 0 occorrenze                                                                                                                                                                                                                            |
| Tiri «Solo il DM», «Solo io» e nascosti del DM  | Vassoio con facce fisiche note per ogni pubblico × chi guarda: proiezione del vassoio, Registro, dadi 3D, notifiche, inoltro                                                              | **Regge**: il tiratore di un «Solo il DM» non vede il valore, il giocatore non vede i «Solo io» del DM e viceversa. L'inoltro manda solo l'annuncio                                                                                                |
| Creature nascoste                               | Pedina nascosta, poi inclusa nell'iniziativa con «Tira tutti» e «Inizia» (`startFromTable`) e turno sulla creatura; DOM del Tavolo, dell'iniziativa, del tracker e della vista spettatore | **Regge**: nome e id mai presenti per il giocatore; vista spettatore pulita anche aperta dal DM                                                                                                                                                    |
| Voci segrete                                    | 60 testi segreti dell'esempio + voce per la campagna con una sezione solo DM + voce solo DM; pagina pubblica della comunità con quella voce                                               | **Regge**: la sezione solo DM non esce in palette, assistente, inoltro, grafo, pagina pubblica o DOM. Il DM la trova con la ricerca a testo pieno (controllo positivo)                                                                             |
| Revoca                                          | Voce condivisa e poi limitata ai DM                                                                                                                                                       | **Regge**: sparisce da palette, notifiche, assistente e sezioni                                                                                                                                                                                    |
| Membro espulso                                  | `removeMember` e poi giro completo come giocatore: canarini di membro + 166 righe che un membro legge in campagna e al Tavolo                                                             | **Non regge per le schede della campagna** (P1 sotto); campagna, Tavolo, preparazione, vista spettatore, chat, notifiche e ricerca sono chiusi                                                                                                     |
| Fuori rete                                      | Clic reali: nota personale, messaggio in chat, tiro «Tutti» e «Solo io» dal vassoio, ricaricamento, poi di nuovo in rete                                                                  | **Regge**: la nota e il tiro «Solo io» restano; la chat è rifiutata con il motivo in linea («Sei senza rete…») e la bozza resta nel campo; il tiro «Tutti» non viene registrato (il testo del motivo non è stato catturato); in rete la chat passa |
| Coerenza PF                                     | Danno 5 dalla scheda, poi Undo dal Tavolo, danno 7 e ricaricamento; letti su scheda, barra del Tavolo, ritratti del gruppo, Gruppo della campagna, Inizio, e come DM                      | **Regge**: 18 → 13 → 18 → 11 ovunque                                                                                                                                                                                                               |
| Coerenza inventario                             | «Bevi» dalla scheda (2d4+2 digitali), poi Undo dal Tavolo e ricaricamento                                                                                                                 | **Regge**: ×3/18 PF → ×2/22 PF → ×3/18 PF su scheda e Tavolo                                                                                                                                                                                       |
| Tempo e calendario, sessioni, PE, slot          | Lettura del codice: una sola fonte per ogni dato                                                                                                                                          | **Regge per costruzione**: tempo `restTime.clocks` (mappa del mondo, viaggi); appuntamenti `campaign.sessions` (sessioni+, Inizio, comunità, ICS); `actor.xp`; `spellSlots` canonico                                                               |

## Rilievi

### P1 · Chi è stato espulso legge ancora le schede della campagna

**Riproduzione.** Il DM espelle il giocatore da Campagne › Membri › «Espelli…». Nella prova lo
stato è prodotto da `removeMember`, lo stesso comando del pulsante, e poi caricato nell'app.
Poi, come Giocatore: Personaggi mostra «Della campagna e affidate (1) · Doran». «Apri scheda» mostra la
scheda completa di Doran: caratteristiche, PF 27/31, PE, inventario, note «Scheda», capacità e
storia, con i pulsanti «Proponi al DM…» e «Aggiungi nota». Il link diretto
`#characters?id=doran` fa lo stesso. Il resto è davvero chiuso: campagna («Non fai parte di questa
campagna»), Tavolo, preparazione, vista spettatore, chat, notifiche e ricerca. Prove:
`removed-player-doran.png` e `probes/removed-player.log` (11 occorrenze, tutte su Doran). Il
giro differenziale sulle 166 righe che un membro legge trova solo i dati della scheda di Livia,
che resta sua (`probes/removed2.log`).

**Causa.** `canViewActor` (`character-access.mjs`) rende visibile ogni personaggio non privato a
chiunque (`actor.kind !== "npc"` → vero). L'appartenenza alla campagna si controlla solo per i
compagni (`actor.companion`). L'elenco di Personaggi, la scheda e i loro pulsanti usano lo stesso
predicato. Il contratto dice invece «Espulso: perde l'accesso» (CA-54,
`blueprint-campaign-members-evidence.md`) e l'owner lo chiede esplicitamente.

**Modello da copiare.** È lo stesso caso già corretto per la vista spettatore (P1 della review 2
dei membri, Roll20 SVC-031: chi è espulso perde l'accesso). Nel ramo dei personaggi non privati,
chi non è il proprietario né un controllore legge solo se è membro di una delle campagne della
scheda. Il ramo dei compagni fa già così con `isCampaignMember`; un `campaignIds` assente vale
come la campagna in gioco. La scheda propria resta al proprietario: in sola consultazione dopo
l'espulsione, come ha deciso la variante b della review 2 dei membri, perché resta nella campagna
finché il DM non la riassegna o la disattiva. Aggiungere un test: dopo `removeMember`,
`canViewActor(doran, "player")` è falso, e Personaggi non elenca la sezione «Della campagna e
affidate».

### P3 · Il DM non ritrova nei dadi 3D i tiri «Io e il DM» del giocatore

**Riproduzione.** Il giocatore tira dal vassoio con «Io e il DM». Il DM lo legge nel Registro, col
valore, e nel vassoio. Nella cronologia dei dadi 3D («Solo i tiri che puoi vedere… Rivedi») quel
tiro però non c'è, mentre c'è un «Solo il DM» dello stesso giocatore (`probes/p9-blind.mjs`,
`probes/p16-gm-chat.mjs`: Registro del DM `[13, 17]`, dadi 3D del DM `[17]`).

**Causa.** `dice-tray-domain.rollEvent` dà a un tiro «gm» `owner = controller = chi tira` con
`visibility: "private"`. `dice-3d-domain.recentRolls` controlla prima con `canSeeResult` (vero per
il DM), ma poi `describeRoll` filtra di nuovo con `rollVisibleTo` (falso per il DM).

**Modello da copiare.** È la convenzione dei tiri di combattimento (`state.mjs acceptedRolls`,
DEVELOPMENT «Audit round 2»): i tiri «Io e il DM» e «Solo il DM» sono del DM. In `rollEvent` un
tiro «gm» avrà `owner: "dm"` e `controller:` chi tira, così lo leggono entrambi e nessun altro.

### P3 · Contratto per chi implementa: le proiezioni vanno fatte prima dell'invio

Il blueprint è una simulazione locale e il DEVELOPMENT lo dice («No backend security is
implied»). Diversi schemi però funzionano solo perché tutto lo stato è sul dispositivo; copiati
alla lettera in un prodotto con server romperebbero la riservatezza:

- la nebbia nasconde le pedine non viste con `<style>…{display:none}` e ne elenca gli id in
  `data-fv-hidden-tokens` (`fog-vision.mjs`);
- `campaign-data` tiene per 120 minuti l'intero file esportato dal DM, segreti compresi, in
  `state.ext["campaign-data"].exports[].content`, cioè nello stato condiviso;
- il segnale anonimo non registra il mittente, ma il suo commit sì: la voce del registro ha
  `controller: "player"` e un orario a 1 ms dal segnale (`probes/p17-signal.mjs`). Nell'app nessuno
  lo vede;
- nello stesso stato condiviso stanno anche i profili di sicurezza di ogni membro e i token dei
  calendari ICS.

Nessuno di questi punti è una fuga nell'app così com'è: interfaccia, Registro e notifiche
proiettano bene. `BLUEPRINT_CONTRACT.md` e `BLUEPRINT_STATUS.md` però citano il backend solo come
lavoro residuo, senza una regola. Proposta: una riga nel contratto, «ogni identità riceve solo la
propria proiezione; i dati privati di altri, le creature non viste e le esportazioni non arrivano
al suo dispositivo; l'anonimato vale anche per il registro di audit», con questi quattro esempi.

## Verificato e corretto (nessun rilievo)

- **«Vedi come».** Nelle impostazioni della campagna (9 pagine) e al Tavolo (sessione) non
  compare nessun canarino del giocatore. La proiezione della mappa disegna i livelli come
  spettatore. «Gioca per» resta con il ruolo DM.
- **Esportazioni.** Il DM, con tutte le aree registrate e con o senza «includi i miei privati»,
  esporta solo i propri privati. L'esportazione della scheda è riservata al proprietario ed
  esclude i piani personali.
- **Pagina pubblica della comunità.** Pubblica solo le voci del DM o di un co-DM condivise con
  tutta la campagna e, di queste, solo le sezioni condivise con tutti. Delle pagine dell'Archivio
  prende solo blocchi di testo o rivelati a tutti e proprietà non segrete.
- **Inoltro delle integrazioni.** Pubblica solo tiri e righe condivise. I tiri nascosti entrano
  solo nel conteggio di chi li ha fatti.
- **Travestimenti.** Registro e dadi 3D mascherano anche i tiri precedenti; l'anteprima
  dell'inoltro mostra i messaggi già «inviati» con il nome di allora, coerente con un canale reale.
- **Promemoria della mappa del mondo** con pubblico «Solo io»: arrivano solo a chi li ha creati.
  **Segnalibri e schede aperte del diario** rileggono il titolo a ogni disegno («Pagina non
  disponibile» dopo una revoca).

## Limiti

- Esistono due sole identità (giocatore e DM). I sussurri tra giocatori, i materiali mostrati a
  un solo personaggio di un altro giocatore e gli osservatori non si possono provare fra tre
  persone.
- I pubblici dei tiri di combattimento («Solo il DM», «Io e il DM», alla cieca) si basano sui test
  esistenti TV-89/TV-141 e sui canarini, senza un nuovo percorso con clic. Per gli slot, le
  condizioni, il tempo e i PE ho letto il codice (fonte unica); nel browser ho provato con Undo e
  ricaricamento solo PF e pozioni.
- Solo Chromium, IT 1440. Non ho fatto controlli su telefono né in inglese: questa revisione
  riguarda i dati, non la presentazione.

## Prove

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/review-privacy/`:

- `suite.log`;
- probe Node `probes/p1…p17*.mjs` con gli stati generati (`sweep-state.json`,
  `removed-state.json`, `hidden-init-state.json`, `sections-state.json`);
- giri nel browser `probes/*-journey.js`, `sweep-*.js` con i log `sweep-player2.log`,
  `sweep-dm.log`, `removed-player.log`, `removed2.log`, `hidden-init.log`, `sections.log`,
  `coh-hp.log`, `coh-potion.log`;
- immagini `removed-player-doran.png`, `removed-player-doran-notes.png`, `offline-tray.png`,
  `coherence-hp-dm-home.png`.
