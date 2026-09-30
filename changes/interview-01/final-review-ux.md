# Revisione finale: UX, fedeltà visiva e intuitività del blueprint

30/09/2026 · worktree `d20-studio-interview-01` (ramo `codex/interview-01`, HEAD `f7ef92d` più
il lavoro non committato del ramo) · revisore indipendente in sola lettura (Claude Code, Opus
5.5) · sessione del browser `d20-final-ux` · server `http://127.0.0.1:8879/` · prove fuori dal
repository in `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/review-ux/` (cartella indicata
dal compito). Solo dati di esempio, azzerati nei contesti di prova. L'unico file scritto nel
repository è questa nota.

## In breve

- **Verdetto: buono nell'impianto, non ancora «intuitivo senza guida».** Dei 40 compiti tentati
  da utente nuovo (20 giocatore, 20 DM) **21 riescono lisci**, **15 riescono con esitazione o
  costo in più** (controlli sotto la piega, percorsi nascosti, doppie conferme) e **4 si
  bloccano o fanno danno**: salire di livello cancella dati, il riposo del giocatore non si
  chiude senza il DM, il bestiario dal menu della mappa è illeggibile.
- **Sette difetti P1** (sezione 4): l'avanzamento di livello perde le lingue e riscrive la
  classe; il bestiario di «Aggiungi creatura qui…» ha il titolo largo 0 px; in combattimento
  l'ordine di turno copre «Sessione», «Pausa» e «Nascondi scena»; ogni cambio di pagina
  conserva lo scorrimento della pagina precedente; la hotbar non passa al personaggio di turno;
  la riga di stato della mappa finisce sotto la hotbar; il bottone «Tira» del pannello dei dadi
  sta 700–800 px sotto la parte visibile.
- **Fedeltà ai riferimenti**: scheda ↔ D&D Beyond, HUD ↔ BG3, attrezzi ↔ Owlbear, campagna ↔
  Kanka coincidono nell'aspetto. Gli scarti veri sono di **densità e di ordine** (la barra laterale
  del Tavolo lascia 77 px alla chat; incantesimi e inventario mettono i comandi prima della lista)
  e di **comportamento** (tiro con finestra di conferma, hotbar che non segue il turno).
- **Punteggio Nielsen 25/40 («accettabile»)**, sotto il 30/40 della «Critica 2»: questa revisione
  misura compiti completi da utente nuovo, non superfici, e trova tre regressioni nuove.
- Suite `node --test design/blueprint/tests/*.test.mjs`: **2582/2582** (22,5 s). Nessuna modifica
  al codice, ai test o ai percorsi.

## 1. Metodo

**⚠️ ESECUZIONE RIDOTTA: un solo contesto** (in questo flusso non c'è uno strumento per
sotto-agenti). La revisione di progetto (A: compiti, confronto con i riferimenti) è stata scritta
prima di leggere il rilevatore (B); da ripetere, se serve, con due sessioni separate.

- Skill **impeccable**, playbook `critique` (euristiche di Nielsen, carico cognitivo, persone),
  `context.mjs --target design/blueprint`: nessun `PRODUCT.md`, `DESIGN.md` come autorità.
  Istantanea `.impeccable/critique/` **non scritta** (revisione in sola lettura). Domande
  all'owner in sezione 9 invece che in chat.
- **Utente nuovo che conosce D&D, Owlbear e BG3**, nessuna guida letta: per ogni compito ho
  guardato la schermata, scelto il controllo più probabile, contato clic e scorrimenti, annotato
  esitazioni e vicoli ciechi. **1440×900** con il mouse (`playwright-cli`, sessione
  `d20-final-ux`, schermate e letture del DOM) e **390×844** con il tocco (contesti separati
  `hasTouch`/`isMobile`, script `scripts/part-*.js` che misurano per ogni controllo posizione,
  dimensione, copertura con `elementFromPoint` e scorrimento necessario).
- Riproduzioni pulite da dati azzerati per i difetti di dati (`scripts/verify-levelup.js`) e per i
  percorsi restanti (`scripts/verify-misc.js`); tema chiaro controllato sul Tavolo.
- Rilevatore impeccable: CLI su `design/blueprint` (ridotto a espressioni regolari: moduli di
  parsing assenti) e **rilevatore del browser iniettato da Playwright** (`addScriptTag`, nessun
  file del repository toccato) su cinque pagine. Il `live-server` della skill non è stato usato:
  inserisce un tag nei file del progetto.
- Limiti: Chromium su macOS, nessun dispositivo reale, nessun lettore di schermo; dadi digitali
  casuali; il «primo utente» è simulato da chi ha letto il contratto, quindi le esitazioni
  contate sono un limite inferiore.

## 2. Punteggio

