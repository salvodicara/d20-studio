# B52 — Offline scelto e riconnessione: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione browser
`d20-b52` · cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B52/`.

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B52 (SV-31, SV-32, SV-34; si appoggia a SV-30).
Righe di mercato: `changes/interview-01/market-census/campaign-tools.md` (CMP-218, CMP-222,
CMP-224, sintesi 18), `dndbeyond.md` (DDB-066, DDB-155, DDB-207), `crpg.md` (CRP-188),
`vtt-light.md` (VTL-210). Contratto: `docs/interview/FEATURES.md` F-026 (I-114/Q096: lettura e
modifiche locali di scheda e appunti personali, salvataggio riconoscibile, sincronizzazione
successiva; niente multiplayer offline dedotto).

## File

Nuovi (tutti dell'area):

- `design/blueprint/offline.mjs` — modulo d'ingresso `register(registry)` con dominio puro
  esportato (disponibilità, cattura delle modifiche, coda, sincronizzazione, conflitti) e UI
  (pagina, interruttori, gestori). Sezione di stato `offline` (`undo: "snapshot"` più
  `afterUndo` per gli appunti).
- `design/blueprint/offline.css` — solo classi `.offline-*` e il glifo della nuvola del servizio
  `[data-service="offline"]` nell'intestazione.
- `design/blueprint/tests/offline.test.mjs` — 15 test (dominio, gancio con il vero store e il
  registro, gestori della UI con il doppio di elemento di `home-harness.mjs`).
- `changes/interview-01/blueprint-checks/offline-journey.js` — percorso nel browser.

`extensions.mjs` elencava già `offline` (B52).

**Un'unica modifica additiva a un file condiviso** — `design/blueprint/app.mjs`, funzione
`commit()`, subito prima del rifiuto «Sei senza rete…» (stesso schema dell'evento host
`preferences:dialog` di B22; senza un gestore il comportamento è identico a prima):

```js
if (offline) {
  const write = { title, local: Boolean(options.local), accept: false, wrap: null };
  registry.emit("offline:write", write);
  if (typeof write.wrap === "function") mutator = write.wrap(mutator);
  if (write.accept && !options.local) options = { ...options, local: true, visibility: "private" };
}
```

Motivo: senza questo gancio una modifica alla propria scheda senza rete viene rifiutata dal core
prima di arrivare a qualunque area, quindi la coda di F-026 (modifiche alla scheda salvate sul
dispositivo e sincronizzate dopo) e il conflitto al ritorno non si potevano costruire. Il gancio
permette a un'area di (1) avvolgere la mutazione per registrare la modifica in coda **nello stesso
commit** (così Undo toglie insieme modifica e voce di coda) e (2) accettare come locale una
modifica condivisa che resta dentro contenuti resi disponibili offline. Da riportare in
`DEVELOPMENT.md` a cura del coordinatore.

## Dove si trova

| Superficie                                                                                        | Percorso                                           | Distanza                                                                                                                       |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **Indicatore di connessione** (nuvola nell'intestazione, su ogni pagina e al Tavolo)              | servizio `offline`, `header: true`, ordine 45      | sempre visibile; stato nel nome accessibile e nel suggerimento                                                                 |
| **Offline e sincronizzazione** (pagina impostazioni: stato, conflitti, coda, disponibili offline) | `#offline`                                         | 1 clic dalla nuvola; ricerca «offline», «sincronizzazione»…; palette «Apri Offline e sincronizzazione»; campanella (conflitti) |
| Interruttore **«Disponibile offline»** sulla scheda                                               | sezione `offline-sheet` della scheda Azioni        | Personaggi → Apri scheda: 2 clic (sotto «Pronto ad agire» e Caratteristiche); comando «Disponibile offline: … questa scheda»   |
| Interruttore **«Disponibile offline»** sull'appunto                                               | sezione `offline.entry` della pagina di un appunto | Appunti personali → appunto: 2 clic                                                                                            |
| Preferenze › **Offline** (dispositivo): «Rendi disponibili offline le tue schede quando le apri»  | impostazione `offline.auto`                        | 2 clic                                                                                                                         |
| Campanella: «Conflitto da rivedere: …»                                                            | notifiche `offline-conflicts`                      | apre `#offline`                                                                                                                |

