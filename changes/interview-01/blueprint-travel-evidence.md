# B45 — Esplorazione, viaggio e accampamento: prove

24/09/2026 (cartella delle prove datata 2026-09-25 come indicato dal compito). Worktree
`d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non committato. Area costruita
solo tramite il registro (B11): **nessun file condiviso modificato**.

## File

Nuovi (tutti di B45):

- `design/blueprint/travel.mjs` — modulo d'ingresso `register(registry)` e interfaccia:
  sezioni di stato `travel` (Undo a istantanea) e `travel-rolls` (`undo: "preserve"`, prove
  dei dadi), scheda laterale del Tavolo «Viaggio e accampamento» (Marcia · Viaggio · Campo),
  pannello «Luce e ricerca» nella scheda Creatura, strumenti del DM «Posiziona il gruppo» e
  «Punto di ricerca», due livelli della mappa (luce/punti/anteprima della formazione; meteo),
  sezione «Luce e provviste» nella scheda Inventario del personaggio, notifiche (B24),
  comando «Apri viaggio e accampamento» (B23).
- `design/blueprint/travel-domain.mjs` — dominio puro: formazione, Posiziona il gruppo,
  prove con dadi fisici/digitali, viaggio, eventi, meteo, provviste, torcia, Cercare.
- `design/blueprint/camp.mjs` — accampamento e turni di guardia sopra il motore dei riposi
  dell'incremento 8 (`rest-time.mjs`), senza un secondo motore.
- `design/blueprint/exploration.css` — stili `.travel-*` collegati con `registerStyles`.
- `design/blueprint/tests/travel.test.mjs` (21 test), `tests/camp.test.mjs` (6 test),
  `tests/travel-harness.mjs` (store e registro reali, ctx come l'app, doppio del DOM).
- `changes/interview-01/blueprint-checks/travel-journey.js` — percorso nel browser.

Differenze rispetto alla scheda: il percorso si chiama `travel-journey.js` (nome dato dal
compito) invece di `travel-camp-journey.js`; `rest-ui.mjs` **non** è stato toccato: il campo
usa le funzioni del dominio dei riposi dentro i propri commit e apre il pannello esistente con
`ctx.openRest`, quindi l'aggancio additivo previsto non è servito. `extensions.mjs` elencava
già `travel`. Moduli importati in sola lettura (funzioni pure): `world-map-domain.mjs` (tabella
del passo e del terreno SRD già usata dal Mondo, B42), `world-calendar.mjs`, `rest-time.mjs`,
`conditions.mjs`, `party-stash.mjs` (modello delle righe d'inventario del Bottino, B26),
`character-access.mjs`, `campaign-content.mjs`, `forms-companions.mjs`, `character-rules.mjs`.

## Dove si trova (≤ 2–3 clic)

| Contesto                                                    | Percorso                                                                                                                    | Chi                                                   |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Tavolo → scheda laterale **Viaggio e accampamento**         | 1 clic (icona fiamma, ordine 74, dopo «Mondo»); poi Marcia/Viaggio/Campo                                                    | membri della campagna                                 |
| Tavolo → scheda **Creatura** → «Luce e ricerca»             | 0–1 clic (creatura selezionata del gruppo)                                                                                  | chi legge la creatura; comandi a chi la controlla     |
| Barra a sinistra → Strumenti del DM → «Posiziona il gruppo» | 2 clic (o il pulsante nella scheda Marcia, 1 clic)                                                                          | DM                                                    |
| Barra a sinistra → Strumenti del DM → «Punto di ricerca»    | 2 clic, poi clic sulla mappa                                                                                                | DM                                                    |
| Scheda del personaggio → Inventario → «Luce e provviste»    | Personaggi → scheda → Inventario (2–3 clic)                                                                                 | chi legge la scheda (solo personaggi del gruppo)      |
| Campana (B24)                                               | prove richieste, provviste da decidere, torcia agli ultimi 10 min, eventi; un clic apre il Tavolo sulla scheda (verificato) | chi controlla il personaggio; eventi proposti solo DM |
| Palette dei comandi (B23)                                   | Ctrl/Cmd+K → «Apri viaggio e accampamento» (porta al Tavolo sulla scheda; verificato)                                       | tutti                                                 |
| Riposi (incremento 8)                                       | il riposo lungo del campo è lo stesso del pannello «Riposi» / «Apri il riposo»                                              | chi controlla i partecipanti                          |

Collocazione (B61): nessun pulsante nuovo in testate né nella barra delle azioni; strumenti
che agiscono con il puntatore nella barra a sinistra (gruppo DM); pannello di lavoro come
scheda della barra laterale; ciò che riguarda la creatura selezionata (luce, Cercare) nella
scheda Creatura; fuori dal Tavolo una sezione nella scheda del personaggio.

## Comandi eseguiti

- `node --test design/blueprint/tests/travel.test.mjs design/blueprint/tests/camp.test.mjs`
  → 27/27.
- `node --test design/blueprint/tests/*.test.mjs` → 1699/1699 (nessun errore in altre aree).
- `node …/prettier/bin/prettier.cjs --check` sui file dell'area → tutti conformi (al percorso
  del browser è stato tolto il `;` finale, come chiede il README dei percorsi).
- Browser (Chromium, server `http://127.0.0.1:8879/`, sessione `d20-b45`, cartella
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B45/`):
  `playwright-cli -s=d20-b45 --raw run-code --filename=…/blueprint-checks/travel-journey.js`
  → 12 gruppi di verifiche superati, nessun errore di pagina (`journey-result.json` nella
  cartella delle prove). Gruppo 1: IT desktop 1440 × 900, DM e giocatore, clic, tastiera,
  trascinamento con il mouse, ricarica, Undo. Gruppo 2: contesto isolato EN telefono 390,
  tocco. Nessun overflow orizzontale a 1440 e a 390.
- «Cosa è pronto» elenca l'area «Esplorazione, viaggio e accampamento» come pronta.

Schermate (1440 × 900 salvo telefono, ispezionate): `b45-01` formazione e gruppo posizionato;
`b45-02` risultati di Cercare; `b45-03` campana con l'avviso della torcia; `b45-03a` torcia
agli ultimi 10 min nella scheda Creatura; `b45-04` evento proposto (solo DM); `b45-05` prove
richieste al giocatore; `b45-05a` tiro salvezza del viaggio prolungato fallito; `b45-06` meteo
con effetto e nebbia sulla mappa; `b45-07` provviste con avvisi; `b45-08` evento di guardia;
`b45-09` riposo interrotto; `b45-10` riposo lungo concluso; `b45-11/12/13` telefono EN.

## Capacità → percorso → prova

| Capacità (censimento)                                   | Percorso e comandi                                                                                                                                                                                                                                                                                                         | Risultato verificato                                                                                                                                                                                                                                                                                                                   | Regola / fonte                                                                                                                                | Pattern adottato (prodotto, ID)                                                                                                       | Prova                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| TV-132 Ordine di marcia e formazione                    | Marcia: griglia 4 file × 3 colonne; trascina un ritratto su una casella (mouse/tocco), oppure tocca/Invio un personaggio e poi una casella; «1/2/3 colonne», «Raggruppa tutti», ↺ ↻ (fronte), «Togli»                                                                                                                      | Mira trascinata in testa, Livia spostata con Invio/Tab/Invio, fronte a Est; il testo «davanti: Mira, Doran · in coda: Livia» si aggiorna; ricarica conserva                                                                                                                                                                            | Marching Order EN 12 / IT 12 (qualunque forma di registrazione)                                                                               | FG Party Sheet › Order, griglia e riempimento 1/2/3 colonne (R20-080); BG3 «Group All» (CRP-123)                                      | `travel.test` formazione; percorso 1                       |
| TV-116 Posizionare il gruppo mantenendo la formazione   | Marcia → «Posiziona il gruppo sulla mappa» (o Strumenti del DM → «Posiziona il gruppo»): anteprima fantasma sotto il puntatore, clic sulla mappa; Invio = centro scena; Esc annulla                                                                                                                                        | Doran sulla casella scelta, Mira al suo fianco, Livia dietro (fronte Est), tutti al centro delle caselle; pedina mancante aggiunta; lo strumento torna a Muovi; Undo rimette le pedine; rifiuto in combattimento e ai giocatori                                                                                                        | Marching Order EN 12 / IT 12; il posizionamento non modifica l'iniziativa (F-054)                                                             | Roll20 «Place/Bring Party Here» (R20-064); FG piazzamento con la formazione salvata (R20-080, R20-158)                                | `travel.test` Place Party (2 test); percorso 1             |
| TV-134 Viaggio: passo, distanza, marcia forzata, eventi | Viaggio: passo Lento/Normale/Veloce con effetto e fonte; ore 1–12; «Viaggia»; «Tira un evento»; «Riassumi il viaggio»; «Annulla il viaggio»; «Parti» (nuovo viaggio in km o mi)                                                                                                                                            | Veloce ammesso in collina solo con la strada; 10 h: orologio condiviso 09:00 → 19:00 (data del Mondo), 57 km (colonna Giorno + 2 ore), 6 TS Costituzione (CD 11, 12); evento d8 fisico = 5 «Tracce recenti» mostrato come «Proposta, non applicata» solo al DM; accettato chiede la prova con lo svantaggio del passo                  | Travel Pace EN 12 / IT 13; Travel Terrain, Good Roads, Slower Travelers, Extended Travel EN 192 / IT 220; CD del terreno dalla stessa tabella | Solasta II passo e marcia forzata, eventi per bioma proposti all'host (CRP-065/067); dnd5e prove di viaggio con il passo (FVT-050)    | `travel.test` viaggio (5 test), eventi, UI; percorso 2, 2b |
| TV-135 Meteo per clima e stagione                       | Viaggio → Meteo di oggi: clima, stagione (dal calendario del Mondo), «Genera il meteo» (d20 fisico/digitale), «Cambia» (motivo), «Mostra ai giocatori», «Sulla mappa»                                                                                                                                                      | d20 = 17 in autunno temperato → «Pioggia battente» con effetto SRD; nascosto al giocatore finché non condiviso; cambio a «Nebbia rada» con motivo in cronologia; nebbia disegnata sulla mappa per chi la vede                                                                                                                          | Environmental Effects EN 195 / IT 223; Obscured Areas EN 11 / IT 12 (tabella del meteo: contenuto dimostrativo originale)                     | Simple Weather: clima e stagione, GM-only o pubblico, testo di regola per condizione (FVT-064); Owlbear Weather sovrapposto (VTL-181) | `travel.test` meteo; percorso 3                            |
| TV-136 Provviste con consenso al consumo                | Viaggio → Provviste: il DM propone il consumo del giorno (acqua sufficiente o scarsa); chi gioca il personaggio sceglie «Consuma 1 razione», «Altra fonte» o «Salta»                                                                                                                                                       | la razione esce dall'inventario di Livia (2 → 1, visibile anche nella scheda); il DM non può mangiare per un giocatore; Mira senza razioni salta: avvisi di Malnutrizione e Disidratazione con pagine SRD, «nulla viene applicato da solo», Indebolimento invariato                                                                    | Malnutrition EN 185 / IT 209; Dehydration EN 181 / IT 207; Rations e «10 days of Rations» EN 97, 99 / IT 109, 112                             | Rest Recovery cibo e acqua (FVT-033); razioni di Solasta con consenso esplicito (CRP-066)                                             | `travel.test` provviste, UI; percorso 4                    |
| TV-133 Turni di guardia con verifiche                   | Campo: tabella turni × personaggi (2 h ciascuno), «Turni a rotazione», «Accampatevi: riposo lungo», «Turno successivo (+2 h)», «Evento nel turno» (tabella d6 o testo, CD), «Falso allarme» / «Si tira l'iniziativa», «Riprendi il riposo», «Un'ora in più», «Concludi il riposo lungo», «Leva il campo», «Apri il riposo» | riposo lungo nel motore dell'incremento 8 (dormienti Privi di sensi, sentinella sveglia); l'evento chiede la Percezione solo a chi è di guardia (Doran, fisico 11 → se ne accorge); l'iniziativa interrompe tutti i riposi (benefici del breve dopo 2 h, visibili nel pannello Riposi); ripresa con 1 h in più; fine con PF recuperati | Long Rest EN 185 / IT 213 (≤ 2 h di attività leggera come montare la guardia; interruzione per iniziativa; +1 h per interruzione)             | WotR Night Watch con Percezione (CRP-155); FG ordine di guardia numerato (R20-080); BG3 accampamento come luogo del riposo (CRP-156)  | `camp.test` (6 test); percorso 5                           |
| TV-137 Luce portatile con durata e scorte               | Creatura → «Accendi una torcia» / «Spegni»; il tempo avanza con «Tempo» del DM, viaggio o campo                                                                                                                                                                                                                            | una Torcia esce dall'inventario; «resta 1 h 0 min»; anello di luce 6 + 6 m che segue la pedina; a +50 min avviso nella scheda e nella campana («si spegne tra 10 min»); a +60 min la luce si spegne da sola («La torcia si è consumata»); con pioggia battente o vento forte l'avviso SRD delle fiamme                                 | Torch EN 100 / IT 113 (1 ora, luce intensa 20 ft / 6 m, fioca altri 20 ft / 6 m); Environmental Effects per le fiamme                         | FG effetto LIGHT che segue l'attore (R20-121); BG3 descrizione della fonte di luce (CRP-147)                                          | `travel.test` torcia; percorso 6                           |
| TV-138 Cercare con elenco dei ritrovamenti              | Creatura → «Cerca qui» (d20 fisico/digitale); «Prendi»; DM: strumento «Punto di ricerca», clic/Invio su un punto per modificarlo o eliminarlo                                                                                                                                                                              | 12 + 1 = 13: «Cassa sfondata · vuoto» e «Nicchia sotto il gradino · Razioni ×2, Torcia ×1» (CD 13); i segni lontani restano nascosti anche sulla mappa; «Prendi» mette gli oggetti nell'inventario; il punto nascosto del DM non compare al giocatore                                                                                  | Search [Action] EN 187 / IT 212; Finding Hidden Objects EN 12 / IT 13 (vicinanza: raggio del tavolo 4,5 m, scelta dichiarata)                 | BG3 Search: elenco dei ritrovamenti con stato dei contenitori (CRP-133)                                                               | `travel.test` Search (2 test), UI; percorso 7, 7b          |

## Dadi, prove, correzioni

- Ogni tiro è fisico o digitale con la stessa finestra del resto dell'app (scelta «Dadi»,
  facce naturali, modificatore aggiunto una volta; Esc lascia la richiesta in attesa). I dadi
  digitali usano `rollDie` di `state.mjs`; il tiro accettato entra nella voce del registro
  (`state.log[].rolls`, sorgente `travel`) ed è annunciato con `roll-accepted`: lo mostrano i
  dadi animati (B56) e la chat (B17). Nessun secondo motore di dadi.
- Vantaggio e svantaggio tirano due d20 (tiene il più alto/basso); ragioni dichiarate: passo
  di viaggio (SRD), svantaggio del meteo scelto dal DM per l'evento di guardia, condizioni
  (Avvelenato) e Indebolimento (−2 per livello) letti da `conditions.mjs`.
- Correzione di facce fisiche con motivo: le facce precedenti restano; i risultati digitali
  non si modificano. Dopo un Undo il nuovo tiro digitale della stessa prova riusa le facce
  già uscite (regola I-229 dell'app), perché le prove stanno in `travel-rolls` (preservata).
- Percezione passiva usabile dal DM al posto del tiro (SRD EN 22 / IT 24, ±5 con
  vantaggio/svantaggio).
- Il fallimento del TS del viaggio prolungato propone 1 livello di Indebolimento: lo applica il
  DM dal pannello condiviso «Condizioni e stato» (verificato: resta 0 finché non lo applica).

## Coerenza con il resto dell'app

- Stessi dati: Livia, Doran, Mira (gruppo della campagna `lanterns`, lo stesso elenco della
  scorta del gruppo B26), scena `old-watch`, inventari delle schede (torce e razioni sono
  righe dell'inventario con il modello del Bottino), orologio condiviso di `restTime` (lo
  stesso del pannello Riposi e del Mondo: la data «14 Nebbie 1287» diventa «15 Nebbie» dopo la
  notte), riposi dell'incremento 8, condizioni dell'incremento 10.
- Seme sintetico coerente: viaggio già pronto «Vecchio osservatorio → Porto Grigio» (143 km di
  colline con la strada per la costa, come sulla mappa del Mondo), formazione Doran davanti,
  turni di guardia con il quarto scoperto, cinque punti di ricerca nel cortile (due oggetti
  nascosti con razioni, una torcia e una corda del catalogo SRD). La scorta del gruppo (5
  torce) e il carro di Tessa (razioni) di B26 restano le fonti normali.
- Riservatezza: proposte d'evento, meteo non condiviso, punti non trovati e CD degli eventi
  sono proiettati solo al DM; i tiri del DM sulle tabelle sono privati nel registro. Il
  consenso alle provviste spetta a chi gioca il personaggio. Nessun appunto personale letto.

## Limiti dichiarati

- La luce della torcia è disegnata dal livello di B45 e segue la pedina; il calcolo della
  visione dinamica di B35 non la include (le sue luci portate restano sue). Un punto di
  aggancio possibile per B35: `litLight`/`lightStatus` di `travel-domain.mjs`.
- Torce soltanto: lanterne a olio (6 ore riaccendibili), lampade e incantesimi di luce non
  sono modellati; una torcia spenta prima del tempo non si riaccende (l'SRD non lo prevede,
  il resto dell'ora è perso).
- Acqua come dichiarazione giornaliera del DM (sufficiente/scarsa), non come riempimenti
  degli otri; razioni automatiche solo per taglia Piccola e Media (altre taglie: «Altra fonte»
  d'accordo con il DM). Il TS di Malnutrizione non viene chiesto: resta l'avviso.
- Tabelle di eventi di viaggio (d8), eventi del campo (d6) e meteo (d20, 3 climi × 4
  stagioni) sono contenuti dimostrativi originali; niente previsioni a più giorni, incontri
  avviati da soli o procedure di orientamento/foraggiamento della DMG (non presenti nell'SRD:
  si usano solo le CD della tabella del terreno).
- Viaggio: niente cavalcature (doppia velocità per 1 ora), veicoli (il «Carro» di B44) o
  navi (sul terreno «acqua» il passo è rifiutato con la spiegazione); gruppo diviso non
  gestito; una tappa resta nello stesso giorno (massimo 12 ore).
- Posiziona il gruppo sposta le pedine direttamente (fuori dal combattimento), senza
  controllare muri o caselle occupate; griglia fissa 3 × 4; i compagni non entrano nella
  formazione.
- Cercare: raggio di 4,5 m scelto dal tavolo; in combattimento è rifiutato (l'azione costa il
  turno e resta al combattimento); i pacchetti del Bottino (B26) non compaiono tra i
  contenitori.
- Campo: quattro turni fissi di 2 ore; solo il ruolo di guardia (mimetizzazione e cucina di
  WotR non costruite); «Prepara l'incontro» apre il flusso esistente degli incontri senza
  avviarlo.
- I dadi animati (B56) intitolano questi tiri «Tiro» perché non conoscono la sorgente
  `travel`; il registro e la chat mostrano l'etichetta completa.
- Simulazione locale a due identità nello stesso browser; nessun backend, nessuna sicurezza
  reale dei dati proiettati.

## Review and fixes

Revisione indipendente (reviewer-fixer, non il costruttore), 24/09/2026. Stesso worktree
`d20-studio-interview-01`, lavoro non committato. Sessione del browser `d20-b45-rf`, prove in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B45-rf/` (fuori dal
checkout). Solo dati sintetici. Regole ricontrollate sui PDF SRD 5.2.1 EN/IT locali: passo e
effetti (EN 12 / IT 13), terreno, strade, viaggiatori lenti e viaggio prolungato (EN 192 /
IT 220), riposo lungo e interruzioni (EN 185 / IT 213), Malnutrizione (EN 185), torcia (EN 100).
Sono corretti. Ogni correzione è partita da un test che falliva.

### Difetti trovati e corretti

| ID  | Gravità       | Riproduzione (prima)                                                                                                                                                                                                                                                                                                                  | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | P2            | Senza rete, DM › Viaggio › «Tira un evento» › «Tira»: la finestra resta aperta e muta; il motivo compare in un avviso dietro lo sfondo scuro della finestra (`rf-03`). Lo stesso per facce fisiche non valide, motivo mancante in correzioni, annulla viaggio, leva il campo, punti di ricerca.                                       | Corretto. Ogni finestra dell'area (`openDialog`) fa sì che `act` passi il rifiuto alla finestra dell'app, che lo scrive nella sua riga d'errore e resta aperta (`rf-10`). Fuori dalle finestre il rifiuto resta un avviso. Test F1; percorso F1.                                                                                                                                                                                                                                                                                 |
| F2  | P2            | Giocatore › Creatura › «Cerca qui» (digitale), «Annulla ultima modifica», di nuovo «Cerca qui»: tiro nuovo. Ogni ricerca creava una prova con id nuovo, quindi la regola I-229 (dopo un Undo si riusano le facce) non valeva per Cercare.                                                                                             | Corretto in `travel-domain.mjs`: l'id della prova conta le ricerche del personaggio nella scena; una ricerca annullata lascia il conteggio invariato e la ricerca successiva riusa le facce (`reusedFrom`). Una seconda ricerca vera tira di nuovo. Test F2; percorso F2 (totale uguale, tiro «riusato»).                                                                                                                                                                                                                        |
| F3  | P2            | Accampamento attivo, DM › «Avvia combattimento» dal Tavolo (o danni a chi dorme): il motore dei riposi interrompe i riposi, ma il campo resta «in corso». «Riprendi il riposo» rifiutato («Il riposo non è interrotto»), «Concludi» rifiutato («Nessuno sta riposando»), «Turno successivo» fa avanzare 2 ore senza nessuno a riposo. | Corretto in `camp.mjs`: stato effettivo dal motore (`campStatus`, `interruptedIn`); ripresa di chi è interrotto dal campo o dal Tavolo, anche solo per uno; turni, eventi, ora in più e conclusione rifiutati in combattimento o senza nessuno a riposo; conclusione rifiutata se qualcuno resta interrotto. Pannello: «Riposo interrotto: Livia, Doran» con «Riprendi il riposo»; durante l'incontro la notte aspetta (nessun turno, evento o ripresa). Test F3 (2); percorso F3 con l'avvio reale del combattimento (`rf-13`). |
| F4  | P2            | DM › Campo › «Evento nel turno» «Due goblin esploratori strisciano verso il campo»: il giocatore legge il testo prima di tirare Percezione, e nella cronologia anche dopo un falso allarme in cui nessuno se n'è accorto (`rf-04`). Anche la faccia del d6 privato.                                                                   | Corretto: il testo e la faccia sono del DM; il giocatore vede «Il DM chiede una prova di Percezione a chi è di guardia» solo se ha sentinelle da tirare, e nella cronologia solo l'esito («falso allarme», «iniziativa»). Test F4; percorso F4 (`rf-12`).                                                                                                                                                                                                                                                                        |
| F5  | P2            | Campana › «Prova richiesta: Livia» (guardia): il Tavolo si apre su «Viaggio e accampamento» ma nella sotto-scheda usata per ultima (di solito Marcia), dove la prova non c'è. L'avviso della torcia apriva la stessa scheda, mentre la torcia sta nella scheda Creatura.                                                              | Corretto: le notifiche portano la sotto-scheda che elenca la richiesta (`travel-camp`, `travel-journey`) e selezionano il personaggio; la torcia apre la scheda Creatura del portatore (`travel-creature`). Il comando della palette resta invariato. Test F5; percorso F5 e percorso del costruttore (sotto-scheda Viaggio con il tiro).                                                                                                                                                                                        |
| F6  | P2            | Scena di notte con visione dinamica (B35): il giocatore accende una torcia da «Luce e ricerca»; l'anello di B45 compare ma la visione di B35 non la conta (luce «buio» sulla pedina). Due torce diverse sullo stesso Tavolo (quella «portata» di B35 e quella con durata e consumo di B45).                                           | Corretto con un aggancio additivo in B35 (sotto): le torce accese di B45 sono fonti di luce della scena finché non si spengono o si consumano (luce intensa 6 m + fioca 6 m, fermata dai muri come ogni luce di B35), senza scrivere nei dati di B35. Test F6; percorso F6: a Livia la luce passa da «dark» a «bright» (`rf-14`). Il limite dichiarato «il calcolo della visione dinamica di B35 non la include» è superato.                                                                                                     |
| F9  | P2 (tastiera) | Tastiera: Invio su ↻, «1/2/3 colonne», freccia sui passi, Spazio su una casella dei turni di guardia: dopo il salvataggio il fuoco torna al corpo della pagina (misurato: `BODY`), bisogna ripartire con Tab.                                                                                                                         | Corretto: dopo un comando il fuoco torna allo stesso controllo ridisegnato (riconosciuto dai suoi attributi `data-*`), salvo che una finestra o il comando stesso lo abbia spostato. Percorso F9 (due rotazioni di fila, freccia sui passi, Spazio/Tab/Spazio sui turni).                                                                                                                                                                                                                                                        |
| F7  | P3            | Evento «Creature ostili»: «2d10 × 10 piedi» in italiano (l'SRD IT scrive «2d10 × 3 metri», p. 220); due opzioni «Autunno» nella stagione del meteo; «Chi tira» preselezionava il primo del gruppo (Livia) invece di chi guida la marcia.                                                                                              | Corretto: metri in IT, piedi in EN; prima opzione «Dal calendario (Autunno)»; la prova suggerita chiede la prima fila dell'ordine di marcia (l'SRD: l'ordine dice chi scorge per primo). Test F7; percorsi F7 e del costruttore (Mira e Doran in testa).                                                                                                                                                                                                                                                                         |
| F8  | P3            | Un tiro richiesto in un'altra sotto-scheda non si vede da quella aperta.                                                                                                                                                                                                                                                              | Corretto: ogni sotto-scheda conta i tiri che aspettano chi guarda (nome accessibile «Campo: 1 tiro richiesto»), come il contatore del Registro. Test F8; percorso F4/F8.                                                                                                                                                                                                                                                                                                                                                         |
| F10 | P3            | «Evento nel turno»: la finestra mostrava insieme testo e CD (ignorati con la tabella) e dadi e faccia del d6 (ignorati con «Descrivo io»): campi che non facevano nulla.                                                                                                                                                              | Corretto: compaiono solo i campi dell'origine scelta (faccia solo con dadi fisici), con i vincoli `required` giusti. Percorso F4.                                                                                                                                                                                                                                                                                                                                                                                                |

### Non difetti (con motivo)

- Il DM vede «Tira» e riceve in campana le prove dei personaggi dei giocatori: è la stessa
  regola del combattimento del core (`roleCanRoll`: il DM controlla gli attori della campagna);
  discrezione del DM. Il consenso alle provviste resta invece di chi gioca.
- Il pulsante «Annulla: …» nel pannello: convenzione già usata da altre aree (Riposi,
  Condizioni, Tabelle e mazzi); la barra delle azioni resta il posto principale.
- «Posiziona il gruppo» come strumento della barra a sinistra e non come voce del menu del
  tasto destro sulla mappa (Roll20 R20-064): il registro non ha un menu contestuale della
  mappa; FG piazza il gruppo trascinando sulla mappa (R20-158); B61 mette gli strumenti a
  puntatore a sinistra.
- «Cerca qui» e la torcia nella scheda Creatura e non nella barra delle azioni: il registro
  non offre un punto d'estensione per la barra; B61 mette i pannelli della creatura
  selezionata nella scheda Creatura.
- Il testo di un evento di viaggio accettato è visibile ai giocatori: accettarlo è la
  decisione del DM di narrarlo; proposte e scarti restano solo del DM.
- L'avviso di Malnutrizione cita sia il TS CD 10 sia i 5 giorni: è il testo del pericolo
  SRD; nulla viene applicato, decide il DM.
- Nel seme i personaggi hanno 0 razioni e 0 torce: le fonti sono la scorta del gruppo e il
  carro di B26 (dati di `state.mjs`, non di B45).
- L'anello di B45 resta disegnato insieme alla luce di B35: indica la portata (6 + 6 m);
  la luce che rischiara e si ferma ai muri è quella di B35.

### Aperti (fuori da B45)

- Telefono: con l'etichetta lunga «Viaggio e accampamento» la barra delle schede in basso
  taglia il nome della scheda vicina (barra di B61 scorrevole); da valutare nella struttura
  del Tavolo, non nell'area.
- Il Mondo (B42) «Misura il percorso» potrebbe avviare questo viaggio con distanza e
  terreno già compilati (Solasta: l'host guida il gruppo sulla mappa, CRP-065); richiede una
  modifica a `world-map.mjs`.

### Modifica condivisa (additiva)

- `design/blueprint/fog-vision-domain.mjs` (B35): `addLightProvider(provider)` e
  `buildLighting` che scorre anche le luci fornite (`[...cfg.lights, ...providedLights()]`);
  un fornitore che lancia non aggiunge nulla; firme e comportamento invariati senza
  fornitori. B45 registra `D.torchLights` in `register()`. Un revisore di B35 lavora in
  parallelo sullo stesso file: la modifica è di poche righe e il test F6 fallisce se
  l'aggancio sparisse.

### File di B45 toccati dalla revisione

`travel.mjs`, `travel-domain.mjs`, `camp.mjs`, `exploration.css`; nuovi
`tests/travel-review.test.mjs` (9 test) e `blueprint-checks/travel-review-journey.js`.
Test del costruttore adattati al comportamento corretto: `travel.test.mjs` (due rifiuti in
finestra ora lanciati alla finestra) e `camp.test.mjs` (testo del riposo interrotto);
`travel-journey.js` (prima fila di marcia preselezionata, campana sulla sotto-scheda Viaggio
con il tiro).

### Comandi e risultati

- `node --test design/blueprint/tests/travel-review.test.mjs design/blueprint/tests/travel.test.mjs design/blueprint/tests/camp.test.mjs`
  → 36/36.
- `node --test design/blueprint/tests/*.test.mjs` → 1710/1710 (due giri, prima e dopo le
  ultime modifiche).
- Prettier `--check` su tutti i file toccati → conformi (ai percorsi è tolto il `;` finale).
- Browser, sessione `d20-b45-rf`: `travel-journey.js` (copia con la cartella delle prove
  B45-rf) → 12/12 gruppi, nessun errore di pagina (`journey-result.json`);
  `travel-review-journey.js` → 8/8 gruppi, nessun errore (`review-journey-result.json`);
  regressione di B35 `fog-vision-journey.js` (copia in `b35-regression/`) → tutti i gruppi
  superati, nessun errore di pagina.
- Sonde esplorative: `probe-1.js`…`probe-4.js` (testi per ruolo, bersagli ≥ 40 px e nessun
  overflow a 390 e 1440 per DM e giocatore in Marcia, Viaggio, Campo e Creatura; rifiuto
  senza rete; riservatezza dell'evento del campo; fuoco da tastiera).

Schermate (ispezionate): `rf-03` prima (avviso dietro la finestra), `rf-04` prima (testo
dell'evento al giocatore), `rf-10` rifiuto nella finestra, `rf-11` evento con metri e prima
fila, `rf-12` evento del campo visto dal giocatore, `rf-13` combattimento dal Tavolo che
interrompe il campo, `rf-14` torcia che illumina la visione di notte, `rf-15` telefono EN
390 campo, `rf-390-*`/`rf-1440-*` sonde di impaginazione.
