# Integrazione dell’ondata W2b1 (B33, B34, B36, B37, B38, B40): prove

24–25/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · server locale `http://127.0.0.1:8879/` senza cache · solo dati sintetici.

L’incarico ha avuto tre sessioni. Le prime due si sono interrotte:

- sessioni 1–2: sessione browser `d20-w2b1-integ`, prove in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-25/W2b1-integ/`;
- sessione 3 (questa, che chiude il lavoro): sessione browser `d20-w2b1-i3`, prove in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-26/W2b1-integ/`.

Ho ricostruito il lavoro delle sessioni 1–2 da tre fonti:

- i file;
- i loro risultati;
- le copie dei percorsi fatte dall’integratore W2b2 e il backup `interview-01-w2a-2026-09-25.tgz`.

Ho riletto ogni loro modifica ai percorsi. Più sotto dico quali ho tenuto e quale ho corretto.

Aree dell’ondata:

- B33 danni, cure e registro dei PF (`damage-tray`)
- B34 vassoio dei dadi (`dice-tray`)
- B36 inventario completo (`inventory-plus`)
- B37 scheda completa (`sheet-plus`)
- B38 incantesimi completi (`spells-plus`)
- B40 movimenti e azioni speciali (`special-moves`)

## Esito in breve

- **Test Node.**
  - All’inizio di questa sessione: **2042/2042**.
  - Alla fine: **2046/2046** (`node-run4.txt`, dopo l’ultima modifica). I 4 test nuovi sono in
    `w2b1-integration.test.mjs`, che ora ne ha 9.
  - Ogni test nuovo l’ho visto fallire prima della correzione.
- **Percorsi.** Nella passata finale sono verdi **29 percorsi su 29**, eseguiti uno alla volta,
  con 0 errori di pagina (tabella sotto). Sono:
  - i 6 dell’ondata con le loro revisioni, più `w2b1-shell`;
  - le regressioni richieste: core, combat, conditions, area, multi-self, loot, token-menu,
    notifications e dice-3d;
  - i percorsi che le correzioni hanno toccato.
- **I cinque problemi lasciati dall’integratore W2b2 sono chiusi.** Per ognuno ho trovato la
  causa:

  | Problema lasciato da W2b2                         | Causa                                                 | Stato                                                                                                                              |
  | ------------------------------------------------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
  | core, b61-table-structure, b61-review-fixes rossi | percorsi superati da B34 («Tira i dadi» apre «Dadi»)  | aggiornati al vassoio (sessione 2). In b61-review-fixes ho ripristinato il controllo «una riga», che la sessione 2 aveva allentato |
  | area rosso con B40                                | difetto dell’app: B40 si prendeva il clic della mappa | corretto nella sessione 2, verde                                                                                                   |
  | «Termina turno» su due righe a 1440               | difetto dell’app: B40 aggiungeva «Mosse» alla barra   | corretto ora (n. 1)                                                                                                                |
  | multi-self rosso                                  | percorso superato: acqua di B40 e trappola di B41     | corretto ora (n. 4)                                                                                                                |
  | loot rosso                                        | percorso superato: borsa e righe d’inventario di B36  | corretto nella sessione 2 e ora (n. 5)                                                                                             |

- **Due difetti nuovi tra aree**, trovati dai percorsi e corretti a partire da un test:
  - **B34 × B56**: i tiri del vassoio mancavano in «Tiri recenti» (n. 2);
  - **B34 × B17**: il badge del Registro e la campanella del DM non contavano i tiri del
    vassoio del giocatore (n. 3).
- **Caricamento pulito** (`w2b1-shell-journey.js`):
  - 0 errori di pagina, 0 errori o avvisi in console, 0 richieste fallite;
  - «Cosa è pronto» mostra «48 pronte · 0 da costruire · 0 con errori»;
  - le sei aree sono attive e senza avvisi. Contributi: B33 8, B34 5, B36 3, B37 9, B38 4,
    B40 11.
