# B55 — Integrazioni esterne simulate: prove

24/09/2026 (cartella prove datata 2026-09-25 come da incarico). Worktree
`d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non committato. Area costruita
solo tramite il registro (B11): **nessun file condiviso modificato** (`extensions.mjs`
elencava già `integrations`).

**Simulazione dichiarata.** Nessuna chiamata di rete; ogni indirizzo generato usa il dominio
riservato `d20-studio.example` (RFC 2606, non si risolve mai); ogni collegamento reale resta
subordinato a una decisione owner (GAP-17). La pagina lo dice in cima («Simulazione»).

## File

Nuovi (tutti di B55):

- `design/blueprint/integrations.mjs` — modulo d'ingresso `register(registry)`: sezione di
  stato `integrations` (Undo a istantanea), sezione di campagna «Integrazioni» con cinque
  parti, due voci del menu della pedina, riquadro nella scheda Creatura del Tavolo, due comandi
  della palette, barra «Annulla» delle proprie modifiche.
- `design/blueprint/integrations-domain.mjs` — dominio puro: moduli e dipendenze, inoltro,
  Avrae, calendario RFC 5545, feed, schede esterne, formato documentato, token, webhook.
- `design/blueprint/integrations.css` — stili `.int-*` collegati con `registerStyles`.
- `design/blueprint/tests/integrations.test.mjs` — 14 test (dominio e gli stessi gestori dei
  controlli, con store e registro reali; `fetch` sostituito da una trappola che conta le
  chiamate: zero).
- `changes/interview-01/blueprint-checks/integrations-journey.js` — percorso nel browser.

Dati condivisi con le altre aree, senza toccarne i file: registro di gioco del core
(`state.log`, formato del «Tiro libero» del Tavolo letto con `parseFreeRoll` di B17);
appuntamenti del core (`state.campaign.sessions`, istante esplicito + fuso IANA);
voci della campagna lette con `listCampaignEntries` per ogni membro; impostazioni personali
dei promemoria di B24 (`notifications.remind-24h/1h/start`, stesse scelte della campana);
import con `importCharacter` della libreria B21 (il personaggio compare in Personaggi, privato,
con il distintivo «Importata»); visibilità con `canViewActor`/`canControlActor`.

## Dove si trova (≤ 2–3 clic)

| Contesto                                                                          | Percorso                                                                                                                             | Chi                                                                    |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------- |
| Campagna → **Integrazioni** (Moduli, Discord, Calendario, Importa, API e webhook) | dalla campagna 1 clic (barra laterale); dal Tavolo 2 («Torna alla campagna» → Integrazioni); `#campaign?tab=integrations&id=<parte>` | tutti i membri; configurazione solo DM                                 |
| Tavolo → menu della pedina → **Scheda esterna…** / **Apri scheda esterna**        | clic destro (o tocco, poi «…») sulla pedina → voce                                                                                   | modifica: chi controlla la creatura; apertura: chi può leggere il link |
| Tavolo → scheda **Creatura** → riquadro «Scheda esterna»                          | selezionare la pedina                                                                                                                | solo se esiste un link leggibile                                       |
| Palette (B23)                                                                     | «Scarica la prossima sessione (.ics)», «Apri le integrazioni della campagna»                                                         | tutti                                                                  |

Nessun pulsante nuovo in testate o nella barra in basso (regola B61 §5.2): la sezione sta nella
barra laterale della campagna, le azioni sulla pedina nel suo menu, il dettaglio nell'ispettore.

## Capacità → percorso → prova