Collocazione (B61): servizio globale nell'intestazione perché la connessione riguarda ogni pagina
(DDB-066 banner di app, CRP-188 indicatore); nessuna nuova riga di pulsanti; al telefono la nuvola
sta nella riga unica del Tavolo (misurato: x 298–338 su 390, fino a 378 px con Account). Le sezioni
stanno nella pagina a cui appartengono (scheda, appunto); nessuna scheda del Tavolo, perché
l'area non agisce sulla mappa.

## Capacità → percorso → prova

| Capacità (censimento)                                         | Percorso e comandi                                                                                                                                                                                                                                                                                                                                                                                                                                     | Esito verificato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Regola / fonte                                                                                                                                                                                                                                                                                                 | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                                            | Prova                                                                                                                                                                                                                                                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SV-31** Scegliere che cosa è disponibile offline            | Scheda di Livia › «Disponibile offline» (tastiera: Tab + Spazio); appunto «Solo io» › «Disponibile offline»; nuvola › pagina: «Rendi disponibile», «Rendi disponibile tutto», «Rimuovi», «Rimuovi tutto dal dispositivo», «Apri»; Preferenze › Offline (automatico all'apertura)                                                                                                                                                                       | Solo le **proprie** schede e i **propri** appunti (il DM vede Doran, non Livia né l'appunto del giocatore); la pagina elenca «2 elementi · 7,6 kB su questo dispositivo» con tipo, nome, «Copia delle HH:MM», dimensione, «N in coda», conflitti; scaricare **senza rete è rifiutato** («serve la rete: va scaricato su questo dispositivo»); rimuovere un elemento con modifiche in coda è rifiutato con il motivo; il reload conserva l'elenco; con l'impostazione attiva, aprire Mira la rende disponibile                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | F-026 (I-114): scheda e appunti personali; «Contenuti non accessibili non diventano disponibili; segreti altrui non devono essere distribuiti per abilitare l'offline» (solo contenuti propri); dimensione = copia JSON salvata                                                                                | Notion «Available offline» per pagina e Impostazioni › Offline con l'elenco (CMP-222); D&D Beyond app: download per contenuto, «Download all», dimensioni (DDB-207); preload come impostazione di 5e.tools (CMP-224)                                                       | test `only your own…`, `page, sheet section…`, `device setting…`; percorso gruppi 1 e 4b, 5; `b52-01-sheet-switch-it-1440.png`, `b52-02-note-switch-it-1440.png`, `b52-03-available-list-it-1440.png`                                                                                                                              |
| **SV-32** Coda delle modifiche e conflitti alla riconnessione | Senza rete (Preferenze › «Simula assenza di rete»): Livia › Inventario › Pozione › Dettagli › Modifica dati (×3→×2); Livia › Storia › Modifica storia; appunto › Modifica › Salva › Applica; Mira › Modifica storia; pagina › «Annulla» su una riga (Invio); «Nel frattempo al tavolo · simulazione» › «Registra la modifica del DM» (×5); ritorno in rete; «Tieni la tua» / «Tieni quella del DM» / «Tienile entrambe» (testi); «Riapri il confronto» | Le modifiche a scheda e appunto disponibili offline si applicano subito sul dispositivo e entrano in coda con stato «In coda · su questo dispositivo» (registro **privato** finché non si sincronizzano); Mira (non disponibile offline) è **bloccata con il motivo** «Sei senza rete: questa modifica condivisa non può essere applicata. «Mira» non è disponibile offline…» e compare in «Non salvate senza rete»; punti ferita, condizioni, risorse del turno, scene, altre aree: bloccati con il loro motivo; più modifiche allo stesso valore si fondono, tornare al valore iniziale toglie la voce; «Annulla» su una riga riporta la corda a 1; Undo del core toglie insieme modifica e voce. Al ritorno: storia e appunto «Sincronizzata», la pozione è un **conflitto**: tre riquadri «Prima · valore di partenza ×3», «La tua · su questo dispositivo ×2», «Il DM · al tavolo ×5»; la scheda condivisa mostra ×5 e la tua versione resta nel conflitto (**nessuna sovrascrittura**); la scelta è registrata nel registro condiviso, annullabile con Undo e correggibile con «Riapri il confronto» (rifiutato se la scheda è cambiata dopo la scelta); il reload conserva conflitti e scelte | F-026: modifiche locali di scheda e appunti, sincronizzazione successiva, «nessuna esecuzione differita automatica di attacchi/scambi condivisi dedotta» (tiri, riposi, PF, Tavolo restano bloccati); I-114 «i conflitti sono un punto da definire» → confronto e scelta esplicita, nessuna fusione silenziosa | LegendKeeper: lavoro offline con salvataggio locale e sincronizzazione successiva (CMP-218); confronto e scelta «copia o ripristina» come File recovery di Obsidian (CMP-221, sintesi 18 di campaign-tools); banner e dati dell'ultima connessione di D&D Beyond (DDB-066) | test `an accepted offline change…`, `the queue coalesces…`, `sync…`, `keep both…`, `hook with the real store…`, `reconnection…`, `notes…`, `undo one queued…`; percorso gruppi 2 e 3; `b52-04-offline-queue-it-1440.png`, `b52-05-sheet-offline-it-1440.png`, `b52-07-conflict-it-1440.png`, `b52-08-resolved-history-it-1440.png` |
| **SV-34** Stato della connessione e riconnessione automatica  | Nuvola nell'intestazione; pagina › riquadro di stato con «Riprova ora» (senza rete) e «Sincronizza ora» (in rete con coda); ritorno della rete da Preferenze; reload con una modifica in coda                                                                                                                                                                                                                                                          | Stati nel nome accessibile e nel suggerimento, con glifo e colore propri: «In linea — tutto sincronizzato», «Senza rete — N modifiche in coda» (punto), «Riconnessione in corso» (pulsa; statico con movimento ridotto), «Da rivedere — N conflitti» (punto); al ritorno della rete la riconnessione parte **da sola** (1,5 s), sincronizza e avvisa «Di nuovo in linea: 2 modifiche sincronizzate e 1 conflitto da rivedere…»; «Riprova ora» registra il tentativo («Tentativi di riconnessione: 1 · … ancora senza rete»); riaprendo l'app con una modifica in coda compare «Riconnessione in corso» e la coda si sincronizza senza azioni                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Rete simulata dalla shell (SV-30); stato del dispositivo, non dati di gioco (mai nello stato condiviso)                                                                                                                                                                                                        | D&D Beyond: riconnessione automatica dopo le cadute (DDB-155) e banner che sparisce al ritorno (DDB-066); Solasta II: indicatore di connessione (CRP-188); Owlbear: stato della connessione documentato (VTL-210)                                                          | test `reconnection…`, `reopening the app…`, `retry while offline…`, `page, sheet section, header label…`; percorso gruppi 2, 3, 4, 5; `b52-06-reconnecting-it-1440.png`                                                                                                                                                            |
| DM e giocatore; privacy                                       | «Visita come» DM dopo la riconnessione; campanella; ricerca                                                                                                                                                                                                                                                                                                                                                                                            | Il DM vede la propria pagina (Doran tra i candidati, nulla del giocatore), nessun conflitto nella sua campanella, nessun titolo o testo dell'appunto «Solo io»; vede nel registro condiviso solo «Sincronizzazione dopo la riconnessione: 3 modifiche fatte senza rete (Livia)» e le scelte sui conflitti; la sincronizzazione di sole modifiche personali resta privata; gli appunti sincronizzati tengono nella cronologia solo il titolo                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | Note «Solo io» e schede private mai leggibili dal DM (DEVELOPMENT.md, increment 7)                                                                                                                                                                                                                             | —                                                                                                                                                                                                                                                                          | test `reconnection…` (notifiche per ruolo), `notes…`; percorso gruppo 3; `b52-09-dm-view-it-1440.png`                                                                                                                                                                                                                              |