- **Trovabilità a 1440.** Tutto a 1–2 clic:

  | Ingresso                               | Clic              |
  | -------------------------------------- | ----------------- |
  | scheda «Dadi»                          | giocatore 1, DM 2 |
  | «Tira i dadi» della barra              | 1                 |
  | «Mosse»                                | 1                 |
  | «Regole di movimento» (solo DM)        | 1                 |
  | righello a due livelli (gruppo Misura) | 2                 |
  | «Punti ferita…» nel menu della pedina  | presente          |
  | Inventario e Magie della scheda        | 1                 |
  | Preparazione › «Movimento e griglia»   | 2                 |

  Per il DM «Dadi» è fuori dalla barra laterale: la si apre da «Tutti i pannelli». A 390 ogni
  ingresso è a 1–2 tocchi.

## Cosa si rompeva tra aree e cosa ho corretto (questa sessione)

Correzioni minime e additive. Per ognuna ho scritto prima il test, l’ho visto fallire e poi ho
corretto.

### 1. «Mosse» (B40) nella barra delle azioni, non nella barra in basso

**Sintomo.** A 1440 × 900, in combattimento, «Termina turno» finiva su una seconda riga della
barra in basso, per il DM e per il giocatore.

**Causa.** Misurata nel browser (`probes/dock-probe.js`):

- i comandi del core occupano 961 px, più 48 px di spazi;
- accanto al nome della creatura la barra ha 1019 px: restavano 10 px liberi;
- B40 vi aggiungeva «Mosse» (102 px).

Il piano del registro (§5.1) dice che le aree non aggiungono pulsanti a quella barra.

**Correzione.** «Mosse» chiude la barra delle azioni di combattimento, dopo Scatto, Schivata e
Disimpegno. È il pattern di BG3: salto, spinta, presa, lancio e le altre azioni comuni stanno
nella hotbar accanto a Scatto e Disimpegno (CRP-098). La barra in basso torna ai soli comandi
del core, su una riga.

- Al telefono la barra delle azioni scorre di lato: «Mosse» resta fissata alla sua fine,
  sempre sullo schermo.
- Il vassoio si apre sopra la barra delle azioni.
- Sul computer il vassoio è alto al massimo min(50vh, 480 px). A 1440 × 900 resta sotto
  l’intestazione dell’app e scorre al suo interno.

**Prima e dopo** (dati da `w2b1-shell-journey.js`, IT):

| Misura                                        | Prima (sessione 2, r3c) | Dopo   |
| --------------------------------------------- | ----------------------- | ------ |
| 1440 in combattimento: righe di comandi       | 2                       | **1**  |
| 1440 in combattimento: altezza della barra    | 194 px                  | 170 px |
| 1440 in combattimento: scorrimento del Tavolo | 106 px                  | 82 px  |
| 390: righe della barra in basso               | 2                       | **1**  |
| 390: altezza della barra in basso             | 228 px                  | 182 px |
| clic per aprire «Mosse»                       | 1                       | 1      |

Immagini:

- `probes/dock-player-1440.png` (prima) e `probes/dock-player-1440-after.png` (dopo);
- `runs/special-moves/b40-01-tray-reasons-it-1440.png` (vassoio);
- `b40-15/16-…-390.png` (telefono).

**Codice:**

- `combat-ui.mjs`: `renderCombatBar(ctx, actorId, extra = "")`, dove `extra` va dopo le azioni;
- `table.mjs`: i pannelli `dock` passano da `.action-dock .toolbar` a `renderCombatBar`;
- `registry.mjs`: commento del posto `dock`;
- `special-moves.css`: le misure delle azioni vicine, l’ancoraggio alla barra, il fissaggio al
  telefono e l’altezza del vassoio;
- `special-moves.mjs`: il commento d’intestazione e due frasi dell’interfaccia, che ora dicono
  «nella barra delle azioni» invece di «nella barra in basso».

**Test:**

- «B40's Moves stands in the action bar after the actions; the dock keeps the core commands»;
- «the Moves tray floats from the action bar, and on a phone Moves stays at the strip's end».

**Percorsi.**

- In `b61-review-fixes-journey.js` torna il controllo originale `check(oneRow === 1, …)`. La
  sessione 2 l’aveva trasformato in una nota. Ho tenuto anche il suo controllo aggiunto:
  «Termina turno» sullo schermo.
