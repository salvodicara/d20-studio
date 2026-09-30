# Integrazione dell’ondata W2a2 (B48–B52, B54, B55): prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · sessione browser `d20-w2a2-integ` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2a2-integ/` (fuori dal checkout).
Server locale `http://127.0.0.1:8879/` senza cache. Solo dati sintetici.

Aree dell’ondata:

- B48 editor homebrew profondo
- B49 avventure e pacchetti
- B50 dati della campagna
- B51 sessioni: ricorrenza e presenze
- B52 offline scelto e riconnessione
- B54 progetti, fabbricazione e progressioni
- B55 integrazioni esterne simulate

## Esito in breve

- **Test Node.** Suite completa verde all’inizio: **1694/1694**. Dopo la mia correzione:
  **1701/1701**, compresi i 2 test nuovi di `w2a2-integration.test.mjs`; gli altri test in più
  sono arrivati da altri builder nel frattempo.
  - Ultima esecuzione (15:24): **1710/1710**.
  - Nelle due esecuzioni precedenti c’erano 9 e poi 6 rossi, tutti nei file di B45 (viaggio e
    accampamento, fuori da quest’ondata). La revisione di B45 li stava scrivendo in quel momento:
    `travel-review.test.mjs`, `travel.mjs` e `camp.mjs` erano stati modificati pochi secondi
    prima. Senza quei file la suite era 1701/1701.
  - Nessun rosso è mai venuto da un test di W2a2 o dalla mia correzione.
- **Percorsi dell’ondata nel browser.** Gli 8 percorsi dell’ondata e le 6 regressioni richieste
  sono verdi due volte, prima e dopo la correzione. In tutto 120 gruppi `passed` per passata,
  0 errori di pagina.
- **Altre 29 regressioni.** Ho eseguito 29 percorsi in più su aree toccate dall’ondata. 24 sono
  verdi. I 5 rossi falliscono anche con i sette moduli W2a2 spenti (prova di controllo, sotto),
  quindi non dipendono da quest’ondata.
- **Caricamento pulito.**
  - 0 errori di pagina.
  - 0 errori o avvisi in console, tranne 12 risposte 404. Ciascuna è un’area pianificata e non
    ancora costruita: è così per progetto (B11).
  - Nessun’altra richiesta fallita e nessun avviso d’area nella striscia.
- **«Cosa è pronto».** Mostra il resoconto del registro: **«36 pronte · 12 da costruire · 0 con
  errori»**. Le sette aree sono «attiva» e nessuna ha avvisi circoscritti. Contributi per area:

  | Area | Contributi |
  | ---- | ---------- |
  | B48  | 10         |
  | B49  | 6          |
  | B50  | 5          |
  | B51  | 6          |
  | B52  | 9          |
  | B54  | 5          |
  | B55  | 6          |

  L’avviso «Aree aggiuntive: 1 con avvisi», visto durante la revisione di B49 e dovuto a B54,
  non c’è più.

- **Intestazione e navigazione.** Nessuna nuova riga di pulsanti.
  - L’unico servizio nuovo nell’intestazione è l’indicatore di connessione di B52, globale per
    natura.
  - A 1440 l’intestazione sta su una riga: 12 comandi nella Home (erano 11), 10 al Tavolo
    (erano 9).
  - A 390 ogni comando è trovabile e ha un bersaglio di almeno 40 px.
  - Ho trovato un punto non trovabile sul telefono, le schede della scheda personaggio, e l’ho
    corretto (vedi sotto). Resta aperta la lunghezza della colonna della campagna (vedi «Aperti»).

## Cosa si rompeva tra aree e cosa ho corretto

Nessun percorso né test dell’ondata falliva per un’interazione tra aree: la prima passata era
già verde. Il controllo della trovabilità ha però trovato un difetto nato dall’accumulo di schede
d’area sulla scheda personaggio. Correzione minima e additiva: il desktop non cambia.

| #   | Interazione                                                                                          | Sintomo (riprodotto)                                                                                                                                                                                                                                                                                                                                                                                     | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | B54 (Tempo libero, Doni) × B28 (Aspetto) × B21 (Registro, Revisioni) × scheda del core, sul telefono | A 390 la striscia delle sezioni della scheda ha 11 schede in una fila larga circa 960 px. Se ne vedono 3, e «Capacità» è già tagliata. Le due schede nuove di B54 e altre 5 sono fuori schermo, senza nessuna indicazione. È la regola di B61 (una voce conta solo se nessuna striscia deve scorrere di lato per mostrarla), la stessa che B61 aveva già corretto per il Tavolo (R-2) e per la campagna. | «Tutte le sezioni della scheda» a fine striscia sotto i 1000 px, con icona a griglia ed etichetta «Tutte» / «All». Apre l’elenco di tutte le sezioni e segna quella aperta. Dopo la scelta, la scheda aperta resta in vista nella striscia ridisegnata. È il salto rapido della scheda di D&D Beyond (DDB-060, PG-45) e lo stesso controllo di «Tutte le sezioni» della campagna. Esc chiude senza navigare e il fuoco torna al pulsante. |

