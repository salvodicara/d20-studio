# Blueprint visuale — stato della costruzione

## Candidata completa — sintesi per la valutazione dell'owner

**Stato: candidata completa, in attesa della valutazione dell'owner. Non è approvata.** La
versione è identificata dal [manifest](../../changes/interview-01/blueprint-candidate-manifest.json)
del 01/10/2026 (impronta sha256 di ogni file di `design/blueprint/`, di `docs/interview/*.md` e di
`docs/NEXT.md`): il manifest identifica, non approva. Il gate di
[BLUEPRINT_CONTRACT](BLUEPRINT_CONTRACT.md#accordo-e-fissazione-della-versione) resta invariato:
la baseline si fissa solo dopo un'approvazione esplicita dell'owner.

### Come visitarla

Dalla radice del worktree `~/Workspace/Codex/d20-studio-interview-01`:

```sh
python3 changes/interview-01/blueprint-checks/serve-nocache.py
```

Aprire [http://127.0.0.1:8879/](http://127.0.0.1:8879/). La barra della dimostrazione, fuori
dall'app, ha «Visita come» (Giocatore o DM), «Cosa è pronto» (oggi «48 pronte · 0 da costruire ·
0 con errori») e «Ripristina esempio». Dati sintetici, salvati solo in quel browser. Le date
dell'esempio seguono il giorno della visita (`sample-clock.mjs`: nessuna data è nel futuro della
visita e «Il sigillo della torre» è sempre il giovedì successivo alle 20:30); il calendario del
mondo di gioco è indipendente. Interfaccia in italiano, inglese in Preferenze.

### Che cosa contiene, area per area