| Capacità (censimento)                                | Percorso                                            | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Regola / fonte                                                                                                        | Pattern adottato (prodotto + ID)                                                                                                                                  | Prova                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SV-38** inoltro di tiri e avvisi a Discord         | Integrazioni › Discord                              | DM: indirizzo webhook (validato, poi sempre mascherato `…/••••0001`, anche al DM), nome del canale, categorie (tiri pubblici, eventi del registro, avvisi delle sessioni, voci condivise con tutti). «Anteprima del canale (simulata)» in stile Discord. Nota con orario `/dnote`, ritirabile con motivo (resta nello storico). Tiri privati, etichette private e voci non leggibili da tutti non compaiono mai; solo il DM vede quanti sono stati trattenuti. Le modifiche di configurazione dell'area (prefisso «Integrazioni ·») non vengono inoltrate | tiri del core con `visibility` diversa da `private` e non `superseded`; voce leggibile = leggibile da **ogni** membro | Foundry to Discord e moduli di inoltro (SVC-121: tiri e chat rispecchiati, cancellazioni sincronizzate, `/dnote`); webhook di Clash!/Rumble! su Owlbear (VTL-225) | test «relay preview…», «relay: DM saves…», «relay: session notices…», «rendering…»; percorso gruppo 2: tiro fisico 14+3 e digitale +5 di Livia dal Tavolo presenti, tiro d'iniziativa digitale privato della Sentinella assente, «Non inoltrati: 1 tiro privato» solo al DM, **zero richieste fuori da 127.0.0.1:8879** (instradamento del contesto e `request` della pagina) |
| SV-38 (Avrae)                                        | Integrazioni › Discord › Collegamento Avrae         | comando `!campaign https://d20-studio.example/campaigns/lanterns` con «Copia»; il DM simula la risposta di Avrae (server, canale); collegamenti elencati e «Scollega»; destinazione Avrae nel selettore del canale: solo tiri pubblici dal momento del collegamento                                                                                                                                                                                                                                                                                       | stesse regole dell'inoltro                                                                                            | Avrae `!campaign` (SVC-116, DDB-195 solo in una direzione)                                                                                                        | test «Avrae…»; percorso gruppo 2 (canale #tiri: tiri sì, nota no)                                                                                                                                                                                                                                                                                                             |
| **SV-39** feed del calendario                        | Integrazioni › Calendario                           | «Crea il mio link del calendario» (`webcal://d20-studio.example/feeds/lanterns/<token>.ics`), «Copia», «Rigenera il link…» con conferma (i vecchi finali sono elencati come ritirati), «Scarica il feed (.ics)», contenuto del feed visibile. Link personale di ciascuno (commit locale e privato)                                                                                                                                                                                                                                                        | RFC 5545 (CRLF, piegatura a 75 ottetti, escape)                                                                       | Sesh `/link` (SVC-065)                                                                                                                                            | test «calendar: personal feed…»; percorso gruppo 3                                                                                                                                                                                                                                                                                                                            |
| **CA-47** promemoria su richiesta e feed             | Calendario › Prossima sessione; Promemoria nell'app | «Scarica .ics» della prossima sessione: `DTSTART`/`DTEND` in UTC dall'istante esplicito, ora concordata e fuso nella descrizione, `UID` stabile e `SEQUENCE` = revisione; durata indicata scelta dal DM (2–6 h). Promemoria 24 h / 1 h / all'inizio: le **stesse** impostazioni personali di B24, consegnati nella campana                                                                                                                                                                                                                                | appuntamenti del core (istante + IANA, incremento 7)                                                                  | Sesh promemoria scelti da chi li riceve (SVC-064) e file iCal (SVC-065)                                                                                           | test «calendar: .ics…» (21:00 Europe/Rome di ottobre → `DTSTART:20271002T190000Z`); percorso gruppo 3: sessione creata da Sessioni, file scaricato con `DTSTART` uguale all'istante calcolato dal browser, 3 h poi 4 h; a 50 minuti dall'inizio (orologio del browser) la campana mostra «Promemoria: …»; gruppo 8: stesso istante UTC da un telefono in Europe/London        |
| **SV-40** scheda esterna su una pedina               | Tavolo › menu della pedina; scheda Creatura         | «Scheda esterna…»: indirizzo solo `https://` senza credenziali, «Visibile a chi vede questa creatura», «Rimuovi il link». «Apri scheda esterna» apre una **nuova scheda** del browser (`noopener,noreferrer`); nulla viene importato. Link del DM su una creatura non condiviso → invisibile al giocatore; etichetta del registro privata                                                                                                                                                                                                                 | `canControlActor` per scrivere; lettura: controllo, oppure condiviso + `canViewActor`                                 | Owlbear Sheet from Beyond / External Links (VTL-034; qui senza il riquadro iframe, come chiede la scheda B55)                                                     | test «external sheet…»; percorso gruppo 4 (nuova scheda con l'URL, pagina finta del percorso, scheda di Livia identica prima e dopo; menu del goblin del giocatore senza voci) e gruppo 8 (tocco, «…», «Open external sheet»)                                                                                                                                                 |
| **PG-92** import da formati documentati              | Integrazioni › Importa                              | formato d'esempio documentato `d20-sheet-csv v1` (foglio a due colonne campo,valore; tabella dei campi nella pagina; «Scarica il modello», «Usa l'esempio», file o testo incollato). Anteprima con errori per riga e campi ignorati; «Importa come nuovo personaggio» (privato, nella libreria B21); con lo stesso `source_id` «Aggiorna la scheda» mostra le differenze e aggiorna solo i numeri del foglio (inventario, note, condizioni, campagna restano; PF attuali ≤ nuovi massimi)                                                                 | nessuna regola dedotta dal testo della classe; provenienza `imported-file`, revisione `d20-sheet-csv-1`               | Avrae `!import` con anteprima e `!update` che conserva le impostazioni (DDB-194); controprova: Shard abbandona l'import DDB (VTL-200), quindi niente scraping     | test «import: parser…», «import: new private character…»; percorso gruppo 5 (errori «Riga 5», «colore (riga 6)»; Tessa privata del giocatore, invisibile al DM; aggiornamento a livello 4 e Annulla)                                                                                                                                                                          |
| **SV-41** API pubblica e connettori (aggiunta a B55) | Integrazioni › API e webhook                        | token personali (nome, mostrato **una volta**, conservate solo le ultime 4 cifre e un'impronta; massimo 5 attivi; «Revoca…»); «Prova l'API (simulata)»: tre GET risposti in locale con le regole di visibilità dell'app (200; 401 con token errato o revocato; 404 con il modulo spento). DM: webhook della campagna (nome, https, evento, tipo JSON o messaggio Discord, messaggio con `{name} {event} {url} {campaign}`, attivo), «Prova», consegne simulate visibili, «Elimina…» con Annulla                                                           | una scheda privata altrui non compare mai nella risposta; le voci private non partono                                 | Kanka token personali e webhook della campagna (CMP-213); API di DiceCloud (CMP-09)                                                                               | test «API tokens…», «webhooks…»; percorso gruppo 6 (200 con Livia e Mira, senza Tessa privata; 401 dopo la revoca; consegna di prova; eliminazione e Annulla; nessuna richiesta verso `hooks.example`)                                                                                                                                                                        |
| **SV-42** estensioni per campagna (aggiunta a B55)   | Integrazioni › Moduli                               | elenco dei moduli **integrati** (nessun codice di terze parti) con interruttori, «Salva le impostazioni dei moduli», «Annulla le modifiche»; richiesta di dipendenza (spegnere l'Inoltro spegne anche Avrae; accendere Avrae riaccende l'Inoltro); un modulo spento sparisce per tutti (parte, voci del menu, riquadro), i dati restano; storico con chi e quando; il giocatore vede lo stato in sola lettura. Rimando a Impostazioni › Sezioni (B20) per le sezioni della campagna                                                                       | solo DM; condiviso                                                                                                    | Foundry «Manage Modules» per mondo con richieste di dipendenza (FVT-197); Owlbear estensioni attivate per stanza (VTL-206, SVC-135)                               | test «modules…»; percorso gruppo 1 (tastiera: Spazio sull'interruttore → richiesta; salvataggio; Annulla dalla barra; giocatore in sola lettura)                                                                                                                                                                                                                              |

## Ruoli, privacy, correzioni, rete assente

- **DM / giocatore.** Configurazione (moduli, inoltro, Avrae, durata, webhook) solo DM, anche
  nel dominio (`requireDm`). Il giocatore vede lo stato, l'anteprima del canale, il proprio
  feed, i propri promemoria, i propri token, il proprio import. Il DM non vede i token, il feed
  né il personaggio privato importato dal giocatore.
- **Privato.** Token, feed, import di un personaggio privato: commit `{local:true, visibility:"private"}`
  (permessi senza rete). Link del DM non condiviso: commit condiviso con etichetta privata.
  I controlli di visibilità sono locali (come nel resto del prototipo): nessuna sicurezza di backend.
- **Correzioni.** Barra «Annulla: …» quando l'ultima modifica di chi guarda è di quest'area
  (la shell registra la correzione nel registro); nota ritirata con motivo; eliminazione del
  webhook reversibile; errori mostrati accanto al modulo (pagina) o nella finestra (dialoghi).
- **Senza rete.** Le modifiche condivise sono rifiutate con il messaggio della shell accanto al
  modulo; anteprime, download `.ics` e dati personali funzionano (percorso gruppo 7).
- **Rete.** Test Node: `fetch` trappola, 0 chiamate. Browser: ogni richiesta fuori dal server
  locale viene registrata e servita con una pagina finta; le uniche registrate sono le due
  aperture volute della scheda esterna (`dndbeyond.com/characters/000000001`, desktop e telefono).

## Comandi eseguiti e risultato

- `node --test design/blueprint/tests/integrations.test.mjs` → **14/14**.
- `node --test design/blueprint/tests/*.test.mjs` → ultima esecuzione **1638/1643**: i 5
  fallimenti sono test di revisione di `world-map` in corso da un altro costruttore; nelle
  esecuzioni precedenti fallivano, a turno, test di `campaign-data`, `quests` e
  `homebrew-editor` (poi verdi eseguiti da soli). Nessun file di test importa B55 tranne il suo;
  nessun fallimento in `integrations.test.mjs`.
- Browser (Chromium, `playwright-cli`, sessione `d20-b55`, server `127.0.0.1:8879`), dalla
  cartella `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B55/`:
  `playwright-cli -s=d20-b55 --raw run-code --filename=…/blueprint-checks/integrations-journey.js`
  → **8 gruppi superati, `errors: []`**, eseguito più volte di fila (registro
  `integrations-journey-final.log`; file scaricato `b55-next-session.ics`).
  1. Moduli (IT 1440, DM, tastiera); 2. Discord (tiri reali dal Tavolo, iniziativa privata dalla
     preparazione, nessuna rete, nota ritirata, Avrae, vista del giocatore); 3. Calendario (sessione
     creata da Sessioni, `.ics`, durata, feed ruotato, promemoria consegnato nella campana con
     l'orologio del browser spostato); 4. Scheda esterna (menu con clic destro, nuova scheda,
     nessun import, link del DM nascosto al giocatore); 5. Import (errori, nuovo, aggiornamento,
     Annulla, pagina Personaggi, DM senza accesso); 6. API e webhook; 7. Ricarica (tutto conservato)
     e senza rete; 8. Telefono EN 390 × 844 con tocco, fuso Europe/London: `.ics` con lo stesso
     istante UTC, anteprima in inglese, import, pedina → «…» → «Open external sheet»; nessuno
     scorrimento orizzontale e nessun controllo sotto 40 px in `.int-page` (telefono: Calendario e
     Discord; 1440: Calendario).

## Immagini (1440 × 900, più telefono 390) — controllo visivo

`b55-01-modules-dm-1440.png` (moduli, barra Annulla, sei moduli attivi), `b55-02-discord-dm-1440.png`
(anteprima con due tiri e la nota, «Non inoltrati: 1 tiro privato»), `b55-03-discord-player-1440.png`
(stato in sola lettura, stessi messaggi, nessun conteggio), `b55-04-calendar-dm-1440.png`
(prossima sessione e durata), `b55-05-calendar-player-1440.png` (feed ruotato, promemoria 1 ora),
`b55-06-token-menu-sheet-1440.png` (menu della pedina con le due voci), `b55-07-inspector-sheet-1440.png`
(riquadro «Scheda esterna» nella scheda Creatura), `b55-08-import-preview-1440.png`,
`b55-09-api-player-1440.png` (token e risposta 200), `b55-10-webhooks-dm-1440.png` (consegna di prova),
`b55-11-calendar-phone-390.png`, `b55-12-discord-phone-390.png`, `b55-13-import-phone-390.png`.
Ispezionate: nessuna sovrapposizione o testo tagliato nei contenuti di B55; le schede della
sezione scorrono in orizzontale sul telefono (classe condivisa `.tabs`); correzioni fatte dopo il
controllo: margini dei campi (campaign.css li azzera nelle pagine di campagna), riga dei modelli
anche in inglese, etichetta non ripetuta nell'ispettore, avvisi a comparsa lasciati sparire prima
delle immagini.

## Limiti onesti

- Tutto è simulato: nessun webhook, bot, calendario o API reale viene contattato; il feed e
  l'API non sono raggiungibili; le consegne dei webhook e i messaggi del canale sono **anteprime
  derivate dallo stato** (nessuna coda, nessun ritentativo, nessun limite di frequenza).
- L'inoltro rispecchia le etichette condivise del registro così come sono state scritte (nella
  lingua di chi ha agito); non rispecchia la chat di B17 (sussurri e lingue richiederebbero regole
  proprie). Avrae è solo in una direzione: i tiri fatti in Discord non tornano nell'app (DDB-195
  completo non simulato).