- `w2b1-shell-journey.js` controlla ora tre cose:
  - «Mosse» in `.combat-bar`;
  - una sola riga di comandi in combattimento a 1440;
  - a 390, «Mosse» dentro lo schermo.

### 2. B34 × B56: i tiri del vassoio in «Tiri recenti»

**Sintomo.** In `dice-3d-journey.js` il passo (10c) falliva: «free roll missing from Tiri
recenti».

- Il tiro libero del Tavolo ora passa dal vassoio.
- I dadi 3D rotolavano, ma il tiro non compariva in «Tiri recenti», che ora sta in Dadi ›
  Aspetto e prova.
- Prima di B34 il «Tiro libero» del Tavolo c’era.

**Correzione.** Ho seguito il metodo che la chat usa già per i moduli di altre aree: un vicino
facoltativo, caricato con `import()`, che resta `null` se l’area manca. Un `import` statico da
B56 a B34 farebbe fallire B56 quando B34 non è costruito.

- `dice-3d.mjs` carica `dice-tray-domain.mjs` ed esporta `neighboursReady`.
- `dice-3d-domain.mjs`: `recentRolls(state, role, limit, { tray })` elenca anche i tiri del
  vassoio, con le regole di B34:
  - chi vede il tiro: `canSeeResult`;
  - la sua forma: `rollEvent`.
- Un tiro ritirato resta nell’elenco come prova (`reverted`) e non si può rivedere.

**Test.** «tray rolls are listed in the 3D dice's recent rolls for whoever may read them»:

- il tiro pubblico compare e si rivede con le facce registrate;
- il tiro cieco lo vede il DM, non chi lo ha tirato.

### 3. B34 × B17: badge, campanella e avvisi contano i tiri del vassoio

**Sintomo.** In `chat-journey.js` il badge del Registro del DM mostrava 4 invece di 6 (4
messaggi più 2 tiri).

La sessione 2 aveva dato alle righe del vassoio la loro carta nella chat, ma solo nel flusso. I
conteggi dei non letti leggevano ancora un tiro del vassoio come una riga di evento, e non lo
contavano.

**Correzione.** In `chat.mjs`, `unreadOptions(ctx)` aggiunge `rollFor` ai tre conteggi:

- la lettura del registro aperto;
- gli avvisi a registro chiuso;
- campanella e badge (`collect`).

**Test.** «another identity's tray roll counts in the Registro badge and the bell as a roll».

### 4. `multi-self-journey.js`: percorso superato, non un difetto

**Controllo.** Il percorso originale (copia W2b2, Scatto dritto fino a (650, 380)):

- è **verde** con B40 e B41 spenti insieme (`scripts/without.sh`, `results-ctl.txt`);
- resta rosso con uno solo dei due spento, come aveva visto W2b2.

Sulla linea dritta ci sono la piastra nascosta di B41, che ferma chi ci entra, e la vasca di
B40, dove l’acqua costa il doppio. L’app si comporta bene.

**Correzione.**

- La sessione 2 aveva spostato lo Scatto più in basso, verso (631, 502). L’asserzione però non
  passava: la sonda mostra Livia a (630, 500,9) con 6,04 m rimasti.
- Il motivo: un clic cade su un pixel intero dello schermo. Su una linea obliqua questo accorcia
  i 12 m a 11,96 m.
- Ora il percorso sceglie, tra i pixel interi vicini a (631, 502), quello che nella mappa sta a
  12 m esatti (400 px) da Livia.
- Le asserzioni restano le stesse:
  - Azione spesa;
  - 6 m rimasti (±0,02);
  - arrivo entro 1 px dal punto.

### 5. Righe d’inventario di B36 in tre percorsi

B36 sostituisce le righe dell’inventario del core con quelle di D&D Beyond:

- selettori: `.invp-row` e `[data-invp-row]`;
- formato: «×4 · 0,25 kg», dove il core scriveva «× 4 · … / unità».

La funzione non cambia. La sonda `probes/inv-share-probe.js` mostra che «Dettagli» apre lo
stesso dialogo, con «Condividi nella chat…».

- `loot-journey.js`: il controllo legge la riga della pozione, in entrambi i formati. È più
  stretto di prima, che cercava «× 4» in tutta la pagina.