| #   | Euristica (Nielsen)        | Voto      | Motivo principale                                                                                                                                           |
| --- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stato del sistema          | 3         | anteprime, «PF 7 → 2» nel menu, «5 danni · PF 18 → 13»; ma la pozione non dice quanto cura e ogni tiro dà tre segnali (dadi 3D, riquadro, avviso)           |
| 2   | Linguaggio del mondo reale | 2         | termini SRD corretti, ma costruttore e riposi parlano da sviluppatori: «Concessione annotata», «il nome di una capacità non inventa automazioni», «Preview» |
| 3   | Controllo e libertà        | 3         | Annulla ovunque, Esc, «Annulla solo questa voce»; il riposo del giocatore resta sospeso finché il DM non fa passare il tempo                                |
| 4   | Coerenza e standard        | 2         | modalità dei dadi in tre controlli diversi; «Mondo», «Materiali», «Sessioni», «Diario» nominano cose diverse; lo scorrimento resta tra le pagine            |
| 5   | Prevenzione degli errori   | 2         | l'avanzamento si applica con una spunta sopra dieci avvisi e perde le lingue; una scelta obbligatoria senza opzioni («Maestria · 0/1»)                      |
| 6   | Riconoscere, non ricordare | 2         | «Tira» del pannello dei dadi e «Solo DM» sotto la piega; «Chiedi un tiro» dentro Chat → Dadi → Richieste; «Sessione» è un orologio come «Tempo»             |
| 7   | Flessibilità ed efficienza | 3         | palette ⌘K con comandi, scorciatoie, barra rapida, preferiti; mancano sinonimi («bottino», «segreto»)                                                       |
| 8   | Estetica e minimalismo     | 2         | piede della barra laterale di ~220 px, sotto-schede su tre righe, preamboli prima di incantesimi e inventario, sovrapposizioni sulla mappa                  |
| 9   | Riconoscere e correggere   | 3         | rifiuti con motivo («I PF sono già 7», «esegui nel tuo turno»)                                                                                              |
| 10  | Aiuto e documentazione     | 3         | aiuto per pagina e palette; ma i suggerimenti della mappa finiscono sotto la hotbar                                                                         |
|     | **Totale**                 | **25/40** | **Accettabile** (62 %)                                                                                                                                      |

**Carico cognitivo: alto (5 voci su 8 non rispettate).** Fuoco unico (Tavolo: fino a sei lastre
sovrapposte), gruppi ≤ 4 (menu della pedina 13 voci, «Tutti i pannelli» 22), scelte minime (tre
bottoni per ogni incantesimo; 20 controlli prima dell'inventario), una cosa alla volta (riepilogo
del livello con dieci avvisi), svelamento progressivo (regola d'ingombro nell'inventario del
giocatore). Tengono: gerarchia visiva, raggruppamento, memoria di lavoro.

## 3. I 40 compiti

Legenda: **liscio** = trovato al primo sguardo, clic pari o inferiori al riferimento; **esita** =
riuscito dopo ricerca, scorrimento lungo o una conferma in più; **blocco** = non concluso o con
danno ai dati. Clic contati dal punto di partenza naturale (Inizio, scheda o Tavolo). «Scorr.» =
pixel di pagina da scorrere a 390 px prima del controllo.

### Giocatore