- La dipendenza «Avrae richiede l'Inoltro» è una scelta di questo prototipo (stesse regole di
  pubblicità), non un requisito del vero Avrae, che è un bot indipendente.
- I moduli attivabili coprono solo le integrazioni di B55. Spegnere per campagna funzioni di altre
  aree (chat, annotazioni…) richiederebbe un gancio nel registro: non aggiunto; le sezioni della
  campagna restano in Impostazioni › Sezioni (B20).
- Il formato `d20-sheet-csv v1` è un **esempio documentato** scelto qui: quali formati reali
  supportare resta una decisione (F-028). L'aggiornamento non rinomina né cambia oggetti e note.
- La scheda esterna si apre sempre in una nuova scheda (niente anteprima in iframe); l'app non
  verifica il contenuto del sito esterno.
- L'impronta dei token (FNV-1a) serve solo alla dimostrazione, non è crittografia.
- I promemoria arrivano solo nella campana di B24 e solo mentre l'app è aperta; nessuna notifica
  esterna (GAP-34/GAP-17).
- I tiri liberi del Tavolo sono sempre condivisi (comportamento del core); il tiro privato usato
  nel percorso è l'iniziativa digitale della preparazione (nei test anche un attacco privato di
  una creatura del DM e un'etichetta di tiro privata).