Codice della correzione:

- `characters.mjs`:
  - import di `icon` e `scrollIntoStrip` da `ui.mjs`;
  - un contenitore `.character-tabs-bar` attorno alla striscia esistente, con il pulsante
    `[data-character-tabs-all]` dopo di essa (non ha `data-character-tab`, quindi non conta come
    scheda);
  - un ramo nel gestore di clic che apre il dialogo;
  - `scrollIntoStrip` in `bindCharacters`.
- `characters.css`: il pulsante è nascosto sopra i 1000 px; sotto i 1000 px la fila diventa
  flessibile.
- Test `w2a2-integration.test.mjs` (2): pulsante unico fuori dall’elenco delle schede, etichette
  IT/EN, scheda aperta invariata.
- Nel browser (percorso `w2a2-shell-journey.js`):
  - 390 IT/EN, giocatore e DM: tocco sul pulsante, elenco con tutte le 11 schede e quella aperta
    segnata, Esc senza navigazione, tocco su «Doni»; «Doni» è visibile nella striscia;
  - 1440: pulsante assente, tutte le 11 schede visibili;
  - tastiera, a 390 e a 900: Invio apre, il fuoco entra nel dialogo, Esc riporta il fuoco al
    pulsante.

  Immagini: `probes/sheet-strip-390.png`, `probes/sheet-quickjump-390.png`,
  `probes/sheet-strip-900.png`.

## Percorsi: esito

I percorsi sono copie degli originali: cambia solo la cartella delle immagini (verificato con
`diff`, 2 righe per file; 0 per `campaign-integration`). Le copie sono state eseguite in
sequenza in `d20-w2a2-integ`, con `scripts/prep.sh` e `scripts/run.sh`, lo stesso metodo degli
integratori W1a/W1b e B61. Risultati in `runs/<percorso>/<passata>.json`, riepiloghi in
`results-<passata>.txt`.

### Ondata e regressioni richieste

| Percorso                        | `run1` (prima della correzione) | `run2` (dopo) | Errori di pagina | Note                                                            |
| ------------------------------- | ------------------------------- | ------------- | ---------------- | --------------------------------------------------------------- |
| homebrew-editor (B48)           | 12                              | 12            | 0                |                                                                 |
| homebrew-editor-review (B48-rf) | 5                               | 5             | 0                |                                                                 |
| adventures (B49)                | 7                               | 7             | 0                | restituisce un testo; asserzioni interne                        |
| campaign-data (B50)             | 15                              | 15            | 0                |                                                                 |
| sessions-plus (B51)             | 15                              | 15            | 0                |                                                                 |
| offline (B52)                   | 9                               | 9             | 0                |                                                                 |
| projects (B54)                  | 6                               | 6             | 0                | gruppo 6 al telefono, sulla striscia nuova in `run2`            |
| integrations (B55)              | 9                               | 9             | 0                | vedi sotto                                                      |
| core                            | 13                              | 13            | 0                | regressione                                                     |
| combat                          | 10                              | 10            | 0                | regressione                                                     |
| campaign-integration            | 2                               | 2             | 0                | regressione                                                     |
| library                         | 3                               | 3             | 0                | regressione                                                     |
| rest-shared                     | 3                               | 3             | 0                | regressione                                                     |
| conditions                      | 11                              | 11            | 0                | regressione, `findings: []`                                     |
| `w2a2-shell-journey.js` (nuovo) | —                               | 7             | 0                | caricamento, pagine, «Cosa è pronto», intestazioni, trovabilità |

Nota su integrations: in `run1` il mio rilevatore aveva segnato rosso l’elenco `outside`. Contiene
le due aperture della scheda esterna (`dndbeyond.com/characters/000000001`), intercettate e
risposte in locale. Il percorso stesso verifica che ogni richiesta esterna sia solo quella, e
nessuna richiesta esce davvero. Ho corretto il rilevatore (`verdict.py`): il percorso passa 9/9.

### Regressioni aggiunte (aree che l’ondata estende)

Verdi:

| Percorso                                                     | Gruppi `passed` |
| ------------------------------------------------------------ | --------------- |
| builder-plus                                                 | 26              |
| character-library-review                                     | 10              |
| command-palette                                              | 13              |
| home                                                         | 13              |
| media                                                        | 13              |
| party                                                        | 14              |
| conditions-mobile                                            | 3               |
| rest-mobile-personal                                         | 4               |
| forms-mobile                                                 | 3               |
| registry-smoke                                               | 18              |
| w1b-shell                                                    | 6               |
| campaign-notes                                               | 3               |
| campaign-world                                               | 2               |
| campaign-sessions                                            | 2               |
| campaign-sharing                                             | 3               |
| campaign-mobile                                              | 2               |
| preparation                                                  | 9               |
| builder                                                      | 5               |
| builder-advance                                              | 3               |
| campaign-members                                             | 15              |
| loot                                                         | 12              |
| encounter-lifecycle                                          | 11              |
| library → library-files → library-import-recovery, in catena | 3, 2, 2         |

library-files e library-import-recovery erano rossi alla prima esecuzione solo per l’ordine:
richiedono prima library e poi l’esportazione di library-files. Eseguiti in catena sono verdi
(`results-extra2.txt`).

Rossi, ma **indipendenti da W2a2**. La prova di controllo è `scripts/without-w2a2.sh`: stesso
percorso, con i sette moduli W2a2 che rispondono 404 in ogni contesto aperto dal percorso.
Controllo: «29 pronte», nessun indicatore offline. Tutti e cinque falliscono uguali
(`results-control.txt`).

| Percorso                  | Sintomo                                                  | Causa (non W2a2)                                                                                                                                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| character-library (B21)   | «Pedine tolte dalle mappe della campagna: 2», atteso 1   | Il seme di B35 (`fog-vision-seed.mjs`) aggiunge la scena della torre con `token-mira-tower`: Mira ha due pedine.                                                                                                                                                                                                   |
| campaign-settings (B20)   | «2 creature cambieranno su 2 scene», atteso «su 1 scena» | Stessa scena di B35, con `token-goblin-1-tower` e `token-goblin-2-tower`.                                                                                                                                                                                                                                          |
| notifications (B24)       | Due voci «È il tuo turno: Livia» nella campanella        | B32 (`combat-tracker.mjs`) pubblica la stessa notifica del turno che B24 già pubblica (`notifications.mjs`); la seconda compare in «Altre aree».                                                                                                                                                                   |
| b61-review-fixes (B61)    | «player: unexpected tabs»                                | Il percorso ha l’elenco fisso delle schede del Tavolo dell’ondata 1. Le aree W2a1 ne aggiungono: Combattimento (B32), Missioni (B43), Mondo (B42), Viaggio e accampamento (B45), Visione (B35) e, per il DM, Riepilogo del gruppo (B44).                                                                           |
| b61-table-structure (B61) | «Home did not move to the Creature tab»                  | B27 × B61. Aprire la scheda Sicurezza con Invio passa per il gestore di clic di B27 (`[data-table-drawer="safety"]`), che sposta il fuoco su «Segnali di sicurezza». Così Home non arriva alla barra delle schede. Lo schema delle schede ARIA tiene il fuoco sulla scheda. Riprodotto con `probes/table-keys.js`. |

## Controlli dell’app (`w2a2-shell-journey.js`)

### Caricamento a 1440, in italiano

- 0 errori di pagina.
- 0 errori o avvisi in console, esclusi 12 404 delle aree non costruite: dice-tray, damage-tray,
  spells-plus, sheet-plus, special-moves, inventory-plus, regions, scene-assets, knowledge,
  generators, quickbar, relations-graph.
- Nessun modulo W2a2 manca.

### Pagine visitate

34 visite, 18 da giocatore e 16 da DM, con 0 errori, 0 avvisi e nessuno scorrimento orizzontale:

- Tavolo;
- campagna: Sessioni, Tempo libero, Homebrew, Integrazioni, Dati della campagna;
- editor homebrew, avventure (DM), Offline e sincronizzazione;
- Biblioteca: Le mie creazioni, Avventure (DM);
- schede di Livia: Azioni, Capacità, Tempo libero, Doni;
- preparazione, appunti, Home.

### «Cosa è pronto»

«36 pronte · 12 da costruire · 0 con errori». Le righe delle sette aree sono «attiva», senza
avvisi circoscritti. Immagini: `runs/w2a2-shell/01-cosa-e-pronto-it-1440.png`, `01b-…`, e
`01c-report-w2a2-rows-it-1440.png` con le righe B48–B55.

### Intestazione a 1440

Una riga, sia nella Home sia al Tavolo; nessuna sovrapposizione né uscita dallo schermo.

- Home, 12 comandi: marchio, Inizio, Personaggi, Campagne, Biblioteca, Cerca, Appunti personali,
  Notifiche e richieste, Preferenze, Aiuto, **«In linea — tutto sincronizzato»** (B52), Account.