| #   | Compito                          | Percorso trovato (1440)                                                   | Clic 1440 | 390: tocchi · scorr.                    | Esito      | Nota                                                                                                              |
| --- | -------------------------------- | ------------------------------------------------------------------------- | --------- | --------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------- |
| P1  | Aprire la mia scheda             | card «Il tuo personaggio» in Inizio                                       | 1         | 1 · 722                                 | liscio     | sul telefono la scheda si apre a metà (scorrimento conservato, F4)                                                |
| P2  | Prova di Percezione              | numero «+1» → finestra → «Tira»                                           | 2         | 3 · 1350 (pagina «Abilità»)             | esita      | D&D Beyond tira al clic sul numero; qui una conferma in più (F10)                                                 |
| P3  | Subire 5 danni                   | quantità → «Danno» nel riquadro PF                                        | 2         | 2 · 0                                   | liscio     | come D&D Beyond; il riquadro cresce di 23 px con il messaggio                                                     |
| P4  | Mettermi Prono                   | «+ Condizione» → «Prono»                                                  | 2         | 2 · 21                                  | liscio     | griglia IT/EN chiara                                                                                              |
| P5  | Dardo incantato con slot di 2°   | Magie → «Lancia ▾» → «2°» → «Lancia»                                      | 4         | 4 · 2376                                | esita      | lista ~1250 px sotto la scheda; livello scelto due volte; i danni non si tirano fuori dal Tavolo                  |
| P6  | Salire di livello (3 → 4)        | «Avanza di livello» → talento → Riepilogo → spunta → «Applica»            | 5         | ingresso visibile                       | **blocco** | perde Elfico e Draconico, «Mago 4 · Livello 4», Allerta ignorata, «Maestria 0/1» vuota (F1, F13)                  |
| P7  | Riposo breve con Dadi Vita       | «Riposa» → «Vedi inizio» → «Avvia riposo» → attesa del DM                 | 3 + DM    | ingresso visibile                       | **blocco** | nessun Dado Vita spendibile finché il DM non fa passare 1 h (F12)                                                 |
| P8  | Riposo lungo                     | come P7 con «Riposo lungo»                                                | 4 + DM    | —                                       | **blocco** | «mancano 8 h», stesso vincolo                                                                                     |
| P9  | Bere una pozione                 | Inventario → «Bevi» → «Bevi · esegui»                                     | 3         | 3 · 2787                                | esita      | 20 controlli prima degli oggetti; l'avviso non dice quanto ha curato (F10, F23)                                   |
| P10 | Tirare 2d6 liberi                | «Tira i dadi» (piede della barra) → d6 ×2 → «Tira 2d6»                    | 4         | 3 · 798                                 | esita      | il bottone di tiro è 700 px sotto la parte visibile del pannello (F7)                                             |
| P11 | Tiro con dadi fisici             | finestra del tiro → «Fisici» → facce → «Tira»                             | 3 + facce | —                                       | liscio     | funziona; il controllo cambia forma tra scheda, pozione e Tavolo (F17)                                            |
| P12 | Andare al Tavolo                 | «Vai al Tavolo» / «Entra al Tavolo»                                       | 1         | 1 · 0                                   | liscio     | —                                                                                                                 |
| P13 | Muovere la pedina                | trascinare Livia                                                          | 1         | trascinamento                           | liscio     | copertura mostrata, distanza no; sul telefono la scena non si adatta dopo «Mappa» (F18)                           |
| P14 | Attaccare e finire il turno      | «Dardo di fuoco» → goblin → «Termina turno»                               | 3         | 3 (+ scorrimento laterale della hotbar) | esita      | «Nessun modificatore» sul bersaglio contro «svantaggio» nel pannello; al turno di Mira la hotbar resta Livia (F5) |
| P15 | Misurare una distanza            | «Misura e sagome» → trascinare                                            | 1         | 2 (gruppo attrezzi chiuso)              | esita      | la spiegazione dell'attrezzo è sotto la hotbar; l'etichetta copre il nome della pedina (F6, F24)                  |
| P16 | Prossima sessione nel calendario | «Aggiungi al calendario» in Inizio (sondaggio: Sessioni → «Partecipo»)    | 1         | 1 · 492                                 | liscio     | come Roll20                                                                                                       |
| P17 | Rileggere la dispensa mostrata   | Campagna → gruppo «Mondo» → «Materiali» → «Apri»                          | 3         | 3 · 0                                   | esita      | «Materiali» dentro un gruppo chiuso che si chiama come la sezione «Mondo» (F17)                                   |
| P18 | Nota privata                     | icona «Appunti personali» → «Nuovo appunto»                               | 2         | 2 · 0                                   | liscio     | —                                                                                                                 |
| P19 | Sussurrare al DM                 | Chat → «A: Sussurro a DM» → «Invia»                                       | 3         | 3 · 0                                   | esita      | la cronologia della chat è alta 77 px a 1440 (F8)                                                                 |
| P20 | Creare un personaggio            | «Crea personaggio» → «Percorso rapido» (classe, background, specie, nome) | ~10       | ingresso visibile                       | liscio     | copia fedele del quick build di D&D Beyond; il passo per passo si apre scorso di 210 px (F4)                      |

### DM