## Review and fixes

Revisione indipendente del 24/09/2026 (B55-rf, altra sessione rispetto al costruttore), sullo
stesso worktree non committato. Sessione browser propria `d20-b55-rf`, cartella prove
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B55-rf/`. Correzioni
solo nei file di B55 (`integrations.mjs`, `integrations-domain.mjs`, `integrations.css`,
`tests/integrations.test.mjs`, `blueprint-checks/integrations-journey.js`); **nessun file
condiviso modificato**. Ogni correzione è stata scritta prima come test che falliva (7 test
nuovi, tutti rossi prima delle modifiche per il motivo atteso), poi resa verde.

Prima delle correzioni il percorso del costruttore passava (8 gruppi, `errors: []`, immagini in
`B55-rf/baseline/`) e la suite completa era 1668/1668: i difetti sotto sono quindi casi che il
percorso originale non toccava.

### Esito per punto del controllo

- **(a) Capacità della scheda B55** (SV-38, SV-39, SV-40, CA-47, PG-92, più SV-41 e SV-42):
  tutte funzionanti nell'app in esecuzione (percorso gruppi 1–8 rieseguiti).
- **(b) Fedeltà ai modelli**: Foundry «Manage Modules» con richiesta di dipendenza (FVT-197),
  webhook Discord e `/dnote` (SVC-121, VTL-225), Avrae `!campaign` con elenco e rimozione
  (SVC-116), Sesh `/link` e promemoria scelti da chi li riceve (SVC-065, SVC-064), menu della
  pedina «Scheda esterna» (VTL-034), `!import`/`!update` con anteprima (DDB-194), token Kanka
  mostrati una volta e webhook della campagna (CMP-213). Mancava il gesto di rimozione del webhook
  Discord (F6); nessun'altra interazione inventata dove esiste un modello.
- **(c) Controlli inerti**: le conferme sembravano non fare nulla quando il comando veniva
  rifiutato (F3). Corretto. «Apri Sezioni» e «Apri Sessioni» portano davvero alle pagine giuste
  (verificato: `#campaign?tab=settings&id=sections`, `#campaign?tab=sessions`).