Trasversali verificati: italiano predefinito e inglese (telefono EN); tastiera (Spazio
sull'interruttore, Invio su «Annulla questa modifica: Livia · Corda», focus visibile sulla
traccia dell'interruttore); tocco a 390×844 (`isMobile`, `hasTouch`); ogni pulsante e input della
pagina e i servizi dell'intestazione ≥ 40 px, l'interruttore usa tutta l'etichetta (≥ 40 px) come
bersaglio; nessuno scorrimento orizzontale a 1440 e 390 (pagina, scheda, Tavolo); reload;
«Ripristina esempio» rigenera la sezione (`seed`) e svuota la memoria del dispositivo. Dadi fisici
e digitali: nessun tiro in quest'area; i tiri senza rete restano rifiutati (toccano registri
condivisi).

## Comandi eseguiti ed esito

```sh
node --test design/blueprint/tests/offline.test.mjs          # 15/15
node --test design/blueprint/tests/*.test.mjs               # 1538/1538 (24/09, 13:59)
# da ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B52/
playwright-cli -s=d20-b52 open http://127.0.0.1:8879/
playwright-cli -s=d20-b52 --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/offline-journey.js
```

Esito finale del percorso (log `offline-journey-final.log` nella cartella delle prove): **8 gruppi
superati (1a, 1b, 1c, 2, 3, 4, 4b, 5), 0 errori di pagina**. Il percorso crea i propri contesti
(1440×900 IT; 390×844 EN tattile) e li chiude. Durante lo sviluppo la suite completa ha avuto
fallimenti transitori di altre aree in costruzione (`journal-plus.mjs` con un errore di sintassi,
`lighting.test.mjs`), passati al giro successivo senza interventi.