| #   | Compito                          | Percorso trovato (1440)                                        | Clic 1440 | 390: tocchi · scorr.           | Esito      | Nota                                                                                        |
| --- | -------------------------------- | -------------------------------------------------------------- | --------- | ------------------------------ | ---------- | ------------------------------------------------------------------------------------------- |
| D1  | Invitare un giocatore            | «Apri campagna» → «Invita giocatori» → «Crea link»             | 3         | 2 · 0                          | liscio     | come D&D Beyond                                                                             |
| D2  | Fissare una sessione             | Sessioni → «Data già concordata»                               | 2 + form  | 2 · 0                          | liscio     | come Roll20 (serie ricorrenti comprese)                                                     |
| D3  | Preparare un incontro            | Preparazione → Incontri → «Nuovo incontro» → «Aggiungi»        | 4+        | 4 · 766                        | esita      | sul telefono tre strisce di navigazione impilate, contenuto da y≈820 (F19)                  |
| D4  | Mettere una creatura sulla mappa | clic destro → «Aggiungi creatura qui…»                         | 2         | —                              | **blocco** | titolo largo 0 px, ricerca e lista 1232 px sotto (F2); funziona Scena → «Aggiungi creature» |
| D5  | Avviare il combattimento         | «Avvia combattimento» → «Tira tutti» → «Inizia combattimento»  | 3         | 3 · 0                          | liscio     | come Foundry; Allerta ignorata nell'iniziativa (F13)                                        |
| D6  | Passare il turno                 | «Termina turno»                                                | 1         | 1 · 0                          | liscio     | le notifiche in basso a destra lo coprono (F14)                                             |
| D7  | Ferire un goblin                 | clic destro → «PF: -5» → Invio                                 | 2         | 2 (pressione lunga)            | liscio     | «PF 7 → 2» e annullamento nello stesso menu: ottimo                                         |
| D8  | Condizione su un mostro          | clic destro → «Condizioni ›» → scelta                          | 3         | 3                              | liscio     | —                                                                                           |
| D9  | Tiro segreto                     | «Tira i dadi» → scorrere a «Solo DM» → scorrere a «Tira»       | 3         | 3 · 800 (radio sotto la barra) | esita      | opzione e bottone sotto la piega; la palette non conosce «segreto» (F7, F16)                |
| D10 | Chiedere una prova con CD        | «Tira i dadi» → «Richieste» → tiro, caratteristica, CD → invia | 5         | 5                              | esita      | nascosto sotto l'icona della chat (F16)                                                     |
| D11 | Dare bottino e PE                | palette «assegna» → «Assegna PE e monete»                      | 3         | —                              | esita      | «bottino» non lo trova; «Concludi incontro» non lo propone (F16)                            |
| D12 | Mostrare una dispensa            | barra laterale «Diario» → «Materiali» → «Mostra…»              | 3         | 3 · 0                          | esita      | «Materiali» due volte (pillola e scheda) (F17)                                              |
| D13 | Disegnare la nebbia              | «Nebbia e visione» → «Nebbia» → trascinare                     | 2         | 3                              | esita      | barra delle opzioni sospesa in basso a sinistra, tre scelte accese insieme (F25)            |
| D14 | Nascondere una pedina            | clic destro → «Visibilità ›» → nascondi                        | 3         | 3                              | liscio     | —                                                                                           |
| D15 | Cambiare scena                   | «Scene» → «Attiva per il gruppo»                               | 2         | 2 · 0                          | liscio     | cinque bottoni oro nella stessa finestra (F17)                                              |
| D16 | Nuova scena                      | Preparazione → «Nuova scena»                                   | 2 + form  | 2 · 0                          | liscio     | —                                                                                           |
| D17 | Chiudere il combattimento        | «Concludi incontro» → «Concludi»                               | 2         | 2 · 0                          | liscio     | nessuna proposta di PE o bottino                                                            |
| D18 | Scrivere il resoconto            | Diario → «Nuovo resoconto»                                     | 2         | 2 · 0                          | liscio     | —                                                                                           |
| D19 | Mettere in pausa                 | icona orologio «Sessione» → «Pausa»                            | 2         | 2 · 0                          | esita      | in combattimento a 1440 le prime tre voci sono sotto l'ordine di turno (F3)                 |
| D20 | Creare un oggetto homebrew       | Biblioteca → «Crea contenuto» → tipo                           | 3         | 2 · 0                          | liscio     | —                                                                                           |

## 4. Difetti per priorità

Ogni voce: che cosa, come riprodurlo, quale modello copiare. Prove nella cartella indicata sopra
(`shots/`, `shots/phone/`, `logs/`).

### P1 — da correggere prima di chiudere il blueprint

**F1. Salire di livello cancella e altera la scheda.** Dati azzerati, Livia (Maga 3): «Avanza di
livello» apre il costruttore già su «Capacità e talenti» (scorso di 210 px), con «Maestria · 0/1»
obbligatoria e **nessuna opzione** (`builder-choices` vuoto), «Background e specie»,
«Competenze» e «Magie» in rosso «Da rivedere». Il riepilogo elenca come «Privilegi nuovi»
Incantesimi, Adepto dei rituali, Recupero arcano e Studioso (livelli 1–2) e dieci «Limiti e
verifiche» estranei al livello; si applica solo spuntando «Confermo la scheda con gli aspetti da
verificare». Dopo «Applica»: lingue **«Comune, Elfico, Draconico» → «Comune»** (anche la chat:
«Livia capisce: Comune»), `className` `{it: "Maga"}` → `{it: "Mago 4"}` («Mago 4 · Livello 4»
nell'elenco, «Mago 4 4» nel gruppo), iniziativa +2 anche con Allerta (vedi F13).
`scripts/verify-levelup.js`, `logs/verify-levelup.raw`, `shots/p06-*.png`. **Copiare** D&D Beyond
(Manage Level Up: solo le scelte del livello nuovo, il resto della scheda intatto) e BG3 (schermata
di avanzamento con i soli passi del livello e «Avanti»).

**F2. Bestiario del menu della mappa illeggibile.** DM, clic destro sul vuoto → «Aggiungi creatura
qui…»: il menu (320×884) ha nell'intestazione il bottone «Indietro» largo 238 px perché
`.token-menu-back` condivide `width: 100%` con le righe (`token-menu.css` 190–204); il titolo
(`flex: 1; min-width: 0`) resta largo 0 px e va a capo lettera per lettera, l'intestazione è alta
1213 px e ricerca e lista partono a y 1232, fuori dal menu. `shots/d04-add-creature-1440.png`.
**Copiare** il menu contestuale di Owlbear/Foundry: intestazione su una riga (freccia, titolo,
chiudi) e ricerca subito sotto.

**F3. In combattimento l'ordine di turno copre il menu «Sessione».** DM, 1440×900, «Avvia
combattimento», poi l'orologio «Sessione»: le voci «Sessione», «Pausa» e «Nascondi scena» stanno
sotto le card di Livia, Mira e Sentinella (`elementFromPoint` → `initiative-token`, `token-dot`);
restano cliccabili solo le ultime tre. Sul telefono non succede. `shots/d19-session-menu-1440.png`.
**Copiare** Owlbear: i menu della stanza stanno sopra l'HUD (livello più alto della fila di
ritratti).