- **(d) Coerenza fra aree**: personaggio importato nella libreria B21, promemoria nella campana
  B24, sessioni del core, pedine e ispettore del Tavolo: confermati.
- **(e) Ruoli, privacy, senza rete, correzioni, errori**: F1 (privacy), F3 (errori), F4/F5
  (coerenza delle anteprime). Resto confermato.
- **(f) IT/EN, tastiera, 390 px**: tutte e cinque le parti a 390 px senza scorrimento orizzontale
  e senza controlli sotto 40 px (anche finestra «Nuovo webhook»); F8, F9 corretti.
- **(g) Test**: i 14 test del costruttore usano store e registro reali e sono significativi;
  aggiunti 7 test di revisione.
- **(h) Regressioni da file condivisi**: nessun file condiviso toccato (dal costruttore né da me).
- **(i) Collocazione B61**: sezione nella barra laterale della campagna, voci nel menu della
  pedina, riquadro nella scheda Creatura dell'ispettore, comandi nella palette; nessun pulsante
  aggiunto a testate o alla barra in basso. Conforme.

### Difetti trovati e corretti

| #   | Grav. | Difetto                                                                                                                                                                                                                                                                             | Riproduzione (prima)                                                                                                                               | Esito                                                                                                                                                                                                                                                                                                   | Prova                                                                                                                 |
| --- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| F1  | P2    | **Privacy**: il conteggio «Non inoltrati» del DM contava anche l'attività privata del giocatore (bozze e appunti «Solo io», tiri privati propri): il DM vedeva salire il numero a ogni appunto privato del giocatore                                                                | Giocatore: Appunti › Nuovo appunto › «Salva bozza…» › «Salva contenuto…» (Solo io). DM: Integrazioni › Discord → «Non inoltrati: 3 eventi privati» | **Corretto.** `logItems`/`relayPreview` ricevono `viewer` e contano solo ciò che chi guarda potrebbe già leggere (stessa regola del registro di chat: `rollVisibleTo`, etichetta privata solo a chi l'ha scritta); senza `viewer` il conteggio è 0                                                      | test «review: the withheld count…»; percorso 9(a): conteggio del DM identico prima e dopo l'appunto privato           |
| F2  | P2    | **Tema chiaro (B22) illeggibile**: anteprima del canale, campi del comando Avrae/feed/token e blocchi di codice (feed, risposta API, consegne dei webhook) con fondo scuro fisso e testo scuro: contrasto 1,1:1                                                                     | Preferenze › Tema «Chiaro» → Integrazioni › Discord (`rf-light-discord-before.png`)                                                                | **Corretto.** Regole `:root[data-pref-theme="light"]` in `integrations.css` (canale nel tema chiaro di Discord `#f2f3f5`, campi come `preferences.css`): testo 13,8:1, testo secondario 6,7:1, campo 15,1:1                                                                                             | test CSS «every dark surface… light-theme counterpart»; percorso 9(e) misura ≥ 4,5:1; `b55-14-discord-light-1440.png` |
| F3  | P2    | **Errore nascosto dietro la finestra**: nelle conferme (Elimina webhook, Revoca token, Rigenera link, «Rimuovi il link» della scheda esterna) un rifiuto compariva solo come avviso sotto lo sfondo modale; la finestra restava aperta senza messaggio, il pulsante sembrava inerte | Senza rete → API e webhook › «Elimina…» › «Elimina» (`rf-offline-delete-before.png`)                                                               | **Corretto.** Il comando lancia l'errore dentro `onSubmit`, la shell lo scrive in `.dialog-error` e tiene la finestra aperta; «Rimuovi il link» scrive nello stesso riquadro. Azioni esportate `confirmDeleteWebhook`, `confirmRevokeToken`, `confirmRotateFeed`, `confirmRemoveWebhook`, `removeSheet` | test «review: confirmations show a refused change…»; percorso 9(d) (webhook e scheda esterna senza rete)              |
| F4  | P3    | Un webhook sospeso e poi riattivato mostrava come «consegne simulate» gli eventi avvenuti durante la sospensione                                                                                                                                                                    | Sospendi il webhook, programma una sessione, riattiva → la sessione compare fra le consegne                                                        | **Corretto.** Periodi `pauses` sul webhook (interruttore, finestra di modifica, webhook creato spento); normalizzazione li conserva                                                                                                                                                                     | test «review: a paused webhook…»; percorso 9(c) («La cripta del faro» assente, «Il ritorno a Bruma» presente)         |
| F5  | P3    | L'anteprima dell'inoltro ricostruiva il passato: una categoria spenta e riaccesa mostrava i messaggi del periodo spento; un indirizzo webhook nuovo mostrava la storia (e le note) del canale precedente                                                                            | Spegni «Tiri pubblici», tira, riaccendi → il tiro compare; incolla un altro webhook → i vecchi messaggi restano                                    | **Corretto.** `relay.gaps` per categoria; un webhook diverso è un canale nuovo (`since` = ora, note filtrate). Stessa regola già usata per il modulo riacceso (Foundry to Discord non ripubblica l'arretrato, SVC-121)                                                                                  | test «review: the relay never back-fills…»                                                                            |
| F6  | P3    | Nessun modo di rimuovere il webhook Discord: il campo vuoto significa «mantieni», quindi il segreto restava salvato per sempre                                                                                                                                                      | Integrazioni › Discord (DM): nessun controllo di rimozione                                                                                         | **Corretto.** «Rimuovi il webhook…» con conferma (indirizzo mascherato), riga nello storico, barra «Annulla»; canale e categorie restano. Modello: Discord › Integrazioni › Webhook › Elimina; Clash! svuota l'indirizzo (VTL-225)                                                                      | test «review: the DM removes the Discord webhook…»; percorso 9(b); `b55-16-relay-remove-phone-390.png`                |
| F7  | P3    | La finestra «Scheda esterna…» non diceva chi legge un link non condiviso: su un personaggio del gruppo lo legge anche il DM (che lo controlla al Tavolo)                                                                                                                            | Giocatore: menu di Livia › «Scheda esterna…»                                                                                                       | **Corretto.** Nota sotto la casella: «Se non è spuntato, il link lo vede solo chi controlla la creatura: per un personaggio del gruppo, chi la gioca e il DM» (personaggio privato: «solo tu»)                                                                                                          | test «review: the external-sheet dialog…»; percorso 9(d)                                                              |
| F8  | P3    | Nome del modello scaricato sempre in italiano (`d20-sheet-csv-esempio.csv`) anche in inglese                                                                                                                                                                                        | Lingua EN › Import › «Download the template»                                                                                                       | **Corretto.** `d20-sheet-csv-example.csv` in inglese                                                                                                                                                                                                                                                    | percorso 8 (EN) e 9 (IT) controllano il nome                                                                          |
| F9  | P3    | A 390 px il titolo «Webhook della campagna» era schiacciato contro «Nuovo webhook…»                                                                                                                                                                                                 | Telefono, DM, API e webhook                                                                                                                        | **Corretto.** L'intestazione della sezione va a capo                                                                                                                                                                                                                                                    | `b55-15-webhooks-dm-phone-390.png` (nessuna sovrapposizione, nessuno scorrimento)                                     |
| F10 | P3    | Codice morto: ternario senza effetto su `<details>` delle consegne                                                                                                                                                                                                                  | lettura del codice                                                                                                                                 | **Rimosso**                                                                                                                                                                                                                                                                                             | —                                                                                                                     |

Nessun P1 trovato.

### Non difetti (con motivo)

- **Icone «···» nelle voci del menu della pedina**: il menu condiviso mostra così tutte le voci
  delle aree (Aura…, Nota sulla pedina…, Quota…); comportamento dello slot condiviso, non di B55.
- **Evento «Contenuto di campagna aggiornato» accanto all'avviso di sessione**: è l'etichetta
  condivisa del registro scritta dall'area Sessioni; l'inoltro rispecchia gli eventi condivisi del
  registro per scelta (come Foundry to Discord con la chat) e il DM può spegnere «Eventi del
  registro di gioco».
- **Il DM legge il link non condiviso del giocatore su Livia**: per definizione «solo chi la
  controlla» (`canControlActor`: il DM controlla i personaggi della campagna al Tavolo); ora è
  scritto nella finestra (F7). Un personaggio privato resta leggibile solo dal proprietario.
- **Il conteggio del DM include le sue bozze private** (per esempio le bozze di sessione): sono
  elementi suoi, che può già leggere; il numero è onesto.
- **«Voce condivisa con tutti» datata alla creazione**: i dati di `campaign-content` non registrano
  l'istante in cui una voce diventa condivisa; una voce condivisa più tardi risulta alla data di
  creazione. Limite del modello dati condiviso, non modificato da B55.
- **Scheda esterna senza riquadro iframe** (Owlbear apre prima un riquadro): la scheda B55 chiede
  esplicitamente la nuova scheda del browser.
- **Tiro annullato barrato invece che cancellato dal canale** (SVC-121 cancella il messaggio):
  rispecchia il registro dell'app, dove i tiri accettati restano con la correzione.
- **Fallimenti della suite completa in `fog-vision`**: area di un altro costruttore in corso; nessun
  test importa B55 tranne il suo.

### Comandi eseguiti e risultato (dopo le correzioni)

- `node --test design/blueprint/tests/integrations.test.mjs` → **21/21** (14 del costruttore, uno
  aggiornato al conteggio per chi guarda, più 7 di revisione).
- `node --test design/blueprint/tests/*.test.mjs` → 1671/1673 alla prima esecuzione e
  **1672/1673** alla seconda: gli unici fallimenti sono test di revisione di `fog-vision` (un
  test diverso a ogni esecuzione; file di quell'area modificati da un altro revisore pochi minuti
  prima). Solo `integrations.test.mjs` importa B55; nessun fallimento nei test di B55.
- Browser, sessione `d20-b55-rf`, dalla cartella `B55-rf/`:
  `playwright-cli -s=d20-b55-rf --raw run-code --filename=…/blueprint-checks/integrations-journey.js`
  → **9 gruppi superati, `errors: []`**, richieste esterne solo le due aperture volute della scheda
  esterna (pagina finta). Il percorso ora scrive le immagini in `B55-rf/` (le immagini originali
  del costruttore restano in `B55/`); il file resta senza punto e virgola finale, come richiesto
  dal README dei controlli.
- Formattazione: prettier sui file di B55 (il percorso differisce solo per il punto e virgola
  finale, voluto).

### Immagini della revisione

`B55-rf/baseline/` (percorso del costruttore prima delle correzioni), `rf-light-discord-before.png`
e `rf-offline-delete-before.png` (riproduzioni di F2 e F3), `b55-01…13` (gruppi 1–8 dopo le
correzioni), `b55-14-discord-light-1440.png` (tema chiaro), `b55-15-webhooks-dm-phone-390.png`,
`b55-16-relay-remove-phone-390.png`, `rf-modules-phone-390.png`, `rf-api-phone-390.png`,
`rf-webhook-dialog-phone-390.png`. Ispezionate: testo leggibile nel tema chiaro, nessuna
sovrapposizione a 390 px.