- Tavolo, 10 comandi.
- La riga in alto del Tavolo ha solo i comandi del core: 4 per il DM, 1 per il giocatore.

### Intestazione a 390, IT ed EN, con tocco

- Home: 2 righe, 109 px, 12 comandi.
- Tavolo: 1 riga, 63 px, 8 comandi (Aiuto è nel menu App, per B61).
- Campanella, Account, Aiuto e l’indicatore offline sono visibili; l’indicatore anche al Tavolo.
- Nessun bersaglio sotto i 40 px, nessuna sovrapposizione.

### Trovabilità degli ingressi, secondo la collocazione del registro

- **Campagna:**
  - A 1440 la colonna ha 24 sezioni per il DM e 20 per il giocatore. Tempo libero, Homebrew e
    Integrazioni (più Dati della campagna, solo per chi gestisce la campagna, come l’export di
    Kanka) sono nella colonna, a 1 clic.
  - A 390 la striscia laterale mostra 3–4 sezioni. Le nuove si aprono in 2 tocchi con «Tutte le
    sezioni» di B61.
  - I contributi di B51 e B52 alla campagna sono incorporati nella scheda Sessioni, nella riga
    della sessione, nel resoconto e nell’appunto: non creano voci di navigazione (verificato).
- **Scheda:**
  - 1440: 11 schede tutte visibili, Tempo libero a 1 clic.
  - 390: 3 schede su 11 visibili; con la correzione ogni sezione è a 2 tocchi.
- **Biblioteca:** «Le mie creazioni» per entrambi i ruoli, «Avventure» per il DM.
- **Tavolo:** B48 e B55 aggiungono solo pannelli nella scheda Creatura e voci nel menu della
  pedina, e nessuna scheda nella barra laterale. Lo esercitano i loro percorsi.

## File toccati

- `design/blueprint/characters.mjs`: modifica additiva (vedi sopra).
- `design/blueprint/characters.css`: blocco additivo.
- `design/blueprint/tests/w2a2-integration.test.mjs`: nuovo.
- `changes/interview-01/blueprint-checks/w2a2-shell-journey.js`: nuovo. Come gli altri percorsi,
  senza punto e virgola finale attorno alla funzione; prettier differisce solo per quello.
- Questo rapporto.

Prettier passa su `characters.mjs`, `characters.css` e sul test.

## Aperti (non corretti qui, con motivo)

1. **La colonna della campagna è lunga (P3, densità).**
   - A 1440 × 900 il DM ha 24 sezioni e ne vede 15 senza scorrere la pagina. Homebrew,
     Integrazioni e Dati della campagna stanno sotto la piega, insieme a Bottino, Sicurezza,
     Preparazione, Regole, Impostazioni e Assistente.
   - È ammesso dalla regola di B61 (scorre la pagina, non una striscia), e ogni sezione resta a
     1 clic.
   - Raggrupparle, come fa la barra di Kanka con le sue sezioni, è una scelta di struttura per il
     coordinatore o per il proprietario, non una correzione minima.
2. **Rossi indipendenti da W2a2.** Sono i cinque percorsi della tabella sopra, nati dall’ondata
   W2a1 (B32, B35, le schede nuove del Tavolo) e da B27 × B61. Li lascio a chi integra W2a1 o al
   coordinatore. Le correzioni probabili:
   - aggiornare le attese di character-library e campaign-settings sulla scena della torre di B35;
   - togliere il doppione della notifica di turno in B32;
   - rendere dinamico l’elenco delle schede in `b61-review-fixes`;
   - in `bindTableDrawer` di B27, non spostare il fuoco quando la scheda Sicurezza si apre da
     tastiera, e lasciarlo sulla scheda come vuole il pattern delle schede.
3. **Compiti del coordinatore lasciati da B52:**
   - documentare in `DEVELOPMENT.md` il gancio `offline:write` che B52 ha aggiunto in `app.mjs`;
   - la proposta di un punto del registro per una fascia di stato globale (DDB-066).
4. **Test di B45 in corso.** I test di viaggio e accampamento sono stati rossi per qualche
   minuto mentre la loro revisione li scriveva, poi verdi (1710/1710). Non li ho toccati.

## Come ripetere

Dalla cartella delle prove, con il server avviato:

```sh
playwright-cli -s=d20-w2a2-integ open http://127.0.0.1:8879/
TAG=run2 scripts/run.sh homebrew-editor homebrew-editor-review adventures campaign-data \
  sessions-plus offline projects integrations core combat campaign-integration library \
  rest-shared conditions w2a2-shell
TAG=control scripts/without-w2a2.sh character-library campaign-settings notifications \
  b61-review-fixes b61-table-structure
node --test design/blueprint/tests/*.test.mjs   # dal worktree
```