**F4. Cambiare pagina conserva lo scorrimento della pagina precedente.** Inizio scorsa di 400 px
→ card del personaggio → la scheda si apre a 400 px (fuoco sul `body`); sul telefono a 722 px,
sotto nome e punti ferita. Tavolo → «Torna alla campagna» a 237 px (intestazione dell'app fuori
vista, titolo tagliato); il costruttore si apre a 210 px. `logs/part-a.json` (P1, P3),
`shots/phone/p01-sheet.png`, `shots/p17-campaign-1440.png`. **Copiare** D&D Beyond e Kanka: ogni
pagina nuova parte dall'alto, il fuoco va al suo titolo; il ritorno indietro può ripristinare la
posizione.

**F5. La hotbar non passa al personaggio di turno.** Il giocatore controlla Livia e Mira. Livia
chiude il turno: «Tocca a te, Mira!», ma hotbar e scheda Creatura restano su Livia; sul telefono,
toccando un'azione compare «Preview disponibile: esegui nel tuo turno». `shots/p14-endturn-1440.png`,
`shots/phone/p14-phone-attack.png`. **Copiare** BG3: all'inizio del turno la hotbar passa al membro
del gruppo che agisce (il giocatore può poi selezionare altro).

**F6. La riga di stato della mappa finisce sotto la hotbar.** Con due righe di azioni (Livia) la
hotbar va da y 681 a 889 e la didascalia (`bottom: 164px`, 668–736) le resta sotto: in
esplorazione la spiegazione di «Misura» («passa sulla mappa per la distanza…») non si legge; nel
combattimento del giocatore la riga delle risorse e la lastra dei dadi le stanno sopra. Il
rilevatore del browser segnala `text-occlusion` su `.map-caption span` e `#map-message`.
`shots/crop-p15-caption.png`, `shots/crop-p14-status.png`, `logs/detect-pages.json`. È la consegna 6
della «Critica 2», peggiorata. **Copiare** BG3: il suggerimento dell'azione sta sopra la fila delle
risorse, calcolato dall'altezza reale della hotbar.

**F7. Il bottone di tiro del pannello dei dadi è sotto la piega.** Tavolo, «Tira i dadi»: formula e
dadi sono in vista, ma «Tira 2d6» è a y 1377 in un pannello visibile fino a 681 (sopra ci sono
«Collega dadi smart», coperture e «Aggiungi alla pila»); a 390 px servono 798 px di scorrimento.
Per il DM anche «Chi vede il risultato: Solo DM» è sotto la piega (a 390 px coperto dalla barra
delle schede). `logs/part-b.json`, `logs/part-d.json`, `shots/p10-tray2-1440.png`. **Copiare** il
vassoio di Owlbear Rodeo: dadi, modalità e visibilità in una riga, il bottone di tiro subito sotto;
il resto dietro «Altro».

### P2 — da correggere nel prossimo giro

**F8. La chat ha 77 px.** Tavolo 1440×900, Chat → Registro: pannello 106–681, cronologia visibile
228–305 (77 px); il resto è filtro, modi, tono, personaggio, destinatario, lingua, testo e
allegati. **Copiare** Foundry v13: la cronologia riempie la barra, il campo di testo è una riga al
piede, le opzioni in un menu.

**F9. La barra laterale del Tavolo lascia poco spazio al pannello.** Il piede con i comandi del
turno occupa ~220 px (anche «Rialzati» di Livia quando il DM la seleziona); nel gruppo Scena del
DM le cinque sotto-schede vanno su tre righe (147 px, consegna 2 della «Critica 2», aperta):
«Aggiungi creature» mostra tre creature. `shots/c2-scene-subtabs-1440.png`. **Copiare** D&D Beyond
(filtri su una riga che scorre) e Foundry (una sola fila di schede).

**F10. Scheda: comandi e preamboli prima del contenuto.** Il numero di un'abilità apre una
finestra da confermare (D&D Beyond tira al clic, vantaggio dal menu). Magie: stat box, avviso
«Preparazione non modificabile ora» sempre visibile, concentrazione e slot prima della lista
(~1250 px a 1440, 2376 a 390). Inventario: peso, sintonia, monete, set d'armi, regola
d'ingombro, ricerca, 7 filtri, rarità, ordinamento e colonne prima degli oggetti; ogni oggetto
alto ~116 px (D&D Beyond ~45). **Copiare** D&D Beyond: tiro al clic, lista subito sotto le schede,
slot nelle intestazioni dei livelli, impostazioni d'ingombro nelle preferenze del personaggio.

**F11. Scheda sul telefono.** Sopra il nome due righe di chip e bottoni («Solo campagna»,
«Condividi», «Gestisci personaggio»); i riquadri rapidi si ripetono sopra ogni pagina, quindi
Percezione è a 1350 px; la striscia taglia la prima voce («RATTERISTICHE»).
`shots/phone/p02-sheet-top.png`. **Copiare** D&D Beyond mobile: intestazione in una riga, riquadri
rapidi solo nella prima pagina.