Immagini (1440×900 salvo indicazione): `b52-01-sheet-switch-it-1440.png`,
`b52-02-note-switch-it-1440.png`, `b52-03-available-list-it-1440.png`,
`b52-04-offline-queue-it-1440.png`, `b52-05-sheet-offline-it-1440.png`,
`b52-06-reconnecting-it-1440.png`, `b52-07-conflict-it-1440.png`,
`b52-08-resolved-history-it-1440.png`, `b52-09-dm-view-it-1440.png`; telefono 390:
`b52-10-phone-en-390.png` (pagina intera), `b52-11-phone-table-en-390.png`. Ispezionate: nessun
controllo sovrapposto; nella colonna destra da 1440 le azioni di una riga («Disponibile senza
rete», «Apri», «Rimuovi») vanno a capo sotto il testo quando serve, senza tagli; il suggerimento
di B30 e gli avvisi della shell possono coprire per qualche secondo l'angolo in basso (non sono
dell'area).

## Scelte fatte in autonomia (con motivo)

- **Solo contenuti propri** (schede che giochi, appunti tuoi): F-026 parla di lavoro personale e
  vieta di distribuire segreti altrui per abilitare l'offline.
- **Modifiche in coda solo per le schede disponibili offline**; il resto delle modifiche condivise
  resta rifiutato come nel core, con il motivo preciso (non disponibile offline, Tavolo e
  campagna, schede altrui, PF/condizioni/risorse del turno). Ogni motivo comincia con la frase del
  core, così i percorsi esistenti che la cercano restano validi.
- **Nessuna modifica di comportamento finché nulla è disponibile offline**: il gestore del gancio
  non accetta e non avvolge nulla, quindi gli altri percorsi con la rete simulata non cambiano.
- **Conflitto = stessa voce cambiata da entrambi** (per ogni oggetto dell'inventario, per ogni
  campo della scheda). La scheda condivisa mostra la versione degli altri finché non scegli: chi è
  al tavolo non vede sparire la modifica del DM, e la tua non va persa.
- **Dopo la sincronizzazione si apre una nuova visita di Undo** (`newUndoVisit`, come il cambio di
  campagna di B13): i passi offline sono diventati condivisi e non si annullano più come locali; le
  scelte sui conflitti hanno Undo e «Riapri il confronto».
- **Glifo della nuvola dal CSS**: il punto `service` ha un'icona statica scelta fra quelle del
  core (nessuna nuvola); il nome del servizio è dinamico (getter su `label`) e `offline.css` legge
  le sue prime parole per disegnare la nuvola giusta, senza toccare il DOM fuori dall'area.
- **Simulazione della modifica del DM** con un controllo dichiarato «Dimostrazione»: in un solo
  browser le due identità condividono la rete simulata, quindi il DM non può modificare «dal
  tavolo» mentre il giocatore è offline. Stesso principio delle revisioni concorrenti simulate
  dal dominio in campaign-content.