Architettura completa, con il prodotto copiato per ogni struttura, in
[NAVIGATION](NAVIGATION.md#architettura-dellinformazione-della-candidata); aspetto in
[DESIGN.md](../../design/blueprint/DESIGN.md).

| Area         | Dove                               | Che cosa c'è                                                                                                                                                                                                                                                                             | Modello                       |
| ------------ | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| Inizio       | intestazione › Inizio              | «Continua a giocare» con l'immagine della campagna, prossimo appuntamento nella propria ora, il proprio personaggio, «Dove eravamo rimasti», accesso rapido, campagne, discussioni, «Trova un tavolo», novità, guide e supporto; per il DM la prossima sessione e la Preparazione        | Roll20 «My Games», D&D Beyond |
| Personaggi   | intestazione › Personaggi          | elenco (proprie, della campagna e affidate), creazione a sezioni o rapida, personaggi pronti, ricostruzione a metà avventura, avanzamento e revisione; scheda a sette categorie con la stessa Livia di Tavolo e campagna                                                                 | D&D Beyond                    |
| Campagna     | intestazione › Campagne › campagna | barra laterale a cinque gruppi (Campagna, Racconto, Ambientazione, Gioco, Gestione DM; «Strumenti» per il giocatore), «Entra al Tavolo»; sessioni reali, diario, mondo, membri, sicurezza, impostazioni, dati, integrazioni, assistente                                                  | Kanka, World Anvil            |
| Preparazione | campagna › Preparazione (DM)       | quattro gruppi: Scene (scene, regioni e trappole, movimento e griglia), Incontri, Materiali (materiali, tabelle e mazzi, tesori, mercanti), Scaletta e avventure                                                                                                                         | Foundry, Roll20               |
| Tavolo       | «Entra al Tavolo»                  | mappa con attrezzi a sinistra, barra laterale a sezioni con sotto-schede a destra, hotbar in basso, ritratti di turno in alto in combattimento, menu della pedina a sottomenu, menu «Sessione» del DM; combattimento, reazioni, condizioni, riposi, esplorazione, dadi fisici e digitali | BG3, Owlbear, Foundry, Roll20 |
| Biblioteca   | intestazione › Biblioteca          | Disponibili, La mia Biblioteca, Campagna, Le mie creazioni, Pacchetti di compatibilità, Compendio SRD 5.2.1, Immagini e file; editor homebrew con revisioni                                                                                                                              | D&D Beyond, Foundry compendi  |
| Servizi      | intestazione, a destra             | Cerca (⌘K, comandi e sinonimi), Appunti personali, Notifiche e richieste, Preferenze, Aiuto, stato della connessione, Account e profilo; al Tavolo anche il menu «App» e «Torna alla campagna»                                                                                           | Foundry, Alchemy, D&D Beyond  |

### Numeri e prove

| Misura                    | Valore                                                                                                                                                                                                                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aree                      | core più 48 aree registrate (B12–B60; B31 è solo stile), B11 registro, B61–B62 struttura e architettura dell'informazione                                                                                                                                                                                 |
| Capacità del censimento   | 528: **511 PROVEN** (13 solo test Node, 15 simulazione), **1 PARTIAL** (X-05), **10 OPEN-DECISION**, **6 EXCLUDED**; stato e file di prova per riga in [CAPABILITY_CENSUS](CAPABILITY_CENSUS.md#totali-dellelenco)                                                                                        |
| Test Node                 | `node --test design/blueprint/tests/*.test.mjs`: **2628/2628** il 30/09 dopo le correzioni finali (219 file di test)                                                                                                                                                                                      |
| Percorsi del browser      | 189 script in [blueprint-checks](../../changes/interview-01/blueprint-checks/README.md). Ultimo giro completo 188/188 (1519 esiti) il 30/09, prima delle correzioni finali; dopo le correzioni 70/70 percorsi delle aree toccate, compreso il nuovo `final-fixes-journey.js`                              |
| Audit per area (25–26/09) | 14 file su 519 capacità, da utente alla prima visita ([audit](../../changes/interview-01/audit/))                                                                                                                                                                                                         |
| Re-audit (27/09 e 29/09)  | delle 231 righe che non funzionavano, 192 funzionavano dopo P1–P10 ([reaudit](../../changes/interview-01/audit/reaudit.md)); il re-audit 3 ha ricontrollato le righe dei pacchetti R1–R8 e i suoi residui sono stati corretti lo stesso giorno ([residui](../../changes/interview-01/audit/residuals.md)) |
| Revisione di completezza  | 93 capacità: 85 funzionanti, 7 parziali e 1 inciampo, tutti corretti dopo; un programma ha premuto 6979 comandi su 198 superfici: nessun errore di pagina, 10 comandi senza effetto visibile (residuo F9) ([rapporto](../../changes/interview-01/final-review-completeness.md))                           |
| Revisione di privacy      | riservatezza verificata con 60 testi segreti dell'esempio e canarini per ruolo; 1 P1 (l'espulso leggeva le schede) corretto ([rapporto](../../changes/interview-01/final-review-privacy.md))                                                                                                              |
| Revisione UX              | 40 compiti da utente nuovo: 21 lisci, 15 con esitazione, 4 bloccati; tutti i P1 e i P2 corretti tranne il riposo del giocatore (Q164) ([rapporto](../../changes/interview-01/final-review-ux.md), [correzioni](../../changes/interview-01/final-fixes.md))                                                |

### Limiti noti e simulazioni dichiarate

- **Simulazione locale.** Due identità nello stesso browser («Visita come») e membri d'esempio;
  nessun account, server, sincronizzazione o rete reali. La riservatezza è un filtro al momento
  del disegno: per il prodotto reale vale la regola «ogni identità riceve solo la propria
  proiezione» di [BLUEPRINT_CONTRACT](BLUEPRINT_CONTRACT.md#regola-per-il-prodotto-reale-ogni-identità-riceve-solo-la-propria-proiezione).
- **Simulazioni dichiarate** ([I-233](DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate)):
  assistente IA senza modello (anche il «modello locale»), integrazioni (Discord e Avrae,
  calendario, API e webhook, moduli per campagna), tavoli pubblici e moderazione, catalogo
  pubblico dell'homebrew, dadi connessi («Simula il lancio»), pacchetti di compatibilità.
  Generatori e grafo delle relazioni funzionano in locale, inclusi su delega. Le decisioni per il
  prodotto reale sono in [NEXT](../NEXT.md).
- **Prove.** Chromium di Playwright su macOS, dati sintetici, nessun dispositivo reale, nessun
  lettore di schermo, nessun test con persone; dadi digitali casuali. La regressione di tutti i
  189 percorsi dopo le correzioni finali non è ancora stata eseguita.
- **Residui dichiarati** ([correzioni finali](../../changes/interview-01/final-fixes.md#non-corretto-con-la-ragione)):
  dieci comandi o invii vuoti senza messaggio sotto il campo (F9), preferenze delle notifiche in
  due posti (X-05), ritocchi UX F23–F27, domande Q164–Q168 in [OPEN](OPEN.md). Il testo di «Cosa
  è pronto» descrive ancora i limiti dell'incremento 10 («Il contratto completo è ancora in
  costruzione…»).
- **Aspetto.** Sistema visivo in [DESIGN.md](../../design/blueprint/DESIGN.md), copiato dai
  prodotti di riferimento; nome, marchio e rifinitura finale restano fasi successive.

## Storico della costruzione (23–30/09/2026)

Le sezioni che seguono sono il registro storico degli incrementi, conservato con le date e i
limiti di allora; lo stato corrente è la sintesi qui sopra. Il cortile e l'accampamento sono
schemi geometrici originali: non recuperano il guado o design-01 ritirati.

## Matrice iniziale dei percorsi verificati

Le lacune di questa prima matrice sono aggiornate dagli incrementi 2–10 sotto;
non descrivono come assente una funzione successivamente collegata.

| Percorso / stato                                  | Comandi ed esito dimostrati                                                                                                                               | Contratto e provenienza conservata                                                                                                                                   | Prova osservata                                                                                                        | Ancora da coprire                                                                                                                        |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Inizio → campagna → Tavolo → scheda, giocatore/DM | Navigazione globale/locale, scheda della stessa identità, ritorno al Tavolo senza reset                                                                   | [NAV](NAVIGATION.md) NAV-01–04/07/09–11: Beyond, Foundry, Kanka, WAI, R176–178                                                                                       | Browser core e gestures: HP comuni e conservati dopo reload; IT/EN; touch da Inizio a Inventario                       | Più campagne, inviti, ricerca completa, richieste non combattimento, pop-out, pannelli simultanei                                        |
| Personaggi → Azioni/Inventario                    | Creazione manuale, modifica, correzione PF motivata; oggetto aggiunto/editato/equipaggiato; tiro caratteristica digitale/fisico                           | [CRE](CHARACTER_CREATION.md), [INV](INVENTORY_FLOW.md), NAV-04; Beyond sezioni scheda e Foundry Play/Edit/Items                                                      | Test modulo; core browser: inventario condiviso col Tavolo                                                             | Builder guidato, fonti/revisioni, abilità/competenze, ADV/HB completi, import/export                                                     |
| Inventario → pozione su sé                        | Preview; digitale casuale oppure consumo e tiro fisico pendente; riapertura senza doppio consumo; 2d4+2 e limite PF; undo distinto di risultato/tentativo | INV-06/11, I-026–030, SRD 5.2.1 2024 già conservato nel corpus                                                                                                       | Core browser: facce 1/2 + 2 = 5, PF 18→22; correzione conserva prima il consumo poi restituisce l'oggetto; test modulo | Altri consumabili, bersagli, cariche, munizioni, contenitori, trasferimenti, bottino, sintonia                                           |
| Scheda → Magie/Capacità/Storia/Extra              | Annotazioni manuali, contatori, storia e promemoria futuro privato; nessun effetto dedotto dal testo                                                      | [MAG](SPELLCASTING_FLOW.md), NAV-04/09, I-057/I-175                                                                                                                  | Test di disponibilità manuale, piano separato per identità e legacy; review privacy distinta                           | Repertorio casting completo, preparazione per capacità, configurazione slot per livello, concentrazione, piano strutturato e avanzamento |
| Tavolo, esplorazione/turni                        | Trascina/clic libero; preview senza consumo; ESC; fermata al budget con tratto rosso; undo; pan e zoom; selezione NPC al DM                               | [Movimento](TABLE_MOVEMENT.md), I-196/I-199–201, R164/R166–168: Foundry, Owlbear e precedenti dichiarati                                                             | Core/gestures browser: tastiera, drag, arresto a 9 m, cancellazione, pan; test stato                                   | Terreni/diagonali/regole spaziali, muri/luci/sensi, reazioni, waypoint, gruppi/formazioni, gesture touch complete                        |
| Tavolo → Misura / dadi / registro                 | Misura separata dal budget; dado digitale o faccia fisica + modificatore; registro e correzione; iniziativa preparata nel percorso dedicato sotto         | TABLE e I-026–030; nessun motore iniziativa completo dedotto                                                                                                         | Core: 8+2=10 nel registro; measure browser: misura non sposta; test turno iniziale                                     | Reazioni, richieste concorrenti causali, turni completi e correzioni selettive                                                           |
| DM → Preparazione → scena                         | Vuota/preset/file; nome, note private/pubbliche, dimensioni, griglia/scala/offset; anteprima; salvataggio, copia, eliminazione protetta                   | [Preparazione](pages/preparation.md), [ricerca scene](../../changes/interview-01/scene-editor-research.md): Foundry Scenes/Compendium, Owlbear Scenes/Aligning a Map | 11 test modulo; browser crea/salva/calibra, input file non valido, annulla/scarta, Back del browser protegge bozza     | Calibrazione diretta, editor geometrie/asset, varianti incontri, sottogruppi, mappe multilivello, collezioni complete                    |
| DM → Rivela / Attiva → giocatore                  | Rivela materiale consultabile senza note DM; attiva separatamente la scena salvata senza avviare combattimento                                            | NAV-06, I-165, SC-R01/R02/R10/R11; distinzione Foundry/Owlbear adattata                                                                                              | Preparation browser: pubblicazione separata da attivazione, vista giocatore senza nota privata, scena vuota gestita    | Destinatari individuali/sottogruppi, trasporto pedine e split-party, autorità completa                                                   |
| Servizi / stato locale                            | Appunti per identità, offline simulato blocca mutazioni condivise, storage non disponibile segnalato; ultimo undo locale con audit                        | NAV-09/10 e vincoli privacy/rete dell'intervista                                                                                                                     | Core browser note separate/offline; test storage corrotto non sovrascritto; review distinta                            | Backend, conflitti/revoche, correzioni selettive dipendenti, bozze globali, cronologia persistente                                       |

I riferimenti sono quelli già raccolti, con date/versioni/limiti nelle tabelle
originali; in questo incremento non sono stati attribuiti nuovi test runtime
ai concorrenti. Note dettagliate dei moduli: [Personaggi](../../changes/interview-01/blueprint-characters-evidence.md)
e [Preparazione](../../changes/interview-01/blueprint-preparation-evidence.md).

## Verifica e limiti delle evidenze

- Suite Node: stato, personaggi e preparazione. I report aggiornati e i comandi
  sono in [blueprint verification](../../changes/interview-01/blueprint-verification.md).
- Prove browser ripetibili in [blueprint-checks](../../changes/interview-01/blueprint-checks/README.md):
  percorsi collegati, mouse/tastiera, Back, EN/IT e navigazione/dialog touch.
- Screenshot desktop 1440×1000 e telefono 390×844, con review distinta di
  leggibilità/navigazione. Non sono un test screen reader o una prova completa
  di ogni dispositivo. Nessun test umano del gruppo è stato inventato.
- Approssimazioni dichiarate: geometria basata sul centro pedina, ruoli/rete
  simulati. L’incremento4 collega muri/porte/terreno espliciti; i segni nel preset
  non sono automaticamente muri eseguibili. La griglia ha aggancio della destinazione; geometria discreta e
  arresto su casella al budget rimangono da completare.
- Undo usa snapshot locali della visita, con ultimo autore e registro; non è
  undo distribuito né ripristino della pila undo dopo reload; le evidenze dei tiri accettati restano persistenti. Persistenza
  locale e prove di visibilità non dimostrano autorizzazione server.
- Scene: limite raster dimostrativo 1 MB, nessun upload remoto; anteprima
  pubblica del contenuto distinta da visione simulata di una creatura.

## Incremento 2 — combattimento e incontro preparato

23/09/2026, I-219/R186. Il medesimo Tavolo ora collega questi casi alla scheda,
alle risorse e alle pedine, senza rappresentare l'intero motore 2024.

| Percorso / controllo                          | Conseguenza provata                                                                                                                                             | Fonte / contratto                                                                      | Limiti ancora aperti                                                                         |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Scegli arma/trucchetto → punta → clic         | Preview libera, digitale al clic senza conferma aggiuntiva; fisico al tentativo dichiarato, facce naturali inseribili dopo                                      | I-016/I-025/I-026; TABLE_ACTIONS, SRD 5.2.1, Foundry dnd5e Activities e precedenti BG3 | Avvicinamento prima dell'attacco, tutte le armi/capacità, animazioni dei dadi e tempi        |
| Mani brucianti → orienta → posiziona → Lancia | Cono fermo mentre si raggiunge il comando, alleati inclusi, danno comune e TS individuali; uno slot al lancio, nessun secondo consumo alle risposte             | SRD EN16/114, TABLE_ACTIONS/MAG; R186                                                  | Bordi/volume, muri/coperte, sensi, oggetti incendiati, resistenze e reazioni                 |
| Dardo incantato → assegna dardi → Lancia      | Bersagli ripetibili, quantità modificabili, assegnazione fissata prima delle facce; d4+1 per dardo con dettaglio per bersaglio                                  | I-219: lettura 2024 esplicita, SRD EN146, non chiarimento editoriale separato          | Concentrazione, istanze di danno speciali, altre capacità multibersaglio                     |
| Scatto / Schivata / Disimpegno                | Destinazione libera; Scatto spende azione soltanto oltre budget ordinario. Altre azioni senza tiro artificiale; effetti e scadenze specifici                    | I-017; SRD EN180–181 / IT207/214/215                                                   | Reazioni di opportunità, varianti, terreni, Nascondersi e altre azioni                       |
| Tiri e risultati → risolvi → correzione       | Richieste persistenti e controllore, critici/TS/breakdown; undo restituisce conseguenze e riapre richiesta conservando facce precedenti come annullate          | I-028/I-029; contratto dei risultati e registro                                        | Undo distribuito/selettivo, causalità di tutte le richieste, segreti e gruppi reali          |
| DM → pedine/PNG → incontro preparato          | Posiziona/trascina, nuovo PNG e copia indipendente; rimuovere pedina conserva scheda; naturale+bonus/digitale/ordine; salvataggio distinto da attivazione/avvio | Preparazione, ricerca scene Foundry/Owlbear, SRD iniziativa; evidenza encounter        | Scheda attacchi PNG completa, generatore/bilanciamento, ondate, sottogruppi e scene multiple |
| Iniziativa → rilancia / scarta / annulla      | Risultati conservati privatamente; rilancio aggiunge; undo marca annullato, non ripristina automaticamente il tiro; offline non genera dadi                     | I-026/I-028, registro persistente adattato al contratto                                | Iniziativa remota per più partecipanti, deleghe e tie resolution automatica                  |
| Layout desktop / telefono EN/IT               | Azione nel pannello contestuale; su telefono barra adiacente alla mappa e accessi persistenti Mappa/Dettagli mossa; input fisici utilizzabili al touch          | Adattamento responsive dichiarato, stessa grammatica                                   | Tutti i viewport, touch complesso/pinch e tecnologie assistive                               |

[Dominio](../../changes/interview-01/blueprint-combat-domain.md),
[ricerca primaria](../../changes/interview-01/blueprint-combat-research.md) e
[incontri](../../changes/interview-01/blueprint-encounters-evidence.md)
conservano i dettagli. Le forme del preset non sono ancora muri eseguibili.
Livia ha un profilo dimostrativo esplicito; il nome libero di una classe non
inventa competenze o magie. Le nuove creature non ereditano le sue capacità.

Prove browser: combattimento fisico/critico/undo/reload, cono con alleato,
dardi/Scatto/Schivata, EN/touch e ciclo PNG/iniziativa. La review distinta ha
corretto ripresa modalità fisica, dati numerici incompleti, privacy della
sorgente, stabilità del cono, conservazione dei dadi e accessi mobile.
I risultati e i controlli finali sono nel [rapporto](../../changes/interview-01/blueprint-verification.md).

## Incremento 3 — reazioni e movimento collegati

I-220/R187 documentano l'adozione delegata e le fonti. Non è ancora tutto il
combattimento né il contratto completo. Il medesimo Tavolo ora collega:

| Percorso                | Comandi e risultato                                                                                                                                 | Prova e confini                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DM → Preparazione → PNG | Crea/Duplica/Attacco e disposizione: nome, portata, bonus, dadi, modificatore, tipo; alleato/neutrale/ostile separato dai permessi; bozza e Salva   | Test di conflitti e risorse; browser PNG nuovo neutrale di default, ostilità esplicita e opportunità al Tavolo. Un profilo in mischia, non repertorio completo |
| Movimento → opportunità | Fermata prima dell'uscita, distanza già percorsa, richiesta al controllore; dadi fisici/digitali                                                    | Browser vero clic/drag e tastiera; ricarica mantiene evento; centro-pedina e linea retta uniformi                                                              |
| Colpo → Scudo           | Scegli → slot → Usa Scudo; oppure Rinuncia/Riduci/Esc. +5 CA e durata visibili, costi solo uso                                                      | Browser uso e rinuncia, nessun danno prima della scelta; test nat20, Missile, slot/turno, retry, autorità digitale                                             |
| Danno → concentrazione  | PF già aggiornati; richiesta con effetto, CD e formula; facce fisiche o digitale. Nuova istanza/termine volontario chiudono solo dipendenze vecchie | Browser fallimento, Esc/reload e nessuna ripresa prematura; test handler per sostituzione/effetti e dati da correggere                                         |
| Esito → ripresa         | Mancato/rinuncia: stesso percorso automaticamente. Dopo danno: Continua movimento o Cambia mossa senza rimborso                                     | Browser cambia strategia dopo danno, resta possibile scegliere un'altra azione; test ripresa e morte esplicita                                                 |
| Occasioni simultanee    | Scegli ordine, Anticipa/Posticipa, Applica; una risposta causale per volta. Fonte riservata: coordinamento DM spiegato                              | Browser due nemici, riordino, rinunce sequenziali; test privacy e handler. Nessuna coda globale, nessun timeout dedotto dal silenzio                           |
| EN e schermo piccolo    | Stessi comandi e risultati, nessun overflow della richiesta a 390×844; mappa e barra restano consultabili                                           | Prova browser e screenshot letti; numeri di movimento formattati, precisione del dominio conservata                                                            |

La concentrazione della scheda si registra come **effetto già in corso** con
fonte/motivo; non simula un nuovo lancio o consumo. Livia espone un repertorio
dimostrativo esplicito, e correggere la preparazione delle magie collegate
aggiorna il repertorio; testo libero non genera regole eseguibili.

[Dominio](../../changes/interview-01/blueprint-reactions-domain.md),
[review dominio](../../changes/interview-01/blueprint-reactions-review.md),
[review UI](../../changes/interview-01/blueprint-reactions-ui-review.md) e
[verifica](../../changes/interview-01/blueprint-verification.md) distinguono
prove effettive e limiti. La navigazione globale e le famiglie ancora aperte
rimangono quelle del brief; questi casi non chiudono le relative famiglie.

## Incremento 4 — scene geometriche e avvicinamento

23/09/2026, I-221/R188. [Ricerca primaria](../../changes/interview-01/blueprint-spatial-research.md)
con 17 fonti e SRD EN/IT; Foundry, Arms Reach, Owlbear, Roll20 e Larian con
core/moduli/adattamenti distinti. Nessun concorrente dichiarato provato dal vivo.

| Percorso / comando                     | Esito dimostrato                                                                                                                      | Prova e limite                                                                          |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| DM → Preparazione → Muro/Porta/Terreno | Clic-clic, drag, tastiera, proprietà indipendenti, estremi, elimina/undo; salvataggio e conflitti                                     | Test editor e percorso browser spatial8; nessuna deduzione automatica dalla grafica     |
| Calibra scala                          | Due punti, misura nota, proposta visibile → applica bozza → salva                                                                     | Editor/browser; piani prospettici/rotazione non simulati                                |
| Tavolo → porta                         | Dettaglio, portata configurabile, stato/a chiave, costo prima interazione/Utilizzare, controllo DM; muro intermedio impedisce accesso | Porte5 test, browser desktop/mobile; segreti omessi nella proiezione locale             |
| Pianifica percorso                     | Tappe private per scena/ruolo/creatura, modifica/rimuovi, Esc/Esegui; costo terreno distinto dalla distanza; undo                     | Browser spatial8, touch6; costo doppio non cumulativo per sovrapposizione               |
| Bersaglio in mischia fuori portata     | Preview percorso+attacco; clic avvia solo sequenza raggiungibile; nessuno Scatto implicito                                            | Dominio e browser approach7/touch6; grafo discreto, nessuna promessa di ottimo continuo |
| Arrivo fisico / digitale               | Digitale prosegue con autorizzazione originaria; fisico attende dichiarazione del tiro, persiste e consente Cambia mossa              | Browser reload/undo, callback review per bersaglio spostato durante dialog              |
| Avvicinamento interrotto               | Opportunità lungo tappe/costi; Continua/Cambia conservano tratto e danni; cambiamenti geometrici invalidano seguito                   | Suite dominio e regressione browser reazioni; altre reazioni restano aperte             |

Suite complessiva **145/145**. Nuovi browser **8+7+6** verifiche riuscite,
IT desktop e EN touch, più regressioni pertinenti descritte in
[verifica](../../changes/interview-01/blueprint-verification.md).
Review [spaziale](../../changes/interview-01/blueprint-spatial-review.md) e
[UI](../../changes/interview-01/blueprint-spatial-ui-review.md) hanno chiuso
sette rilievi circoscritti, senza P1/P2 residui dimostrati nello snapshot esaminato.
Hash dei file dirty, non approvazione di una candidata completa o di un SHA.

Restano: ingombri/taglie, diagonali a griglia, luci/fog/sensi completi, coperture
parziali, altri movimenti e reazioni, selezione tra pedine sovrapposte e
leggibilità delle etichette affollate su telefono. La verifica touch prova i
comandi descritti, non una completa qualità mobile. Proiezioni locali non
provano sicurezza server o sincronizzazione fra partecipanti.

## Incremento 5 — creazione, ricostruzione e avanzamento collegati

Il medesimo artefatto offre ora Personaggi → Crea/Ricostruisci → bozza privata
→ Riepilogo → scheda → Avanza/Rivedi. Nessuna scheda entra automaticamente
nella campagna, nella scena o nell'iniziativa. Il collegamento alla campagna
è un comando distinto con destinatari e controllo spiegati prima di applicare.
I-222/R189 conservano adozione delegata, fonti e limiti.

| Percorso / stato                | Comandi ed esito dimostrati                                                                                                                                                                   | Riferimento / regola                                                            | Prova                                                                                                                                                 | Ancora da coprire                                                                                     |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Personaggi → Crea, personale    | Sezioni direttamente navigabili; identità facoltativa; classi/livelli, background/specie, caratteristiche, competenze, capacità, magie, equipaggiamento e storia; Riepilogo applica una volta | CRE, Beyond builder/scheda, Foundry Advancement; SRD 5.2.1 EN/IT, R189          | Browser crea Mira guerriero1, 12 PF, scelte e oggetto manuale; nessun equipaggiamento automatico, ingresso in campagna o pedina                       | Catalogo completo, tutti i privilegi di livello/sottoclasse/specie, homebrew riusabile e liste estese |
| Bozza privata / cambio identità | Salva, Riprendi, Scarta; uscita protegge modifiche non salvate; reload conserva la bozza; altro ruolo non può leggerla                                                                        | CRE/ADV, Roll20 bozza; privacy adottata nel contratto                           | Browser uscita/resta/salva/reload; cambio ruolo scarta solo lavoro non salvato; prove dominio/handler                                                 | Più identità reali, sincronizzazione, revoche distribuite, editor collaborativi                       |
| Caratteristiche e dadi          | Serie standard, 27 punti con costo visibile, 4d6 scartando il minore digitale/fisico, valori manuali con fonte; tiri accettati persistenti privati                                            | SRD 5.2.1, breakdown e correzioni I-028/029                                     | Browser rifiuta facce mancanti, conserva 6/5/2/1→13 e quattro facce digitali dopo reload; overspend non applicabile; test inversioni                  | Altri metodi configurabili e politiche di campagna complete                                           |
| Scheda → Storia/risorse         | Aspetto, biografia e annotazioni distinti; contatori, slot per livello e Patto separato; eccedenza conservata se il massimo scende; concessione/caratteristica magica riconoscibili           | CRE/ADV/MAG, I-067; riuso istanze con provenienza                               | Browser modifica biografia e Second Wind offline sulla scheda personale; test doppia concessione, risorsa sconosciuta e JSON reload                   | Tutte le concessioni/azioni automatizzate, riposi completi, condizioni speciali                       |
| Ricostruisci una scheda         | Dati noti e storia ignota distinti; riconoscimento esplicito degli aspetti mancanti; PF, slot e Dadi Vita già spesi conservati                                                                | CRE, flessibilità I-060/061; R189                                               | Browser Iria mago3: 8/22 PF, 2 temporanei, slot1 usati2, slot2 usato1, DV usato1; niente dadi o oggetti inventati                                     | Ricostruzione di ogni origine e prerequisito; import di formati esterni                               |
| Scheda → Avanza/Rivedi          | Bozza separata, confronto e applicazione sullo stato attuale; nessun riposo, rimborso o dotazione iniziale ripetuta; correzioni indipendenti conservate                                       | ADV, Foundry Advancement, Beyond level management; merge dichiarato adattamento | Browser Mira1→2: maxPF12→20, PF attuali corretti a2 durante la bozza restano2, Second Wind usato1, biografia e inventario conservati; review distinta | Progressioni complete, trasformazioni, riconciliazioni avanzate e piano futuro strutturato            |
| Personale → Campagna            | Collega esplicitamente, lettura/controllo coerenti; DM non legge la scheda privata né la piazza conoscendone l'ID                                                                             | NAV/CRE e matrice privacy                                                       | Browser DM senza accesso, ritorno proprietario e collegamento; test piazzamento/filtri                                                                | Inviti e controllori multipli, trasferimenti fra campagne e revoche                                   |

La presenza delle dodici classi nel selettore **non** significa progressioni
complete. Il catalogo contiene strutture e concessioni iniziali, più scelte
specifiche successive; le parti non enumerate sono segnalate. Accettare una
scheda con aspetti da verificare non chiude quelle lacune del blueprint.
Molte capacità rimangono descrittive/manuali senza comando eseguibile al Tavolo.

Suite complessiva finale **191/191**. Quattro percorsi browser CRE/ADV/dadi/ricostruzione
verificati con **5+3+5+3 gruppi di asserzioni**, più 3 casi di recupero dopo
cambio classe/background e tiro incompleto; regressioni core 13 e reazioni 8. I numeri contano controlli raggruppati, non feature complete.
Screenshot desktop e mobile EN ispezionati; browser mobile qui verifica
impaginazione/navigation a 390px, non una nuova prova touch della creazione.
Review distinta di dominio, shell e UI con hash dirty; dettagli e limiti in
[verifica](../../changes/interview-01/blueprint-verification.md).

## Incremento 6 — Biblioteca e copie sulla scheda, checkpoint verificato

I-223/R190 conservano adozione e fonti. Moduli collegati nella medesima app;
non è la chiusura completa di HB o della candidata. I tre report indipendenti
sono chiusi nel loro perimetro;245 test e sei percorsi browser/15 gruppi passano.

| Percorso                                         | Risultato già osservato                                                                                                                                                  | Prova e limite                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Biblioteca → crea → accessi → abilita → aggiungi | Bozza privata distinta da contenuto; DM non legge una creazione non condivisa; revisione esatta abilitata separatamente, copia con consumi espliciti                     | Browser `library-journey`: nessun attore modificato dal salvataggio, usi2 su massimo3 all'assegnazione                           |
| Scheda → fonte/revisioni → confronta → applica   | Nuova revisione non cambia la copia; revisione leggibile non abilitata confrontabile ma non applicabile; massimo3→4 conserva usi2 dopo reload                            | Stesso percorso browser; conflitti, riserve rimosse e dipendenze hanno test dominio e review distinta                            |
| Builder → cerca/crea → torna alla scelta         | Stessa bozza e sezione, nome conservato, nessun attore cambiato; ripetere il ritorno non duplica il contenuto                                                            | Browser `library-builder-journey`:3 gruppi, filtro compatibile disattivabile per consultare senza selezionare tipi incompatibili |
| File locale → importa/export                     | Download effettivo; JSON malformato e formato non supportato non applicano contenuti; anteprima e import di revisione già presente lasciano attori/definizioni invariati | Browser `library-files-journey`:2 gruppi; formato proprio versione1, nessun importatore terzo rivendicato                        |
| Offline simulato → crea privato / condividi      | Creazione privata salvata localmente; modifica accessi condivisa respinta                                                                                                | Stesso percorso file; non è sincronizzazione remota o offline completo                                                           |
| Telefono/desktop EN                              | Tocchi reali su creazione, anteprima, salvataggio e revisioni; uscita dirty/Esc conserva testo; nessun overflow a390/1440px                                              | Browser `library-mobile-journey`:3 gruppi, immagini ispezionate. Nessun test screen reader dichiarato                            |

Raccordi con ADV: aggiornamento di una sola concessione, storico dei consumi
anche dopo rimozione/riselezione e nuova verifica all'ingresso nella campagna.
Review del raccordo ha corretto due casi e riverificato65 test mirati;
dominio/UI hanno chiuso altri cinque rilievi di ACL, risorse e letture
asincrone. Nel browser sono verificati anche rimozione/reload/riselezione
di una magia ottenuta da due fonti e una lettura di file interrotta da una
nuova bozza sporca. I report [dominio](../../changes/interview-01/blueprint-homebrew-domain-review.md),
[raccordo](../../changes/interview-01/blueprint-homebrew-integration-review.md),
[UI](../../changes/interview-01/blueprint-library-review.md) e
[verifica](../../changes/interview-01/blueprint-verification.md) conservano
hash, riproduzioni e limiti; non attestano la candidata completa.

Rimangono da collegare attività homebrew eseguibili, concessioni/progressioni
complete, prova isolata di regole, pubblicazione/moderazione, media/allegati,
formati esterni e policy completa di revoca. La voce del tipo classe/sottoclasse
è consultabile manualmente: non è un editor di progressione già completato.
Le altre famiglie in REFERENCE_COVERAGE restano interamente nel Goal.

## Incremento 7 — campagna, diario, mondo e sessioni collegati

I-224/R191; contratto dettagliato in [CAMPAIGN_FLOW](CAMPAIGN_FLOW.md).
304 test, sei percorsi browser/14 gruppi e regressione core13 passano;
review indipendente chiusa nel perimetro. È un checkpoint, non l'intera app.

| Percorso / stato                        | Comandi e risultato verificato                                                                                                                      | Fonte e limite                                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Campagna → resoconto → luogo → Tavolo   | Leggi resoconto, collegamento, torna alla voce, consulta scena; stesso stato di gioco                                                               | R191, Foundry Journal e strumenti di worldbuilding; browser World2                                          |
| Tavolo/scheda/creazione → Appunti       | Nuova nota, bozza privata, salva, applica, modifica, storico, ripristina come revisione nuova; ritorno alla stessa scelta anche via Biblioteca      | R191; Notes3/Integration2; DM senza accesso a Solo io                                                       |
| Voce → condivisione/sezioni             | Lettura, modifica e delega distinti; anteprima destinatario limitata a ciò che l'autore può leggere; storico privato non retroattivamente condiviso | Adattamenti privacy dichiarati; Sharing3, review R1/R2/R5; sezioni ereditano diritto di modifica della voce |
| Modifiche concorrenti / offline         | Bozza conservata, confronto e riapplicazione esplicita; scrittura privata locale, applicazione condivisa bloccata offline                           | Concorrenza simulata tramite API, nessun realtime provato                                                   |
| Sessioni → appuntamento o disponibilità | Data concordata, bozza, conferma, cambio/annullamento; risposte personali sì/forse/no/ritiro; consenso non conferma da solo                         | R191; Sessions2; nessun invio calendario o notifica esterna                                                 |
| Fusi / telefono / EN                    | Ora locale e concordata entrambe identificate; ora ripetuta da scegliere, ora inesistente respinta; tocchi reali e nessun overflow390/1440          | Mobile2 con New York/Roma; lingua del contenuto conservata                                                  |
| Accesso revocato / Undo del gioco       | Hub/lista/ricerca/sidebar non espongono gruppo; note proprie recuperabili; Undo non ripristina ACL o cancella testi/sessioni                        | Integration2 e test stato; non certifica autorizzazione completa di ogni vecchio modulo                     |

Rimangono inviti e più identità, gestione amministrativa, collaborazione remota,
media/allegati, mappa/calendario del mondo e tutte le capacità non dimostrate.
Impostazioni le dichiara ancora incomplete, senza pulsanti finti di gestione.

## Incremento 8 — riposi, tempo e recuperi collegati

I-225/R192; [contratto del percorso](REST_TIME_FLOW.md).375 test Node,
quattro percorsi browser/11 gruppi e regressione core13 passano. Review distinta
R1–R4 chiusa nel perimetro; i report conservano hash e riproduzioni.

| Percorso / stato                | Comandi e risultato verificato                                                                                                      | Fonte e limite                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Scheda/Tavolo → Riposa/Riposi   | Partecipanti espliciti, breve/lungo, attività, anteprima e avvio senza cura; il non partecipante resta invariato                    | Beyond header, Foundry D&D5e e Rest Recovery; Shared3                                     |
| DM → Tempo → completamento      | Orologio comune, requisiti e recuperi per risorsa; sonno e concentrazione; otto ore ordinarie,4h effettive Trance,16h fra lunghi    | SRD5.2.1/R192; Time3 e test del dominio, senza calendario o alba completi                 |
| Dadi Vita → fisico/digitale     | Spesa al tentativo, chiusura/reload e faccia pendente, validazione, breakdown, Undo/riapplicazione stesso risultato                 | Shared3; nessun reroll implicito; Arcane distinto e alias slot coerente                   |
| Recupero rapido / correzione    | Ordine e massimo totale scelti, ogni faccia fisica attesa, arresto al limite/media; motivo obbligatorio per correzione              | Rest Recovery più I-090–092; Mobile4, non algoritmo universale                            |
| Iniziativa / round / Undo       | Evento reale interrompe riposo e concede benefici maturati; round completo+6s; Undo ripristina tempo e risorse insieme              | Time3, adapter esistenti; non deduce un'ora di sforzo da qualsiasi movimento              |
| Undo fino a rimuovere il riposo | Storico di dado annullato raggiungibile anche dopo reload, senza comando per applicarlo                                             | Reversed1, review R4; faccia e risultato conservati separatamente dall'effetto            |
| Personale/offline/revoca        | Riposo personale locale senza clock campagna; condiviso bloccato offline; membership corrente e storia privata preservate dopo join | Mobile4 e regressioni review R1/R3; due identità locali non provano sicurezza distribuita |
| EN/IT, tastiera e touch         | Escape chiude senza perdere tentativi, input errato conservato, comandi raggiungibili a390px senza overflow                         | Browser reale e immagini ispezionate; nessun test screen reader dichiarato                |

Rimangono calendario/alba, riduzioni strutturate, provviste e attività dettagliate,
eventi preparati, sintonia/identificazione e l'intero catalogo delle eccezioni.
Le regole BG3/Solasta non sostituiscono i recuperi2024. Le prove di alcune
politiche non certificano tutti i recuperi della futura app.

## Incremento 9 — forme e creature collegate

I-226/R193; [contratto del percorso](FORMS_COMPANIONS_FLOW.md).461 test Node,
cinque percorsi browser/12 gruppi, core13, creazione5 e avanzamento3 passano.
Review dominio, profilo, UI e raccordi chiuse nei rispettivi perimetri;
controllo visuale distinto di tre immagini. Non completa l’intera famiglia.

| Percorso / stato                          | Comandi e risultato verificato                                                                                                                  | Fonte e limite                                                                         |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Extra/Tavolo → Forma Selvatica            | Forma nota, oggetti/PF temporanei, preview gratuita, applicazione e ritorno conservano risorse vive; Undo distinto                              | SRD2024/R193; Forms2, catalogoGatto/Ratto/Lupo dimostrativo                            |
| Forma → scheda/raccolta/Tavolo            | CA, velocità, caratteristiche/difese e attacco naturale effettivi; oggetti fusi indisponibili, danno fisso visibile senza dado inventato        | Test effettivi e browser Forms; bonus oggetti/salti/scalata ancora dichiarati parziali |
| Extra → compagno manuale → mappa          | Nuovo attore senza token; collocazione successiva gratuita, click/tastiera/Escape; stessa scheda dopo reload                                    | Foundry Actors/Tokens, Beyond Extras, Owlbear; Companion2                              |
| Trova Famiglio → attività → completamento | Slot o rituale, libro/preparazione correnti, tempo e concentrazione, incenso reale, comparsa valida; costo finale e collocazione distinti       | Familiar3; simulazione clock esplicita, nessun tempo reale automatico                  |
| Compagno Selvatico → gestione             | Esattamente risorsa scelta, nessun attacco, congedo/ricomparsa senza doppio costo; lungo del solo genitore                                      | Mobile3 e lifecycle6, regole2024; telepatia/sensi/consegna magie ancora aperti         |
| Personale → connessione alla campagna     | Anteprima e consenso per la sola scheda della creatura; genitore personale non rivelato, token non implicito                                    | Personal2, fix reviewR1; non condivide gli altri compagni                              |
| Eventi/permessi/Undo                      | PF temporanei non cancellano TSconcentrazione; scomparsa nel proprio turno avvia il successivo una volta; revoca impedisce lettura/comandi/dadi | Test/review indipendenti, storia privata conservata dopojoin; non backendACL           |
| EN/IT/touch/tastiera/offline              | Preview, Apply, Escape, posizionamento, congedo e ritorno; condiviso bloccato offline                                                           | Browser390/1440 e immagini; nessun test screenreader completo                          |

Pack Tactics e Agile sono applicati dai consumer; Prono del Morso è segnalato
nel dettaglio della mossa e rimane da automatizzare. Metamorfosi, cavalcature,
altri compagni/effetti, sensi e catalogo completo non sono esclusi dal Goal.
Report, riproduzioni e hash sono nella [verifica](../../changes/interview-01/blueprint-verification.md).

## Incremento 10 — condizioni e sopravvivenza

I-228/I-229/I-234/R194; [contratto del percorso](CONDITIONS_FLOW.md). Tre passate
di correzione al 24/09/2026: review regole e UX (1 P1, 9 P2, 28 P3), poi
[chiusura dei residui](../../changes/interview-01/blueprint-conditions-closure.md),
poi le review distinte dell'incremento 10 (1 P1, 4 P2, 3 P3) e di B11b
([correzioni](../../changes/interview-01/blueprint-b11b-inc10-fixes.md)). Nessun
P1/P2 noto resta aperto; il ritmo dei TS fuori iniziativa è deciso in I-234.

**Checkpoint del 24/09/2026:** **649/649 test Node**
(`d20-blueprint-evidence/2026-09-24/B11b-fix/suite.log`). Browser dell'ultima
passata, zero errori di pagina: `registry-smoke` 18/18, `core` 13/13,
`conditions` 11/11, `conditions-death` 7/7, `dice-correction` 7/7,
`b11b-inc10-fixes` 11/11, sonda della review B11b con i valori attesi. Nella
chiusura (632 test): `conditions-mobile` 3/3, `rest-time` 3/3, `forms` 2/2,
`builder` 5/5, `builder-advance` 3/3, `conditions-fixes` 7/7,
`conditions-badges` 2/2. Manutenzione degli script: `preparation` 9/9,
`gestures-and-views` 8/8, `measure` 2/2. **Checkpoint non chiuso:** mancano la
review distinta del candidato di correzioni (hash nel rapporto) e il manifest10.

| Percorso / stato                          | Comandi e risultato verificato                                                                                                                                                                                                                            | Fonte e limite                                                                                         |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Scheda/Tavolo → Condizioni e stato        | Scheda: un solo ingresso «Danni, cure e condizioni» nella carta PF; Tavolo: riepilogo nell'ispettore prima di Forme; badge Morto/Morente/Stabile/numero sulle pedine; stesso stato dopo reload                                                            | P03/P04/P05 in R194; badge sul bordo con colore per stato, solo applicazioni condivise, solo Chromium  |
| Aggiungi/Termina → origini                | Ricerca IT/EN fra 15 condizioni, origine e termine, anteprima senza mutazione, Applica una volta; due origini ×2 con una penalità; Termina con motivo lascia l'altra; Undo ripristina la stessa origine                                                   | SRD EN 179/IT 206; P01/P02/P07; termini sul clock e sui turni, nessun timer reale                      |
| Indebolimento / motivi del tiro           | Stepper da tastiera e tocco: livello 2 = −4 d20, −3 m, Velocità 9→6 m; motivi con fonte a distanza reale; «Tiro normale» quando si annullano; fallimento FOR/DES senza dado                                                                               | SRD EN 181, 186, 191; effetti d'iniziativa manuali con promemoria; Spaventato sulle prove resta avviso |
| Prono → strisciare / Rialzati             | Trascinamento reale: 1,5 m costa 3 m; «Rialzati · 4,5 m» spende metà Velocità da 6 m a 1,5 m, azione e Scatto invariati; disabilitato con motivo a Velocità 0                                                                                             | SRD EN 186/179, IT 212/216; arrotondamento in piedi dichiarato                                         |
| Danno / cura / PF temporanei / correzione | Eventi vitali unici; temporanei non sommati con scelta tieni/sostituisci; cura che non resuscita e lascia Prono; pozione negata a chi è Incapacitato; motivo obbligatorio con errore sul campo                                                            | SRD EN 17–18/IT 19–20; P05 Roll20; Correggi rifiuta 0 PF e massimo 0; alleato a 0 PF ancora via Cura   |
| 0 PF → TS contro la morte → Stabile/Morto | Danno 18: Morente, Privo di sensi + Prono senza tiro; un solo TS per inizio turno reale nella coda Richieste, fisico o digitale; Medicina 15 di Mira: Stabile e azione spesa; 1 naturale e danno a 0: Morto su pedina e scheda, Cura disabilitata; reload | SRD EN 17–18/IT 19–20; P08 BG3; fuori iniziativa su richiesta (I-234); Undo riusa la faccia (I-229)    |
| Colpo non letale / Morso del Lupo         | Casella nell'anteprima di mischia: 1 PF, causa knockout propria, Prono, riposo breve avviato; fine riposo, cura o pronto soccorso chiudono solo il knockout. Morso: Prono se la taglia nota è Media o inferiore                                           | SRD EN 17/IT 19, EN 364/IT 394; scelta chiesta prima dell'attacco; taglia ignota = riconciliazione     |
| Dadi → Undo / Riapplica / riuso           | Attacco digitale in due passi: Undo ritira i dadi e lascia l'azione spesa; correzione motivata 15→20: 1d10→2d10 conserva la faccia 2 e chiede solo il dado mancante; secondo Undo rimborsa; ritentativo identico «Riusato»                                | I-229; storico di correzioni e facce sostituite; corrispondenza per gruppi di facce uguali             |
| Privacy / permessi / offline              | Origine privata del DM assente dal DOM dopo cambio ruolo, riga condivisa di registro; «Effetto riservato» per chi non vede; PF e conteggi solo a chi legge la scheda; offline condiviso senza coda, input conservati                                      | Ruoli e rete simulati localmente; nessuna autorizzazione server                                        |
| EN/IT, tastiera, tocco, telefono          | 390 px EN: aggiunta, stepper, chiusura con bozza senza effetti, danno 18→0 al Tavolo con indicatori 0/3; Esc e Annulla lasciano lo stato identico                                                                                                         | Nessun test con screen reader                                                                          |

Chiusi dopo le review: politica a 0 PF (`characterZeroHpPolicy`) per ogni
personaggio del builder; badge con stile proprio; termine del compagno rimosso
nel suo turno; Dado Vita e riposo lungo come cura (chiudono il knockout); Undo
che non concede un nuovo tiro vitale; facce vitali personali nascoste al DM dopo
il collegamento; un solo TS per inizio turno; Correggi che rifiuta 0 PF e
massimo 0; script `forms-journey` e `builder-advance-journey` sul pannello.

Restano obblighi, non esclusioni: pozione somministrata a un alleato, Spaventato
sulle prove, raccolta che spenda l'interazione, iniziativa automatica, distanza
del soccorso, trascinamento di Afferrato, immunità/resistenze ai danni, danni
periodici, resurrezione, applicazione interamente privata dal pannello, immunità
e taglia dei personaggi del builder. Dado Vita durante un knockout e compagno
rimosso sono provati da test di dominio, non da un percorso browser. Resta da
allineare [TABLE_ACTIONS](TABLE_ACTIONS.md) a I-229.

## B11 — registro delle aree

24/09/2026, [I-235](DECISIONS.md#i-235--costruzione-parallela-per-aree-registrate-e-censimento-del-mercato);
[piano e API](../../changes/interview-01/blueprint-registry-plan.md),
[integrazione](../../changes/interview-01/blueprint-registry-integration.md),
[correzioni dopo la review](../../changes/interview-01/blueprint-b11b-inc10-fixes.md).
È un'infrastruttura: **non aggiunge capacità B12–B60** e non ne dichiara
nessuna presente. Che cosa rende possibile:

- ogni area del backlog si costruisce come modulo proprio, registrato una volta,
  e compare nell'unica app (pagine e voci di menu, sezioni di campagna, scheda,
  Preparazione e Biblioteca, strumenti, pannelli e livelli del Tavolo, blocchi
  di Inizio, impostazioni, notifiche, ricerca, scorciatoie) senza modificare i
  file condivisi; così più costruttori lavorano in parallelo;
- lo stato di ogni area viaggia con la stessa partita salvata: reload, Undo e
  «Ripristina esempio»;
- un'area rotta resta nel proprio spazio con un messaggio semplice; «Cosa è
  pronto» elenca aree con errori, pronte e ancora da costruire.

Prove: test del registro e della shell (senza aree il markup del core è
identico byte per byte), `registry-smoke-journey` 18/18 con aree di prova e
`b11b-inc10-fixes-journey` 11/11. All'integrazione il report diceva «0 pronte ·
48 da costruire · 0 con errori». Limiti: un 404 in console per ogni area non
costruita; eventi e impostazioni solo locali; aree provate soltanto con le
fixture; solo Chromium.

## Prossimo incremento nello stesso artefatto

Il checkpoint 10 si chiude con la review distinta del candidato di correzioni e
il manifest10. B11 è integrato; la costruzione segue il backlog del
[censimento delle capacità](CAPABILITY_CENSUS.md#d-backlog-di-costruzione-del-blueprint):
ondata 1 di ampiezza B12–B30 in parallelo, ondata 2 di profondità B32–B55,
più B56 (dadi animati, I-232) e le simulazioni dichiarate B57–B60 (I-233). B31
(veste provvisoria migliorata e logo d20) è facoltativo e dipende da B22. Ogni
area resta nello stesso artefatto, con prove e limiti propri; lo stato qui si
aggiorna solo alla chiusura verificata di ciascuna.

Lo stile attuale non è approvato; UX, gerarchia e interazioni devono già essere
definite. La baseline si congela solo dopo l'approvazione esplicita dell'owner
della candidata completa. Continuità del passaggio a Claude:
[handoff](../../changes/interview-01/HANDOFF_CLAUDE.md).

## Stato al 30/09/2026 — candidata completa e correzioni finali

Sostituito dalla [sintesi della candidata](#candidata-completa--sintesi-per-la-valutazione-dellowner)
in cima a questo file, che corregge anche i conteggi della stesura del 30/09 (cinque PARTIAL già
funzionanti nel re-audit 3, le MISSING diventate OPEN-DECISION).