- `loot-review-journey.js`: selettore `[data-inventory-row], [data-invp-row]`. Le asserzioni non
  cambiano:
  - niente «Bevi» sulla fiala non identificata;
  - dettagli senza 2d4;
  - «Bevi» dopo l’identificazione.
- `chat-review-fixes-journey.js`: selettore `.item-row, .invp-row`.

### 6. Un tiro del vassoio non si annulla con «Annulla ultima modifica»

B34 registra i tiri con `undoable: false`.

- Chi ha tirato ritira un tiro dagli ultimi 10 del vassoio, con **«Ritira»** e un motivo.
- Restano le prove: la carta segnata «Annullato» e la riga «Tiro ritirato: …».
- È il comportamento di Roll20 e Foundry: un tiro resta nel registro.

Due percorsi usavano l’Annulla di gioco subito dopo un tiro:

- `chat-journey.js`: l’Annulla ora si prova su un cambiamento di gioco fatto dopo i tiri, un
  passo di Livia sulla mappa. Le asserzioni non cambiano: i messaggi restano e compare la
  «Correzione».
- `chat-review-fixes-journey.js`:
  - con il vassoio usa «Ritira»: carta «Annullato» e riga «Tiro ritirato: Livia 1d20 + 5 · Tiro
    di prova sbagliato»;
  - senza il vassoio vale ancora la vecchia asserzione, quella della finestra.

Nella preparazione dei percorsi ho aggiunto la copia delle immagini d’ingresso di B17:
`review-fixes/big-680kb.png` e `noise*.png`.

## Correzioni delle sessioni 1–2 (verificate in questa)

### Codice dell’app

- `special-moves.mjs`, `coreClaimsMapInput`:
  - un’azione in anteprima (Mani brucianti, la meta di uno Scatto) si tiene il clic della
    mappa, e così il piazzamento di un famiglio;
  - B40 intercetta solo un Muovi semplice;
  - chiude il rosso di `area-journey.js`.
- `special-moves.mjs`: un Muovi che supera il movimento rimasto si ferma dove il movimento
  finisce, come nel core, e l’acqua costa il doppio.
- `companion-map.mjs`: `mapPlacementActive()`.
- `dice-tray.mjs`: `record.logLabel`, la riga che il tiro scrive.
- `chat-domain.mjs` e `chat.mjs`: `rollFor`, la carta del tiro nella chat.

I test sono i primi 5 di `w2b1-integration.test.mjs`. `renderTable` legge `t`, `label` e
`canControl` staccandoli dal contesto. Perciò nel contesto di quel file li ho scritti come
funzioni freccia: solo così la tabella del Tavolo si disegna nel test.

### Percorsi: le modifiche che ho tenuto

- **core, dice-3d, chat, b61-table-structure**: stesso tiro dal vassoio (fisico 8 + 2,
  digitale 1d20), con la vecchia finestra come alternativa.
- **chat**: il controllo sull’ordine salta le righe private «Impostazione aggiornata: Dadi per i
  tiri sul posto». Il vassoio le scrive a ogni passaggio tra dadi fisici e digitali (aperto
  n. 4).
- **b61-review-fixes**: l’elenco delle schede ha «Dadi» al posto di «Prova i dadi», più
  «Regole di movimento» e «Scena».
- **gestures-and-views e annotations**: gli spostamenti passano più in basso, lontano da piastra
  e vasca, con le stesse asserzioni.
- **loot**: la borsa di Livia, seminata da B36, viene svuotata una volta. L’aritmetica del
  percorso parte da borse vuote.
- **loot-review**: l’anello inciso di B36 (`invp-`) non si conta.
- **loot-review2**: «Aggiungi» di acquisto (`data-kind="buy"`), perché ora Livia può anche
  vendere le sue razioni.
- **preferences**: il peso di B36 in libbre è accettato come «x / y lb» e «×1 · 4 lb». È un
  po’ più largo del «10,5 lb» esatto. L’ho lasciato perché il percorso è rosso comunque, per un
  altro motivo (aperto n. 2).
- **w2b1-shell-journey.js**: è nuovo; l’ho aggiornato al punto 1.

## Percorsi: esito

Metodo:

- le copie dei percorsi cambiano solo la cartella delle immagini (`scripts/prep.sh`);
- un percorso alla volta, ciascuno con un limite di 240 s (`scripts/run.sh`). macOS non ha
  `timeout`: il limite è un allarme `perl`;
- risultati in `runs/<percorso>/<passata>.json`, riepiloghi in `results-<passata>.txt`.

Passate:

- `base`: prima delle correzioni di questa sessione;
- `fix` e `fix2`: dopo ciascuna correzione;
- `final`: tutto insieme, alla fine; 29 percorsi, eseguiti in sequenza in background con un
  registro.

| Percorso                       | `base` (inizio sessione 3)                        | `final` | Note                                                                  |
| ------------------------------ | ------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| damage-tray (B33)              | —                                                 | 11      |                                                                       |
| dice-tray (B34)                | —                                                 | 17      |                                                                       |
| dice-tray-review (B34-rf)      | —                                                 | 11      |                                                                       |
| inventory-plus (B36)           | —                                                 | 18      |                                                                       |
| inventory-plus-review (B36-rf) | —                                                 | 6       |                                                                       |
| sheet-plus (B37)               | —                                                 | 21      |                                                                       |
| spells-plus (B38)              | —                                                 | 12      |                                                                       |
| spells-plus-review (B38-rf)    | —                                                 | 10      |                                                                       |
| special-moves (B40)            | —                                                 | 22      | con «Mosse» nella barra delle azioni (anche 390 EN)                   |
| w2b1-shell (integrazione)      | —                                                 | 8       | caricamento, pagine, «Cosa è pronto», densità, trovabilità 1440 e 390 |
| core                           | 13                                                | 13      |                                                                       |
| combat                         | —                                                 | 10      |                                                                       |
| conditions                     | —                                                 | 11      |                                                                       |
| area                           | 8                                                 | 8       |                                                                       |
| multi-self                     | rosso (Dash destination/resource mismatch)        | 6       | n. 4                                                                  |
| loot                           | rosso (Sheet potion count not 4)                  | 12      | n. 5                                                                  |
| token-menu                     | —                                                 | 19      |                                                                       |
| notifications                  | —                                                 | 25      |                                                                       |
| dice-3d                        | rosso (free roll missing from Tiri recenti)       | 18      | n. 2                                                                  |
| b61-table-structure            | 6                                                 | 6       |                                                                       |
| b61-review-fixes               | 6, ma con la riga allentata                       | 6       | «Combat: 1440 action bar one row» di nuovo asserito (n. 1)            |
| chat                           | rosso (Correzione, poi badge 4 invece di 6)       | 13      | n. 3 e n. 6; senza W2b1 13 (sessione 2)                               |
| chat-review-fixes              | rosso (immagine d’ingresso, `.item-row`, Annulla) | 11      | n. 5 e n. 6                                                           |
| loot-review                    | rosso (`[data-inventory-row]`)                    | 7       | n. 5; senza W2b1 7 (sessione 2)                                       |
| loot-review2                   | —                                                 | 6       |                                                                       |
| gestures-and-views             | —                                                 | 8       |                                                                       |
| compendium                     | —                                                 | 15      |                                                                       |
| companion-map                  | —                                                 | 2       |                                                                       |
| familiar                       | —                                                 | 3       |                                                                       |

I numeri sono i gruppi `passed`. «—» vuol dire che in `base` non l’ho rieseguito: la sessione 2
lo aveva già verde (`results-r3a.txt`, `results-fix1.txt`, `results-fix2.txt`).

Controllo di attribuzione: il `multi-self` originale, con B40 e B41 spenti (`results-ctl.txt`),
dà 6 gruppi verdi.

## Aperti (non corretti qui, con motivo)

1. **I suggerimenti al primo accesso (B30) sono accesi di default.**
   - Contraddice I-236 (3): «restano disattivati di default, l’aiuto resta su richiesta».
   - In `help.mjs`, `tipsEnabled` usa `setting(ctx, "home-tips.enabled", true)`. Nel Tavolo
     compaiono subito «Turni e iniziativa · Leggi · Ho capito» e simili.
   - B30 non è di quest’ondata, e cambiarlo tocca i percorsi che chiudono i suggerimenti.
   - Serve una correzione dedicata, con predefinito `false` e i test di B30. Spetta al
     coordinatore o al proprietario di B30.