## Limiti onesti

- **Rete simulata**: la casella «Simula assenza di rete» di Preferenze è della shell e si
  azzera al reload. Un reload equivale quindi a riaprire l'app con la rete: la coda resta sul
  dispositivo e si sincronizza da sola (provato). Non è simulabile un riavvio senza rete.
- **Lettura non nascosta**: senza rete le pagine non disponibili offline restano leggibili,
  perché l'app aperta le ha già in memoria e l'area non può sostituire le pagine del core. La
  differenza provata è sulle modifiche (bloccate) e sugli avvisi nella scheda e nell'appunto
  («non è tra i contenuti offline: lo vedi perché era già aperto»). Il prodotto dovrà mostrare
  l'errore «non disponibile offline» di DDB-066 dopo un riavvio senza rete.
- **Appunti**: si modificano senza rete solo gli appunti privati («Solo io»), come già stabilito
  dal dominio (gli appunti condivisi richiedono la connessione); nessun altro può modificarli,
  quindi per gli appunti non nascono conflitti. Un appunto nuovo creato senza rete non entra da
  solo nella coda (resta salvato sul dispositivo come nel core).
- **Un solo browser, due identità**: niente consegna in tempo reale né altri dispositivi; la
  modifica «degli altri» è simulata e arriva alla sincronizzazione. La sincronizzazione riguarda
  la coda dell'identità attiva; l'altra si sincronizza quando torna attiva in rete.
- **Nessuno spazio reale** (quota, Wi‑Fi per i download grandi di DDB-207): la dimensione è quella
  della copia JSON; non ci sono file grandi da scaricare.
- «Riprova ora» registra il tentativo: con la rete simulata spenta fallisce sempre, e la rete
  torna solo da Preferenze. Nessun ritmo di tentativi automatici in background (niente timer
  finché si è senza rete, per non ridisegnare la pagina mentre si scrive).
- L'elenco «Non salvate senza rete» è della visita (memoria del dispositivo), non si conserva al
  reload.
- Dimostrato in Chromium; il glifo usa `mask-image` (supporto moderno).
- Dati sintetici; nessun backend, nessuna autenticazione, nessuna crittografia locale del
  contenuto offline.

## Review and fixes