**F12. Il riposo del giocatore dipende dal DM.** «Riposa» → «Avvia riposo»: «In attesa che il DM
faccia passare il tempo: mancano 1 h»; nessun Dado Vita da spendere finché il DM non agisce; il
riquadro «Prima di applicare» resta vuoto. Coerente con la discrezione del DM, ma un giocatore da
solo non chiude il compito. **Copiare** D&D Beyond (riposo breve: Dadi Vita tirati subito) con la
richiesta al DM come notifica, o chiedere all'owner (domanda 2).

**F13. Regole e dati incoerenti tra superfici.** Allerta (SRD 5.2.1: bonus di competenza
all'iniziativa) scelta al livello 4, iniziativa sempre +2 in scheda e nella finestra d'avvio. Il
goblin «Sentinella» mostra slot di 1° livello 3/4 nella hotbar (seme `slots: {used: 1, max: 4}`).
CA di Livia 12 nella card dell'elenco Personaggi, 13 in scheda, Tavolo e campagna (Mantello della
protezione). **Copiare** D&D Beyond: un solo valore derivato letto da tutte le superfici; i mostri
senza incantesimi non hanno slot.

**F14. Le notifiche coprono i comandi del turno.** In basso a destra le notifiche dei tiri
(«Livia · Dardo di fuoco — Apri il registro») stanno sopra il piede della barra laterale e sopra
«Termina turno» del DM. `shots/d04-table-dm-1440.png`, `shots/d15-scenes-1440.png`. **Copiare** la
snackbar di Owlbear (in basso al centro, già usata per `#toast`) o impilarle sopra il piede.

**F15. Bersaglio e pannello si contraddicono.** Livia prona punta il goblin con «Dardo di fuoco»:
sulla mappa «Nessun modificatore», nel pannello «Tiro con svantaggio · Svantaggio: Prono».
`shots/p14-aim-1440.png`. **Copiare** BG3: sul bersaglio la probabilità e l'icona di vantaggio o
svantaggio.

**F16. Funzioni del DM difficili da trovare.** «Chiedi un tiro» sta in Chat → Dadi → Richieste;
la palette non trova il bottino con «bottino» (solo «Genera: Tesoro») né il tiro segreto con
«segreto»; «Concludi incontro» non propone PE o bottino. **Copiare** Foundry/Roll20: richiesta di
tiro e modalità «privato GM» accanto al campo della chat; sinonimi nella palette.

**F17. Stessa cosa, controlli diversi; parole uguali, cose diverse.** Modalità dei dadi: radio
nella finestra del tiro, select nella pozione e sul Tavolo, radio nel vassoio. Oro primario
ripetuto (cinque «Attiva per il gruppo», «Aggiungi» su ogni creatura, «Lancia» su ogni
incantesimo). «Mondo» è sezione e gruppo; «Sessioni» (calendario) e «Sessioni e avventure»
(preparazione); «Materiali» pillola e scheda; «Diario» sezione della campagna e icona del Tavolo.
**Copiare** DESIGN §3 (un primario per vista) e il glossario di Kanka/Foundry (un nome per concetto).

**F18. Tavolo sul telefono.** Dopo «Mappa» la mappa è 390×560 ma la scena resta in alto
(~40 % dell'area); il suggerimento copre la seconda colonna degli attrezzi e i ritratti di turno;
«Tocca a te» copre la parte bassa della mappa; l'ultima scheda in basso si legge «Sce».
`shots/phone/p13-map.png`, `shots/phone/d05-combat.png`. È la consegna 1 della regressione, aperta.
**Copiare** Owlbear: «adatta alla vista» all'apertura della mappa; suggerimento come snackbar.

**F19. Preparazione sul telefono.** Striscia delle sezioni di campagna, gruppi della
Preparazione e ritorno «I miei incontri» impilati: il contenuto parte a y≈820.
`shots/phone/d03-builder.png`. **Copiare** Kanka mobile: una sola barra di navigazione, il resto nel
menu.

**F20. «Entra al Tavolo» due volte** (barra laterale e intestazione della Panoramica), sul
telefono nella stessa schermata: consegna 1 della «Critica 2», aperta.

**F21. Testi da sviluppatori nei flussi del giocatore.** «Concessione annotata» su ogni incantesimo,
«Ogni scelta appartiene alla capacità che la concede… il nome di una capacità non inventa
automazioni», «Deroga esplicita ai requisiti dei talenti», «Correzione registrata»,
«Voci accessibili (0)», «Preview» nell'italiano. **Copiare** il tono di D&D Beyond (frasi d'azione);
le spiegazioni tecniche nel «Perché?».

**F22. Inizio del DM con i testi del giocatore.** «Ritrova il tuo personaggio. Il resto può
aspettare.» anche al DM, senza un ingresso alla preparazione della prossima sessione.
**Copiare** Roll20 «My Games» (gioco con «Launch» e strumenti del GM).

### P3 — rifiniture

- **F23.** Ogni tiro produce dadi 3D, un riquadro al centro sopra la hotbar («Clic o Esc per
  chiudere») e un avviso; la pozione dice «Cura applicata. Il dettaglio dei dadi è
  nell'inventario.» senza il numero. Un solo esito, con il valore.