2. **`preferences-journey.js` è rosso anche senza W2b1.**
   - A 125 % il Tavolo non sta: scorre 976 px su 900 (controllo della sessione 2,
     `results-control3.txt`).
   - Dipende dall’altezza della barra in basso con la barra rapida di B53, cioè l’aperto n. 6
     di W2b2.
   - Il punto 1 riduce quell’altezza, ma non abbastanza da cambiare l’esito.
3. **`annotations-journey.js` è rosso anche senza W2b1.** Non trova la voce «Aura…» del menu
   della pedina (controllo della sessione 2). La causa probabile è la densità del menu (aperto
   n. 5 di W2b2). Resta da attribuire.
4. **Il vassoio scrive una riga a ogni passaggio tra dadi fisici e digitali.**
   - La riga è privata: «Impostazione aggiornata: Dadi per i tiri sul posto». Finisce anche
     nel Registro.
   - D&D Beyond e Roll20 non scrivono le impostazioni nel registro dei tiri.
   - P3, per B34/B22.
5. **Subito dopo un tiro del vassoio, «Annulla ultima modifica» risponde «Non c’è una tua
   modifica recente da annullare».**
   - È coerente con la scelta di B34: si ritira con «Ritira», come in Roll20 e Foundry.
   - Ma chi si aspetta di annullare il tiro deve sapere dove sta «Ritira».
   - P3, scelta di prodotto.
6. **Ordine a pari istante in «Tiri recenti» (B56).** Due tiri registrati nello stesso
   millisecondo restano nell’ordine di inserimento, cioè il più vecchio prima. P3,
   preesistente.
7. **`library-files` e `library-import-recovery` vanno eseguiti dopo `library-journey.js`.** Il
   loro rosso nella sessione 2 dipendeva dall’ordine di esecuzione, non da un difetto.

## File

Codice dell’app (questa sessione):

- `design/blueprint/table.mjs`
- `design/blueprint/combat-ui.mjs`
- `design/blueprint/registry.mjs` (commento)
- `design/blueprint/special-moves.mjs`
- `design/blueprint/special-moves.css`
- `design/blueprint/dice-3d.mjs`
- `design/blueprint/dice-3d-domain.mjs`
- `design/blueprint/chat.mjs`

Test e documenti:

- `design/blueprint/tests/w2b1-integration.test.mjs` (+4 test e il contesto)
- `design/blueprint/DEVELOPMENT.md` (sezione «W2b1 integration»)
- `changes/interview-01/blueprint-checks/README.md` (un paragrafo in fondo)
- questo rapporto

Percorsi (questa sessione):

- `multi-self-journey.js`
- `loot-journey.js`
- `loot-review-journey.js`
- `b61-review-fixes-journey.js`
- `w2b1-shell-journey.js`
- `chat-journey.js`
- `chat-review-fixes-journey.js`

Sessioni 1–2:

- app: `special-moves.mjs`, `companion-map.mjs`, `dice-tray.mjs`, `chat-domain.mjs`,
  `chat.mjs`;
- percorsi: `core`, `gestures-and-views`, `b61-table-structure`, `b61-review-fixes`,
  `preferences`, `dice-3d`, `chat`, `chat-review-fixes`, `loot`, `loot-review`,
  `loot-review2`, `annotations`, `multi-self`, `w2b1-shell` (nuovo).

Prettier è passato su tutti i file che ho cambiato. Dai percorsi ho poi tolto il punto e virgola
esterno, come chiede il README. `multi-self-journey.js` e `chat-review-fixes-journey.js` non
erano mai stati formattati. Ora lo sono, e il loro comportamento non cambia: la passata finale
li ha eseguiti già formattati.

Prove fuori dal checkout, in `2026-09-26/W2b1-integ/`:

- `scripts/`: prep, run, sweep, without;
- `probes/`: barra in basso prima e dopo, Scatto, riga della pozione, «Tiri recenti», Annulla
  nella chat, dettagli dell’inventario;
- `runs/`, i file `results-*.txt` e `final-sweep.log`;
- `node-run1…4.txt`.
