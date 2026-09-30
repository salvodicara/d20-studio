# B17 — Tavolo: chat, messaggi e archivio: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione
browser `d20-b17` · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/` (fuori dal checkout).

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B17 (TV-98…TV-105, TV-126, CA-06, CA-22,
CA-23). Righe di mercato lette: `foundry.md` (FVT-065, FVT-066, FVT-067, FVT-068,
FVT-070), `roll20-fgu.md` (R20-062, R20-065, R20-145, R20-146, R20-171, R20-207),
`community-services.md` (SVC-081, SVC-083, SVC-113, SVC-122), `dndbeyond.md` (DDB-153),
`vtt-light.md` (VTL-147, VTL-158, VTL-168, VTL-169, VTL-170, VTL-171, VTL-225, VTL-238),
`crpg.md` (CRP-053, CRP-063, CRP-165). Regole: SRD 5.2.1 (EN/IT) solo per le carte degli
incantesimi; la chat non introduce regole di gioco.

## File

Nuovi, tutti dell'area `chat`:

- `design/blueprint/chat-domain.mjs` — dominio puro (nessun DOM): sezione di stato,
  grammatica dei comandi, lettori dei sussurri, lingue, portata udibile, carte condivise,
  proiezioni permesse, registro di gioco come carte, moderazione, voti, archivio,
  esportazione, forum, ricerca. File in più rispetto alla scheda per separare dominio e
  interfaccia (prefisso dell'area, nessun altro modulo lo tocca).
- `design/blueprint/chat.mjs` — modulo d'ingresso `register(registry)`: 9 contributi
  (pannello `log` del Tavolo che sostituisce quello del core, livello `chat-bubbles`,
  sezioni di campagna «Discussioni» e «Archivio chat», notifiche `chat-unread`,
  impostazione personale `chat-notices`, ricerca `chat-search`, comandi `chat.archive` e
  `chat.forum`), sezione di stato `chat` con `undo: "preserve"`.
- `design/blueprint/chat.css` — solo classi `.chat-*` più `.table-log-badge`.
- `design/blueprint/tests/chat.test.mjs` — 20 test (dominio + gestori UI con store e
  registro veri e un doppio minimo del DOM).
- `changes/interview-01/blueprint-checks/chat-journey.js` — percorso browser, 13 gruppi.

File condiviso toccato (una modifica additiva, firme invariate):
`design/blueprint/table.mjs`, pulsante «Registro» della barra del Tavolo. Aggiunge
`aria-expanded` e, solo a registro chiuso e con un pannello `log` di un'area, un badge
con il numero di notifiche di categoria `table-log` (`reg.notifications(ctx)`); il nome
accessibile resta «Registro» (conteggio in `aria-describedby`). Motivo: il core non aveva
un punto per il badge del registro chiuso (Rumble! e DDB-153), e toccare il DOM del core da
un'area viola la regola 6 del registro. `extensions.mjs` elencava già l'area.

## Modello e privacy

- Identità: quelle della campagna (`campaignMembers`: oggi `player` e `dm`; i nomi
  pubblicati da B29/B13 — p. es. «Chiara», «Marco il Custode» — vincono sui predefiniti).
- Sussurro a un personaggio: lo leggono l'autore e le identità **assegnate** al personaggio
  (proprietario e `controllers`), come Roll20 (R20-146). Il controllo universale del DM non
  è un'assegnazione: come in Foundry (FVT-065) il DM non legge i sussurri se non è incluso.
  I lettori sono fissati all'invio.
- Lingue (Polyglot, FVT-067): il DM legge tutto e vede chi capisce; un giocatore legge
  attraverso il personaggio con cui parla («Personaggio» nel compositore, come il token
  selezionato di Polyglot). Il testo non compreso è rimescolato da un generatore con seme:
  conserva solo lunghezze e punteggiatura, mai le lettere originali; non è cercabile né
  esportato. Lingue: `actor.languages` se esiste (costruttore), altrimenti fixture
  `authored-demo` per i personaggi d'esempio (Comune + due standard); nulla è inventato per
  altre creature.
- Ogni elenco (flusso, archivio, esportazione, ricerca, notifiche, avvisi, fumetti) passa da
  `projectMessage`/`projectLog`: un messaggio non leggibile non entra mai nel markup.
- La chat sopravvive all'Undo di gioco (`undo: "preserve"`, commit `undoable: false`); le
  correzioni sono esplicite: ritiro dell'autore, eliminazione del DM con traccia e motivo,
  «Nascondi/Mostra ai giocatori». I commit dei sussurri hanno `visibility: "private"`.
- I tiri non sono copiati: le carte leggono `state.log[].rolls` con `rollVisibleTo`; il
  «Tiro libero» del Tavolo (che registra solo un'etichetta) diventa carta dall'etichetta.
- Segnalini di lettura per identità nel browser (`d20-studio-chat-markers-v1`), come
  Rumble!: all'avvio ogni identità è «in pari», quindi la storia d'esempio non è una novità.

## Capacità → percorso → prova

| Capacità (censimento)                                     | Percorso nell'app                                                                                              | Comandi e risultato                                                                                                                                                                       | Regola / fonte                                                                                                                                  | Pattern adottato                                                                                                                   | Prova                                                                      |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| TV-99 Messaggi in/fuori personaggio, azioni, parlare come | Tavolo → «Registro» (1 clic)                                                                                   | Tipi «Dialogo», «Azione», «Fuori personaggio» (+«Narrazione» DM); «Personaggio»/«Parla come»; `/ic /ooc /em /me`; Invio invia, Maiusc+Invio a capo, ↑ richiama                            | —                                                                                                                                               | Foundry /ic /ooc /em (FVT-065); Roll20 speak-as e Maiusc+Invio (R20-145); Quest Portal parla come (VTL-171); Rumble! ↑/↓ (VTL-169) | journey gruppi 1, 8; test «message kinds and chat grammar», «bind routes…» |
| TV-100 Sussurri a utente o personaggio                    | Compositore «A: Sussurro a …» o `/w Nome`, `/w dm`                                                             | Livia→Doran: leggono Giocatore e DM; Livia→Mira: solo Giocatore; DM→Doran: solo DM; mai nel markup, archivio, esportazione, ricerca, avvisi dei non lettori                               | —                                                                                                                                               | Foundry /w senza il GM (FVT-065); Roll20 sussurro al personaggio (R20-146); carta privata Alchemy (VTL-170)                        | journey 2, 3, 5, 9, 11; test «whispers reach only their readers…»          |
| TV-101 Lingue illeggibili                                 | «Lingua» in Dialogo (solo lingue note a chi parla)                                                             | Guardia in Elfico: Livia legge, Mira vede testo rimescolato e «Mira non conosce questa lingua: Elfico»; il DM vede «Capiscono: Livia»                                                     | Catalogo lingue standard di `character-rules.mjs`; fixture `authored-demo`                                                                      | Polyglot (FVT-067)                                                                                                                 | journey 4, 5; test «languages (Polyglot)…»                                 |
| TV-102 Immagini e voce condivisa come carta               | «Immagine» (file), incolla o trascina nel campo; «Condividi»                                                   | PNG incollato → anteprima → inviato, clic ingrandisce; «Mani brucianti» → carta → dettaglio con gittata, TS, danni, fonte SRD                                                             | SRD 5.2.1 EN p.114 / IT p.163 (dati `srd-sample.mjs`), riassunto app                                                                            | Chat Images (FVT-068); Shard share to chat (VTL-158)                                                                               | journey 5 (screenshot 05); test «share to chat…»                           |
| TV-103 Narrazione e PNG                                   | «Narrazione», «Parla come: PNG con nome…», `/desc`, `/as "Guardia"`, `/emas`; «Si sente» per creature in scena | Narrazione in riquadro; «Guardia» con tag PNG; Sentinella «Sussurro 1,5 m» non raggiunge nessuno, «Grido 30 m» Livia/Doran/Mira; fumetto sulla pedina                                     | Distanze: valori predefiniti dell'app (`RANGE_SOURCE`), lo SRD 2024 non fissa portate della voce                                                | Roll20 /desc /as /emas (R20-145); Owlbear Theatre! portata (VTL-168); fumetti Foundry (FVT-065)                                    | journey 4, 5; test «audible range…»                                        |
| TV-104 DM nasconde o elimina                              | Menu «⋯» del messaggio                                                                                         | «Nascondi ai giocatori» / «Mostra ai giocatori»; «Elimina…» con motivo: contenuto cancellato, traccia «Messaggio eliminato da DM · Motivo: fuori tema»; l'autore «Ritira il messaggio…»   | —                                                                                                                                               | Roll20 hide/unhide (R20-145); eliminazione Foundry (FVT-066) e Alchemy (VTL-170)                                                   | journey 4, 5, 6; test «moderation…»                                        |
| TV-105 Voto rapido e stato d'animo                        | «Voto» o `/vote domanda`; `/mood tono testo`                                                                   | Voto sì/no per identità, cambiabile finché aperto; l'autore o il DM chiude: «Esito: Sì (2–0)», parità «decide il DM»; `/mood preoccupata …` → «Livia (preoccupata)»                       | —                                                                                                                                               | Fantasy Grounds /vote e /mood (R20-171); voto di gruppo Solasta II facoltativo (CRP-053), esito al DM                              | journey 4, 5, 6; test «votes…»                                             |
| TV-98 Avviso dei tiri altrui a registro chiuso            | Badge sul pulsante «Registro»; avvisi in basso a destra; campanella                                            | DM dopo i messaggi e 2 tiri del giocatore: badge «6», 3 avvisi («4 altre novità»), nessun sussurro Livia→Mira; «Apri il registro» apre e azzera                                           | Scelta personale «Avvisi … a registro chiuso» (predefinito sì); se il centro B24 mostra già la categoria chat o la spegne, niente doppio avviso | DDB notifiche dei tiri (DDB-153); badge non letti Rumble! (VTL-169); annuncio Quest Portal (VTL-147)                               | journey 3, 12; test «notices, badge category…», «closed-log notices…»      |
| TV-126 Istantanea per il resoconto                        | «Istantanea» nel compositore                                                                                   | Anteprima della scena come la vedono i giocatori (niente pedine nascoste né porte segrete), didascalia, «Salva immagine» (.svg)                                                           | —                                                                                                                                               | BG3 Photo mode (CRP-165), ridotto a istantanea                                                                                     | journey 5; test «snapshot shows the players' view…»                        |
| CA-22 Archivio fra sessioni, riservatezza dei sussurri    | Campagna → «Archivio chat» (1 clic), o «Archivio» dal pannello                                                 | Giorni «giovedì 17 settembre 2026» e oggi; ricerca; «Mostra»; «Nascondi sussurri»; il risultato di ricerca evidenzia il messaggio                                                         | —                                                                                                                                               | Roll20 Chat Archive con Hide Whispers (R20-065, SVC-081); storico BG3 (CRP-063)                                                    | journey 9; screenshot 06                                                   |
| CA-23 Esportare o ripulire                                | «Esporta (.txt)»; DM «Svuota l’archivio…»                                                                      | Download reale; esportazione del giocatore senza «zolfo», del DM senza «Passami la corda»; frase errata rifiutata, «ELIMINA CHAT» (o «DELETE CHAT») svuota e lascia la traccia di sistema | I tiri restano nei registri di gioco (prove immutabili), non più nella chat                                                                     | Foundry export/clear (FVT-066); conferma digitata Roll20 (R20-207)                                                                 | journey 9, 11; screenshot 08, 08a; `b17-export-player-no-whispers.txt`     |
| CA-06 Discussione asincrona con fissa                     | Campagna → «Discussioni»                                                                                       | Nuova discussione e risposta (giocatore); DM «Metti in evidenza» e «Sposta in fondo»; ordine dopo reload: in evidenza, normali, in fondo; rimozioni con traccia                           | —                                                                                                                                               | Forum Roll20 con Sticky/Sink/Delete (R20-062, SVC-083)                                                                             | journey 10; test «forum…»; screenshot 07, 07a                              |
| Registro esistente                                        | Tavolo → «Registro»                                                                                            | Tiri fisici/digitali del «Tiro libero», iniziativa preparata e «Dardo di fuoco · Attacco» come carte; eventi e «Correzione» dopo Undo                                                     | Dadi fisici e digitali dei servizi esistenti                                                                                                    | Carta del tiro Foundry (FVT-065)                                                                                                   | journey 1, 12; screenshot 01, 10                                           |

Raggiungibilità: Tavolo → «Registro» (1 clic); Campagna → «Discussioni» / «Archivio chat»
(1 clic dalla barra laterale); campanella → notifica; ricerca globale; comandi di palette.

## Comandi eseguiti e risultati

- `node --test design/blueprint/tests/chat.test.mjs` → 20/20.
- `node --test design/blueprint/tests/*.test.mjs` → 864/864 (24/09, con le aree in
  costruzione caricate).
- Browser (`playwright-cli -s=d20-b17`, cwd cartella delle prove, server `127.0.0.1:8879`):
  `--raw run-code --filename=…/chat-journey.js` → 13/13 gruppi, nessun `pageerror`
  (`chat-journey-final.log`). Contesto isolato IT 1440×900 (giocatore e DM) e contesto EN
  390×844 con tocco.
- Rapporto «Cosa è pronto»: B17 attiva, nessun avviso dell'area.

Gruppi del percorso: (1) tipi e carte dei tiri fisico/digitale, Undo come correzione;
(2) sussurri da selettore e `/w`, reload; (3) DM: badge 6, avvisi, apertura; (4) DM:
narrazione, Guardia in Elfico, sussurro a Doran, portata 1,5/30 m, eliminazione con
motivo, nascondi, voto; (5) giocatore: privacy, Mira e l'Elfico, `/mood`, carta Mani
brucianti, immagine incollata, istantanea, ritiro; (6) chiusura del voto e ripristino;
(7) offline: rifiuto con motivo e bozza conservata, poi invio; (8) ↑ ed Esc con ritorno del
fuoco su «Registro»; (9) archivio, esportazione reale e ricerca; (10) discussioni con fissa
e affonda dopo reload; (11) esportazione DM e pulizia con conferma digitata; (12) incontro
preparato e «Dardo di fuoco» digitale come carte, iniziativa solo al DM; (13) telefono EN:
foglio a tutta larghezza, invio a tocco, nessun overflow, ogni controllo ≥ 40 px.

Screenshot (1440×900 salvo il telefono): `b17-01-kinds-rolls-1440.png`,
`b17-02-dm-badge-notices-1440.png`, `b17-03-dm-narration-guard-vote-1440.png`,
`b17-04-player-mira-scrambled-1440.png`, `b17-05-card-detail-1440.png`,
`b17-06-archive-1440.png`, `b17-07-forum-1440.png`, `b17-07a-forum-thread-1440.png`,
`b17-08-archive-cleared-dm-1440.png`, `b17-08a-clear-confirmation-1440.png`,
`b17-09-phone-390-en.png`, `b17-10-combat-roll-cards-dm-1440.png`. Controllati a vista:
il pannello è agganciato a destra (l'app si restringe, nulla del Tavolo è coperto), gli
avvisi non coprono la barra delle azioni, le date non sono in maiuscolo improprio, il menu
«⋯» non eredita gli stili dei `details` della campagna.

## Coordinamento con altre aree

- B24 (centro notifiche) riconosce già `chat-unread` e la categoria `table-log` come
  «chat»; il pulsante «Registro» conta le notifiche `table-log` del registro.
- B29 (account) e B13 (membri): i nomi pubblicati nei membri della campagna firmano i
  messaggi; il percorso di B29 verifica «Chiara» con la chat di B17.
- B34 (vassoio dei tiri) potrà sostituire il «Tiro libero»: le carte leggono già i tiri
  strutturati di `state.log`, quindi non serve altro.

## Limiti onesti

- Due identità locali: Doran è del DM nei dati d'esempio, quindi «Sussurro a Doran» lo
  legge il DM (che qui fa da giocatore di Doran). L'esclusione è provata con Livia→Mira
  (il DM non legge) e DM→Doran (il giocatore non legge). La prospettiva per personaggio vale
  solo per le lingue; con più identità (B13) basta assegnare i personaggi.
- Nessuna rete: i messaggi «degli altri» arrivano cambiando ruolo nello stesso browser; gli
  avvisi compaiono sul Tavolo a registro chiuso. I controlli di visibilità sono locali, non
  sicurezza: lo stato in `localStorage` contiene anche i sussurri, come tutti i dati d'esempio.
- Immagini: incolla, trascina o file (PNG, JPEG, GIF, WebP, max 750 KB) salvate nello stato
  locale; i link esterni non diventano immagini (nessuna risorsa esterna). L'incolla nel
  percorso è un `ClipboardEvent` con un vero file PNG, non gli appunti del sistema.
- Theatre Inserts (FVT-070) con ritratti da visual novel non è copiato; la narrazione usa
  /desc. Le portate di Theatre! sono valori dell'app. Fumetti: una riga, 10 s, solo messaggi
  pubblici.
- «Tiro libero»: carta ricavata dall'etichetta finché B34 non registra tiri strutturati.
- Esportazione solo testo, orari UTC (l'archivio mostra l'ora locale). La pulizia cancella
  tutti i messaggi (anche sussurri che il DM non legge) ma non le prove dei tiri, nascoste
  dalla chat prima dell'istante di pulizia.
- Segnalini di lettura per browser, non sincronizzati. Voto solo sì/no senza timer. `/mood`
  solo da comando. Forum senza modifica dei post e senza riquadro «ultimi 10 post»
  sull'hub. Nessuna opzione «il DM vede tutti i sussurri».
- L'istantanea è un SVG della scena di base con le pedine pubbliche: niente luce, condizioni,
  filtri, pose o adesivi di BG3.
- Il pannello registro si chiude al cambio di ruolo (comportamento del core
  `resetTableView`); il contenuto seminato è solo in italiano (testo degli utenti).

## Review fixes

24/09/2026 · stessa worktree e sessione browser `d20-b17` · prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B17/review-fixes/` (fuori dal
checkout). Dieci rilievi verificati uno per uno (riprodotti con un test o nel browser
prima della correzione): nove corretti, uno corretto in parte con motivo (P3 tablet a
820 px).

### Esito per rilievo

| #   | Rilievo                                                                                          | Verifica                                                                                          | Esito e correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Prova                                                                                                                                                                                                                                                                   |
| --- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P1 · «Capiscono: …» del DM elenca schede private e di altre campagne                             | Riprodotto: test con «Neris» privata e «Oswin» di un'altra campagna → `["Livia","Neris","Oswin"]` | **Corretto.** `understoodBy` usa lo stesso elenco di «Parla come» e dei sussurri (`campaignActors(state, "dm")`: personaggi disponibili, non privati, della campagna, visibili al DM). Stessa classe di fuga chiusa anche in `rangeAudience`: «sentono» nomina solo personaggi della campagna.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | test «review: the DM's language note…»; browser f1: Neris creata col costruttore (privata, Elfico) → «Capiscono: Livia»                                                                                                                                                 |
| 2   | P1 · immagini e istantanee senza limite complessivo: stato perso al reload                       | Riprodotto (r13 del revisore)                                                                     | **Corretto** con lo schema del quota dei file (media-domain `checkRoom`). Limite per file 500 KB, come la libreria dei file (era 750 KB). Budget della chat: tutte le immagini e istantanee insieme ≤ 1,5 MB di testo salvato; e lo stato intero dopo il messaggio ≤ 4 MB, così resta spazio per il resto della partita. Controllo all'allegato, all'istantanea e di nuovo dentro il commit; rifiuto IT/EN con spazio usato, totale e richiesto; bozza e testo restano; eliminare o ritirare un'immagine libera spazio. Non adottato: salvare le immagini della chat nella libreria dei file, che le metterebbe nella libreria personale e nella quota di chi scrive (altro significato di prodotto).                                                                                                                                                                                                             | test «review: chat images and snapshots have a storage budget…»; browser f2: 160 504 → 739 427 → 1 318 351 caratteri; terza immagine rifiutata; tiro fisico 17 + 2 = 19 presente dopo il reload; ritirata «Mappa 0», la terza entra                                     |
| 3   | P2 · «Apri il registro» fuori dal Tavolo e notifica della campanella non aprono il registro      | Riprodotto (r16, r21)                                                                             | **Corretto.** Rotta `#table?tab=chat-log` applicata una volta per navigazione (stesso schema dei cassetti di random-tables e loot); è il `target` delle notifiche della chat (DDB-153 apre il game log). «Apri il registro» sul Tavolo preme il suo pulsante, altrove usa la rotta. Gli avvisi della chat si chiudono lasciando il Tavolo (evento `navigate`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | test «review: notices and notifications open the log…»; browser f3a, f3b (campanella → `#table?tab=chat-log`, registro aperto, badge azzerato)                                                                                                                          |
| 4   | P2 · il fuoco cade su `<body>` dopo moderazione e voti                                           | Riprodotto (r11)                                                                                  | **Corretto.** Nascondi/Mostra → lo stesso «⋯» del messaggio; chiusura del voto → l'esito (`tabindex=-1`); Elimina… → la traccia rimasta, dopo la chiusura della finestra; Condividi/Voto/Istantanea → il campo del messaggio; svuota archivio → titolo dell'archivio; rimozioni nel forum → traccia o titolo. Il «⋯» ha un contorno di fuoco visibile.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | test «review: keyboard focus stays…»; browser f4 (solo tastiera: `menu-m2`, `LI` traccia, `outcome-m7`, `text`)                                                                                                                                                         |
| 5   | P2 · foglio a tutto schermo del telefono non modale; suggerimento sopra il compositore           | Riprodotto (r12, r17)                                                                             | **Corretto.** Sotto 901 px il pannello è `role="dialog"` `aria-modal="true"` (schema WAI-ARIA del dialogo modale): Tab e Maiusc+Tab restano dentro; livello sopra le schede suggerimento (58) e sotto tour e avvisi dell'app; cambiando larghezza si ridisegna (agganciato di nuovo non modale). `inert` sul resto dell'app non applicato: quel DOM è fuori dall'elemento dell'area (regola 6 del registro); `aria-modal`, contenimento del fuoco e sovrapposizione coprono tastiera, tocco e lettori di schermo.                                                                                                                                                                                                                                                                                                                                                                                                 | test «review: below the docking width…»; browser f5 (quattro Tab dentro il pannello, suggerimento sotto, tocco sul campo → campo)                                                                                                                                       |
| 6   | P2 · «Condividi nella chat» lontano dal punto del pattern; materiali rivelati solo come riga     | Verificato: nessuna azione nei dettagli della scheda                                              | **Corretto.** Shard (VTL-158): «Condividi nella chat…» nei dettagli di incantesimi e oggetti della scheda, con la voce già scelta e il selettore «Destinatari»; comando `chat.share-entry`, anche nella palette sulla scheda aperta. Le schede private o non assegnate non lo offrono. Il selettore del compositore resta. Materiali rivelati: carta nel registro e nell'archivio (titolo, miniatura, anteprima della sola parte del giocatore) che apre il materiale dalla rotta dell'area Materiali; visibilità decisa da `projectMaterial` di handouts-domain, una carta per materiale all'ultima rivelazione a quel lettore.                                                                                                                                                                                                                                                                                  | test «review: share to chat from a sheet's details…», «review: revealed handouts…»; browser f6 (dettagli di Mani brucianti e Bastone, carta al DM, «Cripta sotto l'osservatorio» per il giocatore → `#campaign?tab=handouts&id=material-crypt` con il materiale aperto) |
| 7   | P3 · badge «Registro» ignora le letture del centro notifiche                                     | Riprodotto (r15)                                                                                  | **Corretto.** Un'unica fonte: le notifiche del registro segnate lette nel centro (una per una o «Segna tutte come lette») spostano il segnalino di lettura della chat fino alla più recente letta prima di ogni non letta; entrando nel Tavolo e dopo ogni suo disegno. Anche gli avvisi di quelle notifiche si chiudono. Il centro B24 si carica in modo facoltativo (import dinamico): senza B24 la chat funziona uguale.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | test «review: the Registro badge follows…» (con il vero modulo B24); browser f10 (badge 2 → nessun numero, campanella senza conteggio)                                                                                                                                  |
| 8   | P3 · tablet: a 820 foglio intero, a 1024 mappa ~380 px; avvisi sopra l'intestazione del telefono | Riprodotto (misure m1)                                                                            | **Corretto in parte.** Da 901 a 1279 px il registro aperto prende la colonna dell'ispettore del Tavolo, come la barra laterale di Foundry dove la chat è una scheda della colonna: mappa 396 → 676 px a 1024, 500 → 780 px a 1180; chiudendo il registro l'ispettore torna; da 1280 px restano visibili entrambi. L'intestazione ristretta va a capo invece di finire sotto il pannello (a 1024 «Account e profilo» era sotto il pannello, m3). **A 721–900 px resta il foglio modale**: agganciato lì, l'app resta larga 445–476 px, i servizi dell'intestazione finiscono sotto il pannello e la barra del Tavolo diventa una colonna (misure e screenshot m2). Telefono: un solo avviso in basso, sopra la barra delle azioni (scostamento misurato), con «+N novità»; ✕ dell'avviso ≥ 40 px (era 32).                                                                                                         | browser f9 (820 modale, 1024/1180 mappa 676/780, servizi raggiungibili, nessun overflow), f7 (avviso 669–729 sopra la barra a 737)                                                                                                                                      |
| 9   | P3 · il tiro annullato resta una carta valida                                                    | Riprodotto (r5)                                                                                   | **Corretto.** `projectLog` raccoglie i `revertsId` delle correzioni: la carta resta come prova con stato «Annullato» e totale barrato; la riga di correzione dice «Annullato: …»; l'esportazione scrive «· annullato».                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | test «review: an undone roll is marked…»; browser f8 (screenshot `f8-undone-roll-1440.png`)                                                                                                                                                                             |
| 10  | P3 · lacune minori                                                                               | Riprodotte                                                                                        | **Corretto.** `/w Do` + Tab → `/w Doran ` (R20-145), senza completamento Tab passa oltre. `/r d20+5` apre il «Tiro libero» del Tavolo già compilato (dado e modificatore), dado fisico o digitale scelto lì, pedina di chi parla selezionata prima; un solo dado d4–d20 e modificatore fino a 30, come il tiro libero; altrimenti un rifiuto che lo spiega (nessun secondo motore di dadi). Nome di chi parla sul Tavolo → seleziona la sua pedina (FVT-065; sul telefono chiude prima il foglio): selezione, non spostamento della vista, perché il Tavolo non offre alle aree un comando di panoramica. «Ultime discussioni» nell'Inizio (R20-062/SVC-083: widget della home, unico punto d'estensione; la panoramica della campagna non ne ha), cinque post con «Nuovo». «Destinatari» ora è un selettore con «Sussurro a Solo io (DM)». File dell'istantanea `snapshot-…` in inglese; aiuto EN `/as "Guard"`. | test «review: Tab completes /w names and /r…»; browser f8, f9                                                                                                                                                                                                           |

### Modifica condivisa (additiva, firme invariate)

`design/blueprint/characters.mjs`: un aggancio del registro nei due dialoghi dei dettagli
(incantesimo e oggetto). Funzione `shareToChat(ctx, actor, entryId)` che mostra
«Condividi nella chat…» solo se un'area offre il comando `chat.share-entry` per quella
scheda e voce, e lo esegue con `{actorId, entryId}`; senza l'area i dialoghi restano
identici (test dei personaggi 11/11, `prettier --check` pulito). Motivo: la posizione del
pattern di Shard sono i dialoghi dei dettagli e il core non aveva un punto per aggiungervi
un'azione. Nessun altro file condiviso toccato; `table.mjs` invariato (la rotta del
registro usa lo schema delle aree random-tables e loot).

### File

- `design/blueprint/chat-domain.mjs`, `chat.mjs`, `chat.css` (propri dell'area).
- `design/blueprint/tests/chat.test.mjs`: 30 test (20 + 10 di revisione).
- `changes/interview-01/blueprint-checks/chat-journey.js`: un solo controllo adattato (il
  primo giorno dell'archivio può ora essere il 10 settembre, perché il materiale «Avviso
  della gilda» rivelato quel giorno compare come carta).
- Nuovo `changes/interview-01/blueprint-checks/chat-review-fixes-journey.js`: 11 passi,
  uno per rilievo, con controllo dei `pageerror`.

### Comandi eseguiti e risultati

- `node --test design/blueprint/tests/chat.test.mjs` → 30/30.
- `node --test design/blueprint/tests/*.test.mjs` → 1279/1290 all'ultima esecuzione; gli
  11 falliti sono di `preferences` (9) e `dice-3d` (2), i cui moduli erano stati salvati
  da altri costruttori pochi secondi prima (08:37); nell'esecuzione precedente quei file
  passavano e fallivano invece `campaign-settings`, `character-library`, `compendium` e
  `home`, poi tornati verdi. Nessun test fallito tocca chat o dialoghi dei dettagli.
- Browser (`playwright-cli -s=d20-b17`, cwd cartella delle prove, server
  `127.0.0.1:8879`): `chat-journey.js` → 13/13 gruppi (`review-fixes/chat-journey-final.log`);
  `chat-review-fixes-journey.js` → 11/11 passi, 0 `pageerror`
  (`review-fixes/review-fixes-journey-final.log`).

Screenshot: `f1-dm-understood-by.png`, `f2-budget-refusal-1440.png`,
`f3b-bell-opens-log-1440.png`, `f5-phone-sheet-over-tip-390.png`,
`f6-share-from-sheet-1440.png`, `f6-handout-card-player-1440.png`,
`f7-phone-toast-390.png`, `f8-undone-roll-1440.png`, `f9-log-open-{820,1024,1180,1280}.png`;
misure di confronto `m1-*` (prima/dopo), `m2-*` (variante agganciata scartata a 768/820),
`m4-*` (intestazione che va a capo).

### Affermazioni precedenti superate

- Immagini: massimo **500 KB** per file e budget complessivo della chat (non più 750 KB
  senza totale).
- Telefono: avvisi **in basso**, uno solo, sopra la barra delle azioni (non più in alto).
- «Forum senza … riquadro «ultimi 10 post» sull'hub»: ora «Ultime discussioni» (5 post)
  nell'Inizio.
- `/r` non è più rifiutato: apre il «Tiro libero» compilato.
- Limite che resta: il «Tiro libero» registra solo un'etichetta (carta dall'etichetta)
  finché B34 non registra tiri strutturati; `/r` ne eredita il solo dado più modificatore.