- **F24.** L'etichetta di «Misura» si sovrappone al nome della pedina; trascinando una pedina si
  vede la copertura ma non la distanza (Owlbear e Foundry la mostrano).
- **F25.** Nebbia: barra delle opzioni sospesa in basso a sinistra sopra la mappa, con «Copri»,
  «Pennello» e «Cerchio» accesi insieme; nessun riferimento in DESIGN (Owlbear: opzioni nella fila
  degli attrezzi).
- **F26.** «Critica» 29/09 e «Critica 2» ancora aperte: segnalini degli oggetti 19×19 px sulla mappa
  (7); 22 `text-transform: uppercase` in 13 CSS di area (8); chip dell'ambito ripetuto sulle
  Preferenze (4); «Il tuo personaggio» stirato in Inizio (5); fascia della scheda 165 px, 188 con
  il messaggio dei danni, che resta anche dopo il cambio di livello (3).
- **F27.** «Non è il suo turno.» coperto dalle icone del piede; nel menu della pedina «Punti ferita…»,
  «Esamina», «Cerca» e «Bottino» hanno «⋯» al posto dell'icona.
- **F28.** «Confronta» su ogni incantesimo senza riferimento; etichetta «PE DELL'INCON-TRO» spezzata
  nel costruttore d'incontri.

## 5. Confronto con i riferimenti di DESIGN.md

| Superficie (DESIGN §1)           | Riferimento                 | Coincide                                                                                                      | Scarta (non dichiarato)                                                                                                        |
| -------------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Hotbar, risorse, ritratti, turno | BG3 (Solasta)               | ordine di turno in alto, ritratti in colonna, simboli delle risorse, «Termina turno» teal, azione → bersaglio | hotbar che non segue il turno (F5); hotbar alta 208 px con metà vuota in esplorazione; riquadri dei tiri sopra la hotbar (F23) |
| Attrezzi, zoom, anelli           | Owlbear Rodeo 2             | colonna arrotondata, zoom in basso a destra, fila di icone, anelli, menu contestuale                          | bestiario rotto (F2); opzioni della nebbia fuori dalla fila (F25); segnalini 19 px; etichetta di misura (F24)                  |
| Barra laterale e sotto-schede    | Foundry v13 + filtri DDB    | colonna di icone 40 px, «Tutti i pannelli»                                                                    | sotto-schede su 2–3 righe (F9); piede di ~220 px; chat di 77 px (F8); tiro sotto la piega (F7)                                 |
| Scheda                           | D&D Beyond                  | fascia, colonne, CA nello scudo, Cura/Danno, condizioni, costruttore rapido                                   | tiro con conferma, incantesimi e inventario dopo i comandi, righe alte (F10); telefono (F11)                                   |
| Campagna e mondo                 | Kanka                       | barra a gruppi, intestazione con immagine, card piatte                                                        | «Entra al Tavolo» doppio (F20); nomi ripetuti (F17); scorrimento conservato (F4)                                               |
| Controlli                        | Foundry v13 + Roll20 in BG3 | forme, campi, interruttori                                                                                    | oro primario ripetuto; modalità dei dadi in tre forme (F17)                                                                    |
| Dialoghi, menu, avvisi           | BG3 + Owlbear/MUI           | cornice, velo, snackbar                                                                                       | menu «Sessione» sotto l'HUD (F3); notifiche sopra i comandi (F14); tre segnali per tiro (F23)                                  |

**Scelte senza un prodotto di riferimento** (da riportare in DESIGN §4 o togliere): «Confronta» per
incantesimo; «Concessione annotata»; regola d'ingombro dentro l'inventario del giocatore; riposo
del giocatore vincolato al tempo del DM; colonna vuota «Prima di applicare» nei riposi; icona
orologio per «Sessione» accanto a «Tempo»; barra delle opzioni della nebbia in basso a sinistra.

## 6. Voci aperte di «Critica 2» e della regressione

| Voce                                                           | Stato al 30/09                                                                            |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| C2-1 Nome della campagna e «Entra al Tavolo» due volte         | **aperta** (1440 e 390; F20)                                                              |
| C2-2 Sotto-schede su tre righe nel gruppo Scena del DM         | **aperta** (147 px; F9); decisione di IA da dare all'owner                                |
| C2-3 Fascia della scheda a 165 px                              | **aperta** (165; 188 con il messaggio dei danni)                                          |
| C2-4 Chip dell'ambito ripetuto nelle Preferenze                | **aperta** (7 chip)                                                                       |
| C2-5 «Il tuo personaggio» stirato in Inizio                    | **aperta** (schermata `d-home-1440.png`)                                                  |
| C2-6 Dadi che toccano la riga di stato                         | **peggiorata**: la riga di stato è coperta (F6)                                           |
| 29/09-1 Anello interno in DESIGN §4                            | non verificata (documentale)                                                              |
| 29/09-7 Bersagli piccoli sulla mappa                           | **aperta**: 5 segnalini da 19×19 px a 1440; pedine 46×46 sul telefono (ok)                |
| 29/09-8 Maiuscolo trasformato nelle aree                       | **aperta**: 22 regole in 13 file CSS                                                      |
| 29/09-9 `--res-action` nel chiaro                              | chiusa per il contrasto: `#2e7d4f` a 4,1–4,9:1 sulle tre pergamene (≥ 3:1 per un simbolo) |
| Regressione 1: Tavolo del telefono prima di «Mappa»            | **aperta**: mappa piccola all'apertura, scena non adattata dopo «Mappa» (F18)             |
| Regressione 2: gesti sul riquadro utile nel README/DEVELOPMENT | fuori dall'ambito UX (documentazione del coordinatore)                                    |