24/09/2026 · revisione indipendente con correzioni (non ho costruito B52) · sessione browser
`d20-b52-rf` · prove in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B52-rf/`
(`baseline/`: percorso del costruttore rieseguito prima delle correzioni, 8 gruppi superati;
`regression/`: percorsi di altre aree). Le immagini `b52-01…13` di `B52-rf/` sostituiscono
quelle di `B52/`, che restano come stato prima della revisione.

Controllato contro la scheda B52 (SV-31, SV-32, SV-34) e le righe di mercato CMP-218, CMP-221,
CMP-222, CMP-224, DDB-066, DDB-155, DDB-207, CRP-188, VTL-210: tutto usato nell'app vera,
con clic, tastiera, tocco, due identità («Visita come»), italiano e inglese, 1440 e 390 px.

### Difetti trovati e corretti

| #   | Gravità | Riproduzione (prima della correzione)                                                                                                                                                                                                                                                                                                                                                                                | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1      | Livia «Disponibile offline» → rete tolta → Pozione ×3→×2 (in coda) → «Visita come» DM → rete tornata → il DM porta la Pozione a ×5 dalla scheda → «Visita come» Giocatore. Dopo 1,5 s: «Di nuovo in linea: 1 modifica sincronizzata», cronologia «Sincronizzata», scheda ×5: la ×2 del giocatore **persa in silenzio** (criterio 3 violato). Il conflitto nasceva solo dal controllo di simulazione.                 | Corretto. `syncIdentity` confronta il valore condiviso con quello in coda: se qualcun altro l'ha cambiato è un conflitto (tre riquadri ×3 / ×2 / ×5, scheda condivisa sulla versione del DM, scelta esplicita). Un cambio vero vince sulla simulazione e non viene mai sovrascritto; testo assente e vuoto sono lo stesso valore. Test `review: a real change…`, `review: the other identity's change arrives…`; percorso gruppo 6; `b52-12-real-dm-conflict-it-1440.png`. |
| 2   | P2      | Livia disponibile offline, senza rete: Azioni › Forza › «Tira / registra» (dado digitale o fisico). Il tiro veniva **accettato**: `lastCheck` in coda come «Livia · lastCheck», voce di registro privata, nessun tiro nel registro condiviso; alla sincronizzazione il risultato compariva sulla scheda senza traccia per il DM. Contraddiceva la regola dichiarata («i tiri senza rete restano rifiutati») e F-026. | Corretto. I risultati di tiro scritti sulla scheda (`lastCheck`, `lastHealing`) sono rifiutati con il motivo «Sei senza rete: … I tiri di dado, digitali o fisici, vanno nel registro condiviso: tirali quando torni in rete.»; `lastSlotTurn` si aggiunge alle risorse del turno. Test `review: an offline dice roll…`; percorso gruppo 6.                                                                                                                                |
| 3   | P3      | Coda con due modifiche a Livia e una all'appunto «Solo io»: la voce **condivisa** diceva «3 modifiche fatte senza rete (Livia)»; il DM veniva a sapere che c'era una modifica privata in più.                                                                                                                                                                                                                        | Corretto. La voce condivisa conta e nomina solo le modifiche alle schede condivise («2 modifiche fatte senza rete (Livia)»); una sincronizzazione di sole modifiche personali resta privata come prima. Test `review: the shared sync entry…`; percorso gruppo 3 aggiornato.                                                                                                                                                                                               |
| 4   | P3      | In linea con una modifica ancora in coda (fase «Riconnessione in corso» o «Sincronizza ora»), «Annulla» su una riga riportava la voce al valore di partenza senza guardare la scheda condivisa: poteva cancellare il valore messo nel frattempo da un altro.                                                                                                                                                         | Corretto. «Annulla» sulla riga esiste solo senza rete (dove toglie modifica e voce di coda nello stesso passo); in linea la modifica passa per la sincronizzazione e il suo confronto. Test `review: undoing one queued change…`; percorso gruppo 6.                                                                                                                                                                                                                       |
| 5   | P3      | Una voce senza nome nella coda o nel conflitto mostrava la chiave interna (es. «hitDice», «lastCheck»).                                                                                                                                                                                                                                                                                                              | Corretto. Nomi per Dadi Vita, Taglia, Immunità alle condizioni; ogni altra voce si chiama «Altro valore della scheda» / «Other sheet value». Test `review: queued values are named…`.                                                                                                                                                                                                                                                                                      |
| 6   | P3      | In linea l'elenco «Disponibili offline» diceva «Copia delle 14:09 · 7,5 kB» accanto a «Copia aggiornata», con ora e dimensione del momento dello scaricamento anche dopo modifiche successive.                                                                                                                                                                                                                       | Corretto. In linea: «Sul dispositivo dalle HH:MM» e la dimensione attuale della copia (che segue ogni modifica); senza rete: «Copia delle HH:MM» dell'ultima connessione. Test `review: the list shows…`; percorso gruppi 1c e 2.                                                                                                                                                                                                                                          |

### Verificato senza difetti

- **SV-31**: interruttore sulla scheda (tastiera e tocco, bersaglio 40 px a 390) e sull'appunto;
  pagina con elenco, dimensioni, «Rendi disponibile tutto», «Rimuovi tutto»; scaricare senza
  rete è rifiutato con il motivo; rimuovere con modifiche in coda è rifiutato; il DM vede solo
  Doran e i propri appunti. Impostazione del dispositivo per le schede aperte funzionante.
- **SV-32**: coda con stato, modifiche fuse sulla stessa voce, Undo del core che toglie insieme
  modifica e voce; Mira, PF («Danni, cure e condizioni» dice già che nulla entra in coda),
  concentrazione, riposi, Tavolo e campagna restano bloccati con il motivo; conflitto con
  confronto, tre scelte, Undo e «Riapri il confronto».
- **SV-34**: nuvola con quattro stati (nome accessibile e suggerimento), riconnessione automatica
  dopo 1,5 s, «Riprova ora» che registra il tentativo, riapertura con coda che sincronizza da sola.
