# Revisione finale: trovabilità delle funzioni (40 compiti senza guida)

30/09/2026 · worktree `d20-studio-interview-01` (ramo `codex/interview-01`, HEAD `5b7223b`) ·
revisore indipendente in sola lettura (Claude Code, Opus 5.5) · sessione del browser
`d20-close-find` · server `http://127.0.0.1:8879/` · prove fuori dal repository in
`~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-find/`. L'aspetto grafico non è stato
giudicato (fase dedicata successiva): qui conta solo **se una persona che conosce D&D, Owlbear e
BG3 trova la funzione, al primo colpo, nel posto naturale**. L'unico file scritto nel repository è
questa nota.

## In breve

- **Verdetto: le funzioni ci sono e quasi tutte si trovano.** Dei 40 compiti tentati senza guida
  (20 giocatore, 20 DM) **24 riescono lisci**, **15 riescono con esitazione** (etichetta ambigua,
  clic destro nascosto, passaggio in più, controllo coperto) e **1 si blocca**: il DM non può
  chiedere ai giocatori una prova **segreta**, anche se il comando lo promette.
- **Sei dei sette P1 della revisione UX del 30/09 risultano risolti** nei compiti che li
  attraversano (il settimo, lo scorrimento conservato tra le pagine, non l'ho misurato): il
  bestiario del clic destro è leggibile, «Tira» del pannello dei dadi è visibile, la barra delle
  azioni segue il turno, salire di livello conserva lingue e classe, «Concludi incontro» propone
  bottino e PE, il DM riceve il riposo da completare con «Completa per tutti».
- **Gli attriti rimasti sono di tre tipi**: (1) la **ricerca non conosce alcune etichette visibili**
  («Tempo narrativo», «Barriere», «Avvia sessione», «fine combattimento»; per il giocatore
  «compra» e «bottega» anche con la bottega aperta); (2) **azioni simmetriche con costi diversi**
  (mettere una condizione: 2 clic; toglierla dalla scheda: 5 passaggi con motivo obbligatorio);
  (3) **sul telefono** alcuni comandi finiscono fuori schermo (gestione del personaggio, comandi
  della scena dopo «Mappa», chat che copre tutto all'ingresso al Tavolo).
- **Dati coerenti tra scheda, campagna e Tavolo** in ogni passaggio verificato: livello 4 visto dal
  costruttore di incontri, slot di 2° speso sulla scheda e ritrovato al Tavolo, acquisto dalla
  bottega nell'inventario di Livia e nella notifica del DM («paga 1 mo»), pedina nascosta e
  trappola nascosta assenti dalla vista del giocatore.
- Suite `node --test design/blueprint/tests/*.test.mjs`: **2628/2628** (36,5 s; la suite è
  cresciuta rispetto ai 2582 indicati nel compito). `git status` pulito prima della nota.

## 1. Metodo

- Un solo contesto, `playwright-cli` a **1440 × 900** e **390 × 844**, ruolo cambiato con «Visita
  come». Per ogni compito sono partito dal punto naturale (Inizio, scheda o Tavolo) e ho cercato il
  comando come farebbe un giocatore esperto di D&D Beyond, Foundry, Owlbear e BG3, senza aprire
  l'aiuto. Ho letto l'albero di accessibilità e controllato gli snodi con schermate.
- **Clic** = azioni deliberate (clic, scelta in un elenco, testo); il trascinamento conta 1.
  **Liscio** = trovato al primo sguardo; **esita** = riuscito dopo un posto sbagliato, un clic
  destro non segnalato, un controllo coperto o un passaggio in più; **blocco** = non concluso.
- Ricerca: un primo giro ha dato falsi «nessun risultato» per il ritardo di battitura della
  palette; **tutti i risultati riportati sono stati ripetuti con 1,2–1,5 s di attesa**.
- Non verificati a parte: riposo lungo (stesso dialogo del breve), sintonia, concentrazione, tiri
  contro la morte, inglese, uso solo da tastiera. Nessun partecipante umano: le esitazioni sono le
  mie, non un test con persone.

## 2. I 40 compiti

### Giocatore (Livia, maga)

| #   | Compito                                  | Percorso trovato (1440)                                                                                       | Clic          | Esito  | Attrito · modello da copiare                                                                                                                                           |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Salire di livello (3 → 4)                | Inizio › card Livia › «Avanza di livello» › talento «Allerta» › «Riepilogo» › «Applica alla scheda»           | 5             | esita  | «Magie» dice «Completa» ma mostra «Trucchetti 0/4 · conosciute 0/12»; nessuna richiesta delle 2 magie del libro del mago (F6). D&D Beyond elenca le scelte del livello |
| G2  | Dardo incantato con slot di 2° (scheda)  | «Magie» › «Lancia ▾» › «2° · 2/3» › «Lancia»                                                                  | 4             | liscio | come D&D Beyond; nella scheda «Azioni» lo stesso incantesimo ha solo «Dettagli»                                                                                        |
| G3  | Stesso lancio al Tavolo, con bersaglio   | barra «Dardo incantato» › «Slot da usare: 2» › pedina › «+» ×3 › «Lancia Dardo incantato»                     | 7             | esita  | il testo resta «Distribuisci 3 dardi» mentre il tiro è 4d4 e manca «dardi assegnati 1/4» (F13). BG3 mostra il conteggio dei proiettili                                 |
| G4  | Prova di Percezione                      | «+1» accanto a Percezione                                                                                     | 1             | liscio | tiro immediato come D&D Beyond                                                                                                                                         |
| G5  | Stessa prova con vantaggio o dadi fisici | clic destro sul «+1» › finestra «Normale/Vantaggio · Digitali/Fisici»                                         | 2             | esita  | nessun segno visibile; il «…» esiste solo nel pannello dei dadi (F12)                                                                                                  |
| G6  | Mettermi Avvelenato                      | «+ Condizione» › «Avvelenato»                                                                                 | 2             | liscio | —                                                                                                                                                                      |
| G7  | Togliermi Avvelenato                     | «Danni, cure e condizioni» › «Termina» › motivo obbligatorio › «Anteprima» › «Applica»                        | 5 + testo     | esita  | la pastiglia «Avvelenato» non si clicca; dal menu della pedina basta 1 clic (F2)                                                                                       |
| G8  | Riposo breve e Dado Vita                 | «Riposa» › «Vedi inizio» › «Avvia riposo» › attesa del DM › «Riposa» › «Spendi un Dado Vita»                  | 5 + 3 del DM  | esita  | non si chiude senza il DM (scelta di regola); se parte un combattimento il riposo diventa «Terminato senza completamento» senza avviso (F16)                           |
| G9  | Dare la corda a Doran                    | «Inventario» › «Altre azioni: Corda» › «Sposta, passa o copia…» › «Doran · offerta da accettare» › «Conferma» | 5             | liscio | offerta da accettare, come gli scambi di Item Piles per Foundry                                                                                                        |
| G10 | Comprare dal mercante                    | (dopo che il DM apre la bottega) barra «Oggetti» › «Bottega» › «Compra» › «Conferma scambio»                  | 4             | esita  | prima non esiste traccia; «compra», «bottega» in ricerca: 0 risultati anche a bottega aperta (F3, F10)                                                                 |
| G11 | 2d6+3 con dadi fisici                    | «Tira i dadi» › formula › «Fisici» › due facce › «Tira 2d6 + 3»                                               | 6             | liscio | la modalità del pannello non cambia quella della barra delle azioni (F12)                                                                                              |
| G12 | Tirare l'iniziativa chiesta dal DM       | chiudere la dispensa mostrata › «Tira l'iniziativa» sulla mappa                                               | 2             | liscio | dispensa e richiesta arrivano insieme e la prima copre la seconda (F19)                                                                                                |
| G13 | Finire il turno                          | «Termina turno»                                                                                               | 1             | liscio | come BG3                                                                                                                                                               |
| G14 | Cercare «Palla di fuoco» e «Afferrato»   | lente › testo › risultato SRD                                                                                 | 3             | liscio | la ricerca distingue scheda di Iria, SRD e oggetti                                                                                                                     |
| G15 | Sussurrare al DM                         | icona «Chat» › «A: Sussurro a DM» › testo › «Invia»                                                           | 4             | liscio | l'icona della chat non ha testo (F11)                                                                                                                                  |
| G16 | Confermare la presenza alla sessione     | Inizio › «Apri sessioni» › «Partecipo»                                                                        | 2             | esita  | due gruppi «Partecipo/Forse» sulla stessa pagina («La tua presenza» e la sessione) (F15)                                                                               |
| G17 | Appunto privato                          | icona «Appunti personali» › «Nuovo appunto»                                                                   | 2             | liscio | —                                                                                                                                                                      |
| G18 | Entrare con un invito                    | Inizio › «Ho un link d'invito» › incolla › «Apri invito»                                                      | 2 + testo     | liscio | —                                                                                                                                                                      |
| G19 | Esportare il personaggio                 | «Personaggi» › «Gestisci» › «Esporta dati (JSON)» / «Scarica PDF»                                             | 3             | liscio | sul telefono «Gestisci personaggio» è fuori schermo (F7)                                                                                                               |
| G20 | Creare un personaggio                    | «Personaggi» › «Crea personaggio» › passo per passo / rapido / pronto                                         | 2 per partire | liscio | come D&D Beyond                                                                                                                                                        |

### DM

| #   | Compito                                    | Percorso trovato (1440)                                                                                                                                      | Clic          | Esito      | Attrito · modello da copiare                                                                                                                  |
| --- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Raccogliere disponibilità per una sessione | Inizio › «Apri sessioni» › «Raccogli disponibilità» › 2 × «Aggiungi alternativa» + data › «Salva bozza e aggiorna anteprima» › «Apri raccolta disponibilità» | 8             | esita      | il comando principale resta spento finché non si salva la bozza (F14). Doodle o gli eventi di Discord: aggiungi orari, «Pubblica»             |
| M2  | Invitare un giocatore                      | Inizio › «Invita giocatori» › «Crea link»                                                                                                                    | 2             | liscio     | come Roll20 e Foundry                                                                                                                         |
| M3  | Mostrare una dispensa                      | icona «Documenti» › «Mostra…» › «Mostra»                                                                                                                     | 3             | liscio     | al giocatore si apre «Il DM ti mostra…», come «Show players» di Foundry                                                                       |
| M4  | Preparare un incontro                      | Campagna › «Preparazione» › «Incontri» › «Nuovo incontro» › «Aggiungi» ×3 › scena › «Prepara nella scena»                                                    | 8             | liscio     | come il costruttore di incontri di D&D Beyond, con difficoltà 2024                                                                            |
| M5  | Disegnare la nebbia                        | «Nebbia e visione» › trascinare                                                                                                                              | 2             | esita      | «Copri tutto», «Rivela tutto» e la taglia del pennello stanno sotto la didascalia della mappa (F5)                                            |
| M6  | Piazzare una trappola                      | scudo «Strumenti del DM» › «Regioni e trappole» › trascinare › «Tipo: Trappola» › azioni › «Salva regione»                                                   | 6             | esita      | due livelli di icone senza testo; iniziato sopra i ritratti del turno il trascinamento non disegna (F11). Regioni di Foundry                  |
| M7  | Avviare il combattimento                   | «Avvia combattimento» › «Tira PNG» › (i giocatori tirano) › «Inizia combattimento»                                                                           | 3             | liscio     | come Foundry: i giocatori vedono «Tira l'iniziativa»                                                                                          |
| M8  | Condizione su un mostro                    | clic destro sulla pedina › «Condizioni» › «Prono» (un secondo clic la toglie)                                                                                | 3             | liscio     | come l'HUD delle pedine di Foundry                                                                                                            |
| M9  | Tiro segreto del DM                        | ricerca «tiro segreto» › «Tiro segreto (solo DM)», oppure «Dadi» con «Solo DM» già scelto › «Tira»                                                           | 2–3           | liscio     | —                                                                                                                                             |
| M10 | Prova **segreta** chiesta ai giocatori     | «Dadi» › «Richieste» › tipo, caratteristica, CD, destinatari                                                                                                 | —             | **blocco** | il modulo non ha «chi vede il risultato», il comando dice «anche segreta» (F1)                                                                |
| M11 | Dare bottino da un nemico vinto            | clic destro sul vinto › «Bottino» › monete › «Salva monete» › «Mostra ai giocatori»                                                                          | 5             | esita      | il pacchetto parte vuoto: l'equipaggiamento del vinto arriva solo dalla spunta di «Concludi incontro» (F17). Item Piles lo propone alla morte |
| M12 | Assegnare PE                               | ricerca «PE» o «esperienza» › «Assegna PE e monete» › PE › «Assegna»                                                                                         | 3–4           | liscio     | come «/award» di Foundry                                                                                                                      |
| M13 | Mettere un mostro sulla mappa              | clic destro sulla mappa › «Aggiungi creatura qui…» › cerca «goblin» › scelta                                                                                 | 4             | liscio     | risolto il difetto del 30/09                                                                                                                  |
| M14 | Far attaccare un mostro dell'esempio       | turno dell'Esploratore: barra con sola Scatto/Schivata/Disimpegno › «Azioni della scheda» › «Carica statistiche»                                             | 3             | esita      | nessun indizio nella barra che mancano le statistiche (F9)                                                                                    |
| M15 | Nascondere una pedina                      | clic destro › «Visibilità» › «Nascondi ai giocatori»                                                                                                         | 3             | liscio     | assente dalla vista del giocatore                                                                                                             |
| M16 | Far passare 1 h e chiudere il riposo       | «Tempo» › unità › valore › «Vedi conseguenze» › «Applica»; per il riposo: campanella › notifica › «Completa per tutti»                                       | 5 (+3)        | esita      | «tempo narrativo» in ricerca: 0; la richiesta sta in «Altre aree», non in «Richieste in attesa» (F3, F16). Simple Calendar: pulsanti «+1 h»   |
| M17 | Aprire una bottega                         | Preparazione › «Tutte» › «Mercanti» (dentro «Materiali») › Tavolo › «Oggetti» › «Bottega» › «Apri bottega»                                                   | 6–7           | esita      | i mercanti stanno sotto «Materiali»; la voce del Mondo «Negozio» non è un mercante (F10)                                                      |
| M18 | Creare un oggetto o mostro homebrew        | Biblioteca › «Crea contenuto» › tipo                                                                                                                         | 2 per partire | liscio     | come D&D Beyond                                                                                                                               |
| M19 | Nuova scena da una mia mappa               | Preparazione › «Nuova scena» › «Dalla mia immagine»                                                                                                          | 3             | liscio     | anche Universal VTT e teatro della mente                                                                                                      |
| M20 | Chiudere combattimento e sessione          | «Concludi incontro» › «Concludi incontro»; poi «Sessione» (icona orologio) risulta «Non avviata»                                                             | 2             | esita      | nessun passo ha proposto di avviare la sessione, da cui dipende la bozza del resoconto (F4)                                                   |

## 3. Attriti per priorità

Ogni voce: che cosa, come riprodurlo, quale modello copiare.

### P1 — impedisce un compito comune o promette una cosa che non c'è

**F1. Nessuna prova segreta per i giocatori.** DM al Tavolo › «Dadi» › «Richieste»: il modulo
«Chiedi un tiro» ha tipo, caratteristica, CD, modalità e destinatari, ma nessun «chi vede il
risultato». Il comando della palette dice «a uno o a tutti, anche segreta»
(`dice-tray.mjs`, `registry.add("command", { id: "…request" })`). Il caso tipico (Percezione di
gruppo senza far sapere che c'è qualcosa) non ha strada. **Copiare:** la richiesta di tiro di
Foundry con la modalità «Blind GM roll» (Monk's TokenBar) — aggiungere al modulo lo stesso gruppo
«Chi vede il risultato: Tutti / Solo DM» già presente nel pannello «Tira»; in alternativa togliere
«anche segreta» dalla descrizione.

### P2 — si riesce, ma con un passaggio sbagliato o nascosto

**F2. Togliere una condizione costa più che metterla.** Scheda di Livia: «+ Condizione» ›
«Avvelenato» (2 clic). Per toglierla la pastiglia non reagisce; bisogna aprire «Danni, cure e
condizioni» › «Termina», scrivere un motivo obbligatorio, «Anteprima», «Applica». Dal menu della
pedina al Tavolo lo stesso gesto è un clic («Un clic applica o termina la condizione, come sulla
scheda»: non è vero sulla scheda). **Copiare:** D&D Beyond (clic sulla condizione per gestirla) e
le icone di stato di Foundry (secondo clic = via); il motivo resta solo per «Correggi termine».

**F3. La ricerca non trova alcune etichette che sono sullo schermo.** Con attesa ripetuta:
«tempo narrativo», «riposi e tempo», «passa il tempo», «fai passare», «avanza tempo» → 0 (il
bottone si chiama «Tempo» e il riquadro «Tempo narrativo»); «barriere» → 0 (è il nome dello
strumento dei muri); «avvia sessione», «inizia sessione», «fine sessione», «fine combattimento»
→ 0 («concludi» trova «Avvia o concludi il combattimento»). Giocatore con la bottega aperta:
«compra», «bottega» → 0; «mercante» trova solo il luogo «Mercato coperto». Trovano bene invece
«tiro segreto», «PE», «esperienza», «sondaggio», «aggiungi creatura», «nebbia», «trappola»,
«handout», «nuova scena», «invita», «esporta». **Copiare:** la palette dei comandi di Foundry e
Obsidian, che indicizza l'etichetta visibile di ogni comando e strumento; aggiungere come
risultato «Bottega: Carro di Tessa» quando è aperta nella scena.

**F4. Si gioca senza che la sessione sia avviata.** DM: Inizio › «Entra al Tavolo», combattimento
avviato e concluso, dispensa mostrata, bottino dato; icona orologio › «Sessione» mostra «Stato
della sessione: Non avviata», e il pannello spiega che la bozza del racconto di sessione nasce
alla fine della sessione. Nessun passaggio lo propone. **Copiare:** l'avvio di sessione degli
eventi programmati (Discord, StartPlaying): all'ingresso del DM al Tavolo nell'orario
dell'appuntamento, un invito «Avvia la sessione di stasera?», oppure avvio automatico alla prima
azione condivisa.

**F5. Comandi della nebbia coperti.** DM, 1440 × 900: «Nebbia e visione» apre sotto la mappa la
barra «Rivela / Copri · Pennello / Poligono / Rettangolo / Cerchio / Quadrato»; la seconda riga
(taglia del pennello, «Copri tutto», «Rivela tutto», y 691) sta sotto la didascalia della mappa
(`.map-caption`, z 2, 222–822 × 659–727 px, `pointer-events: none`): si clicca ma non si vede
(`d11-fog-overlap.png`, `d07b-fog.png`). **Copiare:** Owlbear, dove le opzioni dello strumento
stanno in un riquadro accanto allo strumento; nascondere la didascalia quando una barra
dell'attrezzo è aperta.

**F6. Salire di livello non chiede le nuove magie del mago.** Dopo «Avanza di livello» la sezione
«Magie» è «Completa» ma dice «Trucchetti 0/4 · Magie conosciute 0/12 · Preparate 0/7» (le magie
di Livia sono «Aggiunta a mano» e non vengono contate); il riepilogo non elenca le 2 magie da
aggiungere al libro al livello 4. Dopo aver scelto «Allerta», «Capacità e talenti» passa a «Da
rivedere» senza dire cosa. Le lingue restano giuste (il P1 del 30/09 è risolto). **Copiare:** il
passaggio di livello di D&D Beyond, che elenca per il livello nuovo solo le scelte da fare («Add 2
spells to your spellbook») e conta le magie già presenti.

**F7. Telefono: gestione del personaggio fuori schermo.** 390 × 844, scheda di Livia: la striscia
in alto (`.character-breadcrumb`, 538 px in 354) nasconde a destra «Gestisci personaggio»
(esporta, privacy, elimina); la riga «Riposa · Correggi valori · Avanza di livello» nasconde
«Rivedi scelte» e «Vai al Tavolo». Nessun segno oltre al bordo tagliato di «Condividi».
**Copiare:** D&D Beyond sul telefono, con un menu «⋯ Gestisci».

**F8. Telefono: al Tavolo la chat copre tutto e i comandi della scena spariscono.** Entrando al
Tavolo con l'ultimo pannello «Chat» ricordato, il pannello riempie lo schermo, il cursore va nel
campo del messaggio (su un telefono vero si apre la tastiera) e mappa, barra delle azioni e barra
delle schede non si vedono finché non si preme ✕ (`m02b-table-390.png`). Dopo «Mappa» la pagina
scorre a 224 px e «Avvia combattimento · Scene · Riposi · Tempo» finiscono a −46 px, sopra lo
schermo (`m04-dm-map-390.png`). **Copiare:** Owlbear e Roll20 sul telefono: la mappa prima di tutto,
pannelli come fogli che non coprono mai la barra delle schede, intestazione della scena fissa.

**F9. Il mostro dell'esempio non ha attacchi al suo turno.** Combattimento, turno
dell'Esploratore: la barra mostra solo «Scatto, Schivata, Disimpegno». Gli attacchi compaiono dopo
«Azioni della scheda» › «Blocco statistiche» › «Carica statistiche» (poi PF 16, CA 13, «Spada
corta»). Nessun indizio nella barra. **Copiare:** Foundry, dove le creature SRD arrivano con le
loro azioni; in mancanza, un bottone «Carica statistiche» nella barra stessa.

**F10. Mercanti difficili da trovare, per entrambi i ruoli.** DM: «Mercanti» sta in Preparazione ›
«Tutte» › gruppo «Materiali», accanto alle dispense; la voce del Mondo di tipo «Negozio» è un'altra
cosa, senza legame con il mercante (`campaign-content.mjs` non lo collega a `merchants.mjs`).
Giocatore: la bottega esiste solo come sotto-scheda della barra «Oggetti» quando il DM la apre, e
la ricerca non la trova (F3). **Copiare:** Item Piles per Foundry (mercante sulla pedina, doppio
clic apre la bottega; qui esiste già «Sulla pedina» ma è facoltativo) e l'entità «Negozio» di Kanka
collegata al mercante; spostare «Mercanti» accanto a «Tesori» sotto un gruppo «Oggetti».

### P3 — piccole esitazioni

- **F11. Icone senza testo.** Le nove schede della barra laterale del Tavolo e gli strumenti del
  DM di secondo livello si riconoscono solo passando sopra (titolo del browser). «Tutti i
  pannelli» / «Tutti» li elenca per nome ed è un'ottima rete. Copiare Foundry, ma con l'etichetta
  mostrata anche al fuoco da tastiera.
- **F12. Modalità dei dadi in due controlli non collegati.** Al Tavolo il pannello «Dadi» impostato
  su «Fisici» lascia «Modalità dei dadi dell'azione: Digitali» nella barra; sulla scheda la scelta
  esiste solo col clic destro o con la politica dei tiri nelle Preferenze. Copiare l'unica
  impostazione dei dadi di D&D Beyond.
- **F13. Lancio ad alto livello al Tavolo.** Con slot di 2° il calcolo dice 4d4 ma il testo resta
  «Distribuisci 3 dardi» e manca un contatore dei dardi assegnati. Copiare il contatore di BG3.
- **F14. Doppio salvataggio delle bozze.** Raccolta di disponibilità e voce del Mondo: il comando
  principale («Apri raccolta disponibilità», «Salva contenuto per questi destinatari») resta
  spento finché non si preme «Salva bozza e aggiorna anteprima». Copiare il salvataggio automatico
  di Kanka o Notion e un solo «Pubblica».
- **F15. Due «Partecipo».** In «Sessioni» il giocatore vede «La tua presenza: Partecipo · Forse ·
  Salto la prossima» e, sotto, «Partecipo · Forse · Salto questa» per la stessa sessione.
- **F16. Riposo: richiesta nel posto sbagliato e fine silenziosa.** La notifica del DM «Riposo
  breve in attesa del tempo: Livia · Completa per tutti» è filtrata in «Altre aree», mentre
  «Richieste in attesa» dice «Nessun tiro o reazione in attesa». Se il DM avvia un combattimento,
  il riposo del giocatore diventa «Terminato senza completamento» e lo si scopre solo riaprendo
  «Riposa».
- **F17. Bottino del vinto vuoto.** Clic destro sulla Sentinella morta › «Bottino»: «Ancora
  vuoto»; l'equipaggiamento arriva solo con la spunta di «Concludi incontro».
- **F18. Chi controlla il DM.** Fuori combattimento, a 1440 e 390, la barra delle azioni del DM
  mostra Livia (personaggio di un giocatore). Foundry non assegna una pedina al DM finché non ne
  seleziona una.
- **F19. Due finestre insieme all'avvio.** Se il DM mostra una dispensa e poi avvia il
  combattimento, il giocatore vede prima «Il DM ti mostra…» sopra la scheda «Tira l'iniziativa».

## 4. Telefono (390 × 844)

- **Bene:** Inizio senza scorrimento orizzontale (larghezza 390); scheda a schede come D&D Beyond
  («Abilità, Azioni, Magie, Inventario… Tutte»); al Tavolo barra delle schede in basso con
  «Mappa», barra delle azioni fissa, «Termina turno» visibile in combattimento (259, 732); «Tutti»
  elenca ogni pannello per nome, con «Nella barra» e «Stacca».
- **Da correggere:** F7 (gestione del personaggio fuori schermo), F8 (chat a tutto schermo
  all'ingresso, comandi della scena sopra lo schermo dopo «Mappa»). Gli avvisi in basso coprono per
  qualche secondo la barra delle schede (`m05-combat-390.png`).

## 5. Ricerca: che cosa trova

| Trova (primo risultato utile)                                                                | Non trova (0 risultati o solo voci estranee)                                                                          |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| «palla di fuoco», «afferrare», «goblin» (SRD e PNG della campagna)                           | «tempo narrativo», «riposi e tempo», «avanza tempo», «passa il tempo», «tempo di gioco»                               |
| «tiro segreto», «chiedi tiro», «pausa», «orologio»                                           | «avvia sessione», «inizia sessione», «fine sessione», «fine combattimento»                                            |
| «PE», «XP», «esperienza», «assegna» → «Assegna PE e monete»                                  | «barriere» (strumento dei muri); «luci» trova l'importazione Universal VTT e due incantesimi, non lo strumento «Luci» |
| «sondaggio», «disponibilità» → «Sessioni: sondaggi e presenze»                               | giocatore: «compra», «bottega» (anche a bottega aperta); «mercante» → solo il luogo                                   |
| «aggiungi creatura», «nascondi pedina», «nebbia», «trappola», «muri» (generatore)            | giocatore: «negozio» → solo comandi di creazione                                                                      |
| «nuova scena», «carica mappa», «invita», «esporta», «homebrew», «handout», «sali di livello» | «bestiario» → solo «Cosa vedono i giocatori» (il bestiario si trova con «aggiungi creatura»)                          |

## 6. Rispetto alla revisione UX del 30/09

Verificati come risolti durante i compiti (sei P1 su sette; lo scorrimento conservato tra le
pagine non l'ho misurato): bestiario di «Aggiungi creatura qui…» leggibile
(M13); «Tira 1d20» visibile nel pannello dei dadi a 1440 (G11); la barra delle azioni passa alla
creatura di turno (M14); l'avanzamento conserva «Comune, Elfico, Draconico» e «Maga · Livello 4»
(G1); «Concludi incontro» propone il bottino dei vinti e il totale dei PE (M20); il DM riceve il
riposo in attesa con «Completa per tutti» (M16); la ricerca conosce «segreto», «PE» e
«sondaggio». Restano aperti, con forma diversa: il riposo del giocatore legato al DM (G8, ora
spiegato), le etichette solo a icona (F11), la modalità dei dadi in più controlli (F12).

## 7. Prove

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/close-find/` (fuori dal
repository): schermate del giocatore `p00`–`p15`, del DM `d00`–`d11`, del telefono `m00`–`m06`;
`search-neg.txt` con le ricerche ripetute con attesa. Stato di esempio modificato solo nel
`localStorage` del browser della sessione `d20-close-find`, chiusa alla fine.