## 7. Rilevatore

- **CLI** (`detect.mjs --json design/blueprint`, ridotto a espressioni regolari): 10 avvisi, gli
  stessi della «Critica 2» (`side-tab` in `combat.css` 452–453, 496–497, `compendium.css` 290,
  `encounter-builder.css` 262, `integrations.css` 317 e 322; `layout-transition` in
  `encounter-builder.css` 383; `border-accent-on-rounded` in `quickbar.css` 512). Nessuno tocca i
  difetti di questa nota. `logs/detect.json`.
- **Nel browser** (5 pagine, 1440): Inizio 2, scheda 52, Panoramica 2, Preparazione 16, Tavolo del
  DM 22. Utili: `text-occlusion` su didascalia e messaggio della mappa (conferma F6); quello su
  «Scheda completa», «Inventario» e «Riposa» è contenuto del pannello Creatura che scorre sotto il
  piede (atteso, ma ricorda quanto spazio prende il piede, F9); `tiny-text` 11 px nell'identità della hotbar;
  `text-overflow` di un badge nascosto nella scheda; `cramped-padding` sulle proprietà delle armi.
  Falsi positivi rispetto al brief: `gpt-thin-border-wide-shadow` (le lastre fluttuanti di Owlbear
  sono volute, DESIGN §2 «Elevazione») e `overused-font` (Roboto come D&D Beyond, DESIGN §1).
  `logs/detect-pages.json`. Nessuna sovrapposizione visibile all'utente: il rilevatore è stato
  iniettato solo nei contesti di prova.

## 8. Persone

- **Jordan, prima volta**: sale di livello e trova dieci avvisi e una scelta vuota; cerca «Tira» nel
  pannello dei dadi e non lo vede; al turno di Mira la hotbar mostra ancora Livia. Abbandona al
  livello o chiede aiuto al DM.
- **Casey, telefono al tavolo**: apre la scheda a metà pagina; per Percezione scorre 1350 px, per
  bere una pozione 2787; sul Tavolo «Tocca a te» copre la mappa e la scena resta piccola.
- **Alex, esperto**: apprezza palette, scorciatoie e menu della pedina (D7 in due clic); lo
  rallentano la finestra di conferma del tiro e il livello scelto due volte per un incantesimo.
- **Il DM del gruppo (Owlbear)**: trova subito attrezzi, iniziativa e menu della pedina; si perde
  su richiesta di prove, tiro segreto e bottino; in combattimento non raggiunge «Pausa».
- **Sam, tastiera**: fuoco visibile e nomi accessibili buoni; passando da Inizio alla scheda il
  fuoco resta sul `body` della pagina nuova (le sezioni della campagna invece lo portano al titolo)
  (F4).

## 9. Domande per l'owner (per il coordinatore)

1. **Priorità**: prima i difetti che rompono compiti (F1–F7), poi la densità di scheda e barra
   laterale (F8–F11), o prima il telefono (F4, F11, F18, F19)?
2. **Riposi**: il giocatore può concludere da solo un riposo breve e tirare i Dadi Vita (come D&D
   Beyond, con una notifica al DM), o il tempo resta sempre del DM (come ora)?
3. **Tiri dalla scheda**: clic sul numero = tiro immediato (D&D Beyond), con la finestra solo per
   vantaggio o dadi fisici, oppure sempre la finestra (come ora, utile per i dadi fisici)?
4. **Sotto-schede del Tavolo**: una riga che scorre (D&D Beyond, Foundry) o a capo (decisione B62)?

## 10. Prove

Tutte in `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/review-ux/`:

- `shots/` — 81 catture a 1440 (`p01…p20`, `d00…d20`, `misc-*`, `c2-*`, ritagli `crop-*`, tema
  chiaro `light-table-player-1440.png`); `shots/phone/` — 43 catture a 390 × 844.
- `scripts/` — `pw` (un comando per volta, allarme 100 s), `head.js`/`tail.js` e `part-a…e.js`
  (sonde del telefono), `run.sh`, `show.py`, `detect-pages.js`, `verify-levelup.js`,
  `verify-misc.js`.
- `logs/` — `part-*.json` (posizioni, dimensioni, coperture, scorrimenti), `verify-*.raw`,
  `detect.json`, `detect-pages.json`, `suite.log` (2582/2582).

Come ripetere una sonda: con il server acceso,
`playwright-cli -s=d20-final-ux open http://127.0.0.1:8879/` e poi `sh scripts/run.sh part-a`
(o `part-b`, `part-b2`, `part-c`, `part-d`, `part-e`) dalla cartella delle prove.