- **Privacy e ruoli**: nessun dato della coda, dei conflitti o degli appunti «Solo io» nella
  pagina, nella campanella o nella ricerca del DM.
- **Collocazione (B61)**: un solo servizio globale nell'intestazione (regola 6), nessuna riga
  nuova, nessun pannello del Tavolo (l'area non agisce sulla mappa); al telefono la nuvola resta
  nella riga del Tavolo; sezioni nella scheda e nell'appunto (regola 7).
- **Modifica condivisa di `app.mjs` (gancio `offline:write`)**: senza contenuti offline il
  gestore non accetta né avvolge nulla (registra solo il tentativo rifiutato nella memoria del
  dispositivo). Rieseguiti con percorsi copiati verso `regression/`: `core-journey.js` (13 passi,
  compreso «offline preview») e `loot-journey.js` (compreso «offline take refused»), 0 errori.

### Registrati, non corretti (con motivo)

- **Nessun banner offline come DDB-066** (P3, fedeltà). Andando senza rete cambia solo la
  nuvola dell'intestazione (rossa, barrata, con punto). Il banner di DDB-066 è del core (SV-30,
  PROVEN Inc.6) e il registro non ha un posto per una fascia sotto l'intestazione; il pattern
  della scheda per SV-34 è l'indicatore (Solasta II CRP-188) più la riconnessione (DDB-155), che
  ci sono. Proposta al coordinatore: un punto del registro per una fascia di stato globale.
- **Il DM vede il valore non ancora sincronizzato** (limite del prototipo). Con «Visita come» le
  due identità condividono un solo stato, quindi il DM vede ×2 prima della sincronizzazione; nel
  prodotto vedrebbe ×3. Serve una sovrapposizione per identità nel core. Dopo la correzione 1, se
  il DM cambia quel valore, il conflitto resta corretto (×3 / ×2 / ×5).
- **Posizione dell'interruttore sulla scheda**: Notion lo mette nel menu «•••» della pagina;
  qui è una sezione in fondo alla scheda Azioni (più il comando della palette). Il dialogo
  «Gestisci personaggio» è di character-library senza punto d'estensione; `sheet-section` è il
  posto previsto. Se si vuole la fedeltà a Notion serve un punto `sheet-menu`.
- **Interruttore dell'appunto**: gli appunti «Solo io» si modificano senza rete comunque (regola
  del core da Inc.6); l'interruttore aggiunge elenco, coda e stato. Bloccare gli appunti non
  disponibili cambierebbe i percorsi offline di altre aree. Già dichiarato dal costruttore.
- **Falso conflitto possibile** se chi gioca cambia lo stesso valore in linea nei 1,5 s tra il
  ritorno della rete e la sincronizzazione: nessuna sovrascrittura, solo una scelta in più.
- `DEVELOPMENT.md` deve ancora documentare il gancio `offline:write` (compito del coordinatore).

### File toccati dalla revisione

Solo file dell'area: `design/blueprint/offline.mjs`, `design/blueprint/tests/offline.test.mjs`
(7 test nuovi), `changes/interview-01/blueprint-checks/offline-journey.js` (gruppo 6, controlli
dei gruppi 1c, 2 e 3 aggiornati, immagini in `B52-rf/`), questo file. Nessun file condiviso.

### Comandi ed esito

```sh
node --test design/blueprint/tests/offline.test.mjs      # 22/22 (15 + 7 della revisione)
node --test design/blueprint/tests/*.test.mjs           # 1620/1627 alle 14:22 (1617 alle 14:21); i falliti sono
  # di campaign-data, quests-review e journal-plus, aree in modifica in parallelo che non
  # importano offline.mjs; il giro precedente (14:19) falliva invece in crafting/projects
# da ~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B52-rf/
playwright-cli -s=d20-b52-rf --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/offline-journey.js
```

Percorso finale (`offline-journey-final.log`): **9 gruppi superati (1a, 1b, 1c, 2, 3, 4, 4b, 5,
6), 0 errori di pagina**. Immagini nuove: `b52-12-real-dm-conflict-it-1440.png`,
`b52-13-conflict-en-390.png` (confronto impilato, nessuno scorrimento orizzontale); ispezionate.
