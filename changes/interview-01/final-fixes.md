# Correzioni finali dopo le tre revisioni: prove

30/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`, lavoro non
committato) · un solo scrittore (Claude Code, Opus 5.5) · sessione del browser `d20-final-fix` ·
server `http://127.0.0.1:8879/` senza cache · cartella delle prove
`~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/fix/` (fuori dal checkout: `shots/` catture,
`logs/` esiti delle sonde `s1`–`s35` e dei percorsi, `scripts/` sonde e lanciatori). Solo dati
sintetici. Ruolo: correggere i rilievi delle revisioni finali di
[completezza](final-review-completeness.md), [privacy](final-review-privacy.md) e
[UX](final-review-ux.md), più sei voci aperte note, copiando ogni volta il modello di mercato
indicato.

## In breve

- **Tutti i P1 e i P2 corretti, partendo da un test rosso**, tranne il riposo del giocatore
  legato al DM (UX F12, P2), che è una scelta dell'owner (Q164). X-05 resta PARTIAL per le
  preferenze delle notifiche in due posti. La maggior parte dei P3 è corretta; quelli rimasti
  (tra cui i nomi dei concorrenti nei testi, Q165) hanno una ragione scritta qui sotto.
- **Privacy P1:** un giocatore espulso non legge più le schede della campagna (Roll20: chi lascia
  il gioco perde l'accesso ai suoi personaggi condivisi). Tiene solo la propria scheda, in sola
  lettura.
- **Salire di livello non altera più la scheda (F1).** Esempio: Livia, Maga 3 senza costruzione
  registrata, sale al 4: lingue «Comune, Elfico, Draconico» conservate, classe «Maga» e non
  «Mago 4 4», iniziativa +2 → +4 con Allerta, nessuna scelta dei livelli già presenti chiesta di
  nuovo (come «Manage Level Up» di D&D Beyond).
- **Cinque capacità trasversali chiuse (X-05, X-06, X-07, X-09, X-10):** menu contestuale su
  personaggi, inventario e incantesimi (clic destro, pressione lunga, Maiusc+F10); trascinamento
  dal Compendio sulla mappa, su una pedina o su una scheda; aritmetica nei PF della scheda
  (`-5`, `+3`, `=12`, `2+3`); pannelli del Tavolo staccabili in una finestra; «Annulla» ed Esc che
  tornano alla finestra d'origine.
- **Regole:** sorpresa a inizio combattimento (SRD 5.2.1: svantaggio all'iniziativa); al turno di
  Mira la hotbar passa a Mira; CA, iniziativa e slot uguali su ogni superficie.
- **UX:** menu «Sessione» sopra l'ordine di turno, pagina nuova dall'alto e «Indietro» che
  ritrova la posizione, riga di stato della mappa sopra la hotbar misurata, bottone «Tira» subito
  sotto i dadi, chat più alta (da 178 a 304 px a 1440 × 900), sotto-schede su una riga, scheda e
  Tavolo del telefono, Inizio del DM, testi da sviluppatori nascosti dietro «Perché?».
- **Test Node:** 2582/2582 all'inizio, **2628/2628** alla fine (46 test nuovi in
  `tests/final-fixes.test.mjs`, sei test esistenti aggiornati a comportamenti voluti).
- **Percorsi nel browser:** **70/70** percorsi delle aree toccate verdi all'ultimo giro, compreso
  il nuovo `final-fixes-journey.js` (10 passi); 18 percorsi aggiornati al minimo dove leggevano il
  vecchio posto o il vecchio testo, ogni controllo tenuto. Due difetti reali trovati dai percorsi,
  corretti partendo da un test rosso.
- **Markdown:** censimento con lo stato corrente e il posto di ogni capacità, sezione «Dove si
  trova ogni funzione nel blueprint» nelle pagine concettuali e in NAVIGATION, domande Q164–Q168
  in OPEN, stato del 30/09 in BLUEPRINT_CONTRACT e BLUEPRINT_STATUS, regola «ogni identità riceve
  solo la propria proiezione» per il prodotto reale.

## Rilievi e correzioni

Colonne: rilievo (revisione · codice), prodotto copiato, cosa cambia, test, prova nel browser
(sonda in `logs/`, cattura in `shots/`).

### P1

| Rilievo                                                   | Copiato da                                           | Cosa cambia                                                                                                                                                                                                                     | Test                                     | Browser                                                                                                  |
| --------------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Privacy P1 · l'espulso legge ancora Doran                 | Roll20 SVC-031 (chi lascia il gioco perde l'accesso) | `canViewActor`: una scheda condivisa la leggono il proprietario, chi la controlla e i membri di una delle sue campagne; l'espulso tiene solo la sua                                                                             | «privacy P1: after «Espelli…»…»          | `campaign-members-journey`, `campaign-members-review-journey` (aggiornati: l'espulso non vede più Doran) |
| Completezza F1 · Markdown fermo al 24/09                  | —                                                    | censimento riscritto (528 capacità: 506 WORKS, 7 PARTIAL, 8 MISSING, 7 EXCLUDED; righe TV-149–156, SV-56), pagine e NAVIGATION con il posto di ogni funzione, OPEN Q164–Q168, CONTRACT e STATUS al 30/09                        | —                                        | —                                                                                                        |
| UX F1 · salire di livello cancella e altera               | D&D Beyond «Manage Level Up», BG3 level up           | una scheda senza costruzione registrata sale in modalità «solo livello nuovo» (`levelUpOnly`): lingue e classe conservate, nessuna scelta dei livelli già presenti, nessuna conferma dei valori manuali, iniziativa con Allerta | «UX P1 F1…»                              | `logs/f1-levelup.log`, `shots/f1-levelup-summary.png`                                                    |
| UX F2 · bestiario del menu della mappa illeggibile        | menu contestuale di Owlbear e Foundry                | indietro da 40 px a icona, titolo e chiudi su una riga, ricerca sotto                                                                                                                                                           | «UX P1 … the bestiary header…»           | `s2`, `shots/s2-bestiary-after.png`                                                                      |
| UX F3 · ordine di turno sopra il menu «Sessione»          | Owlbear Rodeo 2 (menu della stanza sopra l'HUD)      | il menu aperto va nello strato superiore (`popover`)                                                                                                                                                                            | «UX P1 … the «Sessione» menu…»           | `s1`–`s3`, `shots/s2-session-menu-after.png`                                                             |
| UX F4 · la pagina nuova conserva lo scorrimento           | D&D Beyond, Kanka                                    | voce di cronologia con chiave: pagina o scheda nuova dall'alto con il fuoco sul titolo; «Indietro» e «Avanti» ritrovano la posizione                                                                                            | «UX P1 … a new page starts at the top…»  | `s4`, `s5` (Inizio 400 px → scheda 0 → Indietro 400)                                                     |
| UX F5 / TV-53 · al turno di Mira la hotbar resta su Livia | BG3 (il personaggio di turno prende la hotbar)       | quando comincia un turno, la creatura che il giocatore guida diventa la selezione una volta                                                                                                                                     | «UX P1 F5 / TV-53…»                      | `s6`, `shots/s6-player-mira-turn.png`                                                                    |
| UX F6 · riga di stato sotto la hotbar                     | BG3 (suggerimento sopra la fila delle risorse)       | `captionLift` la mette 8 px sopra la parte più alta misurata della HUD; larghezza massima 600 px                                                                                                                                | «UX P1 F6…»                              | `s7`, `s8`, `shots/s7-caption-measure.png`, `shots/s8-caption-combat-player.png`                         |
| UX F7 · «Tira» del vassoio sotto la piega                 | Owlbear Rodeo (dadi, visibilità e tiro insieme)      | ordine: chi, formula, dadi, dadi fisici, chi vede, «Tira»; modalità, aiuto, CD e pila dopo                                                                                                                                      | `dice-tray` e `damage-tray` (aggiornati) | `s9`, `shots/s9-tray.png`, `shots/s9-tray-dm.png`                                                        |

### P2

| Rilievo                                                 | Copiato da                                                              | Cosa cambia                                                                                                                                                                       | Test                                        | Browser                                                                                    |
| ------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------ |
| X-05 · superfici di comando                             | Owlbear SDK (modale sopra la sua superficie)                            | `ctx.dialog(…, { onCancel })`: «Annulla», × ed Esc di una conferma tornano alla finestra d'origine (Preferenze › «Ripristina predefiniti»)                                        | «P2 X-05…»                                  | `s20` (dopo Esc resta aperta «Preferenze»)                                                 |
| X-06 · nessun menu contestuale fuori dalla mappa        | Owlbear Rodeo, Fantasy Grounds                                          | `context-menu.mjs`: su schede dei personaggi, righe dell'inventario (menu dnd5e già presente) e incantesimi; clic destro, pressione lunga (550 ms), Maiusc+F10, frecce ed Esc     | «P2 X-06…»                                  | `s13`–`s15`, `shots/s13-card-menu.png`, `shots/s14-spell-menu.png`                         |
| X-07 · niente trascinamento da Biblioteca e Compendio   | Foundry, Fantasy Grounds                                                | righe del Compendio trascinabili: creatura sulla mappa (DM), oggetto o incantesimo su una pedina, su una scheda o sulla scheda Creatura; Compendio anche come pannello del Tavolo | «P2 X-07…»                                  | `s16`, `s18`, `shots/s16-drag-creature.png`, `shots/s18-drop-item-token.png`               |
| X-09 · i PF della scheda ignorano `=15` e `+2`          | Owl Trackers (il campo PF del menu della pedina)                        | `amountPlan`: `-5`, `+3`, `=12`, catene come `2+3`; anche «Correggi i punti ferita» (`18-3`, `+2`, `=20`); Invio applica                                                          | «P2 X-09…» (due test)                       | `s12`, `shots/s12-hp-arith.png`                                                            |
| X-10 · nessun pannello staccabile                       | Foundry V14 pop-out                                                     | «Stacca» accanto a ogni pannello in «Tutti i pannelli»; `#table?tab=window:<id>` mostra solo quel pannello, con l'identità della finestra                                         | «P2 X-10…»                                  | `s19`, `shots/s19-popout.png`                                                              |
| Completezza F3 / B1 · manca la sorpresa                 | BG3 e Solasta (segno «Sorpreso» all'imboscata), effetto SRD 5.2.1       | interruttore «Sorpreso» per riga all'avvio; due d20, tiene il più basso; il registro scrive svantaggio, facce e sorpresa (SRD EN 189 / IT 216)                                    | «P2 Surprise…»                              | `s10`, `shots/s10-surprise.png`                                                            |
| UX F8 · chat alta 77 px                                 | Foundry v13 (cronologia che riempie la barra)                           | compositore compatto; cronologia da 178 a 304 px a 1440 × 900; sul tatto e sul telefono i bottoni restano da 40 px                                                                | «P2 F8…»                                    | `s21`, `s22`, `shots/s21-chat.png`, `shots/s22-chat-player.png`; `chat-journey` (telefono) |
| UX F9 · sotto-schede in tre righe                       | D&D Beyond (filtri su una riga), Foundry (una fila di schede)           | una riga che scorre; la scheda aperta resta in vista                                                                                                                              | «P2 F9…»                                    | `s21`, `s23` (da 147 a 59 px), `shots/s21-scene-subtabs.png`                               |
| UX F10 · comandi e preamboli prima del contenuto        | D&D Beyond (clic sul numero = tiro; Spells e Inventory sotto le schede) | clic su un numero tira subito (finestra con dadi fisici o clic destro); magie e inventario con riquadri compatti, preparazione e ingombro ripiegati                               | «P2 F10…» (cinque test); tiro al clic: Q168 | `s25`–`s27`, `shots/s25-spells.png`, `shots/s26-inventory.png`                             |
| UX F11 · scheda sul telefono                            | D&D Beyond mobile                                                       | intestazione in una riga; riquadri rapidi solo sulla pagina principale; la striscia scorre a schede intere                                                                        | «P2 F11…» (due test)                        | `s27`, `shots/s27-phone-sheet-top.png`                                                     |
| UX F13 · regole e dati incoerenti                       | D&D Beyond (un valore derivato su ogni superficie)                      | Allerta aggiunge la competenza all'iniziativa (tracciatore e scheda); la card del personaggio legge la CA effettiva; i mostri senza incantesimi non mostrano slot                 | «UX P2 F13…» (due test)                     | `logs/f1-levelup.log` (+2 → +4)                                                            |
| UX F14 · notifiche sopra «Termina turno»                | notifiche impilate sopra il piede                                       | a 1440 × 900 finiscono 14 px sopra il piede della barra laterale                                                                                                                  | «P2 F14…»                                   | `s33`, `shots/s33-dm-toasts.png`                                                           |
| UX F15 · bersaglio e pannello si contraddicono          | BG3 (vantaggio o svantaggio sul bersaglio)                              | la targhetta del bersaglio scrive «Svantaggio: Prono» come il pannello                                                                                                            | «P2 F15…»                                   | `s32`, `shots/s32-aim-prone.png`                                                           |
| UX F16 · funzioni del DM difficili da trovare           | Foundry e Roll20 (richiesta di tiro e tiro segreto accanto alla chat)   | «Chiedi un tiro» nel compositore del DM; comandi `dice-tray.request`, `dice-tray.secret`, `chat.snapshot`; «Concludi incontro» propone PE e bottino                               | «P2 F16…» (due test)                        | `s31`, `shots/s31-request.png`                                                             |
| UX F17 · stessa cosa, controlli diversi                 | la finestra del tiro della scheda                                       | la pozione chiede «Digitali / Fisici» con le stesse radio; nomi separati: «Documenti» (Tavolo) e «Diario» (campagna), «Ambientazione» e «Mondo»                                   | «P2 F17 / P3 F23…»                          | `b62-ia-journey` (gruppo «Documents»)                                                      |
| UX F18 · Tavolo sul telefono                            | Owlbear (mappa prima, snackbar), BG3                                    | entrando la mappa viene in vista una volta; il messaggio compare sopra la hotbar per 4,5 s                                                                                        | «P2 F18…»                                   | `s28`, `shots/s28-phone-table-open.png`, `shots/s28-phone-table-map.png`                   |
| UX F19 · Preparazione sul telefono                      | Kanka mobile (una barra, il resto nel menu)                             | una sola barra: «Tutte le sezioni» accanto a «Entra al Tavolo»                                                                                                                    | «P2 F19…»                                   | `s29`, `shots/s29-phone-prep.png`                                                          |
| UX F20 · «Entra al Tavolo» due volte (voce aperta nota) | Kanka (comandi della campagna nella barra laterale)                     | «Entra al Tavolo» e il nome una volta sola                                                                                                                                        | «P2 F20…»; `visual2-pages` aggiornato       | `s24`, `shots/s24-campaign-1440.png`, `shots/s24-campaign-phone.png`                       |
| UX F21 · testi da sviluppatori                          | tono di D&D Beyond                                                      | frasi d'azione; «Perché alcune capacità non agiscono da sole?» ripiegato; niente «Concessione annotata» su ogni incantesimo                                                       | «P2 F21…»                                   | `shots/s4-builder-top.png`                                                                 |
| UX F22 · Inizio del DM con i testi del giocatore        | Roll20 «My Games»                                                       | titolo e bottoni del DM: «La prossima sessione», «Preparazione», «Prepara la sessione»                                                                                            | «P2 F22…»                                   | `s30`, `shots/s30-home.png`                                                                |

### P3 e voci aperte note

| Rilievo                                                                | Copiato da                                     | Cosa cambia                                                                                                     | Test                                   | Browser                       |
| ---------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------- |
| Completezza F5 · codici di ricerca visibili                            | —                                              | via «Modello: BG3 (CRP-…)» e simili; un test cerca i codici in ogni testo visibile                              | «P3 (integrations.withoutIds)…»        | —                             |
| Completezza F7 · 28 ricerche senza risultato                           | Alchemy OmniSearch, parole di ricerca di Kanka | sinonimi per comando e destinazioni senza comando (schede della scheda, sessioni, sicurezza, azioni del Tavolo) | «P3 SV-02/SV-03…» (tutte le 28 parole) | `s31`                         |
| Completezza F8 · TV-14 doppio clic sulla pedina                        | Foundry e Roll20                               | il doppio clic apre la scheda (o la scheda Creatura)                                                            | «P3 TV-14…»                            | —                             |
| Completezza F10 · lettori del sussurro per account                     | Owlbear (un nome per giocatore), CA-57         | «Sussurro a DM · leggono: Livia, Mira · Giocatore»                                                              | «P3 (CA-57 playedBy…)»                 | `chat-journey`                |
| Privacy P3 · il DM non ritrova nei dadi 3D i tiri «Io e il DM»         | convenzione `acceptedRolls` dello stato        | il tiro «Io e il DM» appartiene al DM e lo controlla chi tira                                                   | «P3 (state.mjs acceptedRolls…)»        | `dice-tray-review-journey`    |
| Privacy P3 · proiezione prima dell'invio                               | —                                              | regola prescrittiva in [BLUEPRINT_CONTRACT](../../docs/interview/BLUEPRINT_CONTRACT.md) e in DEVELOPMENT        | —                                      | —                             |
| UX F23 · pozione senza numero                                          | —                                              | l'avviso della pozione dice quanti PF ha curato                                                                 | «P2 F17 / P3 F23…»                     | —                             |
| UX F24 · distanza non mostrata trascinando                             | Owlbear e Foundry                              | targhetta della distanza sopra la destinazione, lontana dal nome                                                | «P3 F24…»                              | —                             |
| UX F26 · maiuscolo nei CSS delle aree (Critica 8)                      | DESIGN §2                                      | nessun `text-transform: uppercase` (22 regole in 13 file): maiuscoletto                                         | «P3 F26…»                              | `chat-journey` («Narrazione») |
| UX F26 · chip dell'ambito ripetuto nelle Preferenze (voce aperta nota) | Foundry «Game Settings»                        | l'ambito una volta, come titolo del gruppo                                                                      | «P3 F26 C2-4…»                         | `s30`, `shots/s30-prefs.png`  |
| UX F26 · fascia dei PF della scheda (voce aperta nota)                 | D&D Beyond (il numero dei PF apre la gestione) | via la riga in più; il numero apre temporanei, massimo, registro e correzioni; il messaggio sparisce dopo 12 s  | «P3 F26 C2-3…»                         | `s11`                         |
| UX F26 · «Il tuo personaggio» stirato (voce aperta nota)               | D&D Beyond «My Characters», card di Kanka      | ogni card alla sua altezza                                                                                      | «P3 F26 C2-5…»                         | `s30`                         |
| UX F27 · «⋯» al posto delle icone nel menu della pedina                | Foundry e Owlbear                              | cuore per i PF, lente per Esamina e Cerca, borsa per il Bottino                                                 | «P3 F27…»                              | —                             |
| UX F28 · «PE DELL'INCON-TRO»                                           | —                                              | niente sillabazione automatica                                                                                  | «P3 F28…»                              | —                             |
| Un solo primario per vista (DESIGN §3)                                 | DESIGN §3                                      | «Attiva per il gruppo» e «Lancia» non più pieni d'oro                                                           | —                                      | —                             |

Le sei voci aperte note (panoramica della campagna, sotto-schede in tre righe, fascia dei PF,
chip delle Preferenze, card di Inizio, mappa del telefono all'apertura) sono chiuse: righe F20,
F9, F26 e F18 qui sopra.

## Non corretto, con la ragione

| Voce                                                                                                                                                                             | Ragione                                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UX F12 · il riposo del giocatore aspetta il DM                                                                                                                                   | oggi è coerente con la discrezione del DM e con REST_TIME_FLOW; D&D Beyond e Foundry dnd5e lasciano tirare subito i Dadi Vita. Cambiarlo è una scelta di prodotto: Q164 (raccomandazione: impostazione del DM, spenta per partire) |
| Completezza F6 · nomi dei concorrenti nei testi (circa 36 in 15 moduli)                                                                                                          | utili alla revisione dell'owner, da togliere nel prodotto: Q165                                                                                                                                                                    |
| B9 · dadi «karmici»                                                                                                                                                              | cambia l'equità dei tiri: Q166                                                                                                                                                                                                     |
| B2–B8 · bersaglio persistente, tiri nel testo della chat, barre delle risorse sulla pedina, mappe video, gioco sullo stesso dispositivo, meteo animato, verifica in due passaggi | capacità nuove oltre il censimento, non rifiniture: ciascuna chiede un'area con il suo test e il suo percorso. Q167 per l'ordine                                                                                                   |
| Completezza F9 · dieci invii vuoti senza messaggio                                                                                                                               | dieci controlli in otto aree: serve un modello unico di campo obbligatorio (messaggio sotto il campo e fuoco sul campo), da fare in un passaggio dedicato con un test per area; P3, non economico in questo giro                   |
| X-05 · preferenze delle notifiche in due posti (campanella e Preferenze)                                                                                                         | resta PARTIAL nel censimento: unirle sposta un comando che l'owner usa da due punti; da decidere con la revisione dello stile                                                                                                      |
| UX F17 · select dei dadi al Tavolo                                                                                                                                               | la hotbar non ha spazio per due radio; unica eccezione dichiarata in DESIGN                                                                                                                                                        |
| UX F10 · righe dell'inventario con due azioni su due linee                                                                                                                       | la riga di D&D Beyond ha un solo comando e il resto nel menu: ora il menu contestuale c'è (X-06), togliere i bottoni è una scelta di densità da rivedere con lo stile                                                              |
| UX F9 · piede della barra alto ~220 px con «Rialzati»                                                                                                                            | lo spazio è stato guadagnato con le sotto-schede su una riga (da 147 a 59 px); «Rialzati» è il comando di Prono del turno e resta in vista, spostarlo nel menu costerebbe un clic a chi è a terra                                  |
| UX F23 · tre segnali per ogni tiro                                                                                                                                               | corretta solo la pozione (con il valore); ridurre dadi 3D, riquadro e avviso a uno cambia le preferenze dei dadi 3D già approvate                                                                                                  |
| UX F24 · etichetta di «Misura» sopra il nome della pedina                                                                                                                        | la distanza del trascinamento è sistemata; l'etichetta dell'attrezzo «Misura» segue il puntatore e va spostata con il suo attrezzo                                                                                                 |
| UX F25 · barra delle opzioni della nebbia in basso a sinistra                                                                                                                    | nessun riferimento in DESIGN; Owlbear mette le opzioni nella fila degli attrezzi: da fare con il passaggio sugli attrezzi del DM                                                                                                   |
| UX F26 · segnalini degli oggetti sulla mappa da 19 × 19 px (Critica 7)                                                                                                           | ingrandirli cambia la scala delle pedine sulla griglia; resta nelle voci aperte della critica visiva                                                                                                                               |
| UX F27 · «Non è il suo turno.» coperto dalle icone del piede                                                                                                                     | corrette solo le icone del menu della pedina; la frase va spostata ridisegnando il piede della hotbar, fuori da questo giro (P3)                                                                                                   |
| UX F28 · «Confronta» su ogni incantesimo                                                                                                                                         | requisito dell'owner MAG-04 (confronto affiancato); il riferimento più vicino è il confronto degli oggetti di BG3                                                                                                                  |
| Censimento: CA-61, CA-75, CA-88, SV-28, SV-37, SV-46 ancora PARTIAL                                                                                                              | fuori dai rilievi delle revisioni finali; il censimento dice per ognuna cosa manca                                                                                                                                                 |

## Percorsi del browser

Nuovo: `final-fixes-journey.js` (IT 1440, clic e tasti veri, stato pulito): sorpresa di Livia e
Mira (due d20, il più basso; Doran uno), menu «Sessione» sopra l'ordine di turno (6 righe, ognuna
colpisce sé stessa), hotbar del giocatore su Mira al suo turno, Inizio a 400 px → scheda a 0 con
il fuoco sul titolo → «Indietro» a 400 px, PF della scheda `=15`, `-2`, `+1`, `2+3` (18 → 15 → 13
→ 14 → 9) e «abc» spiegato, Maiusc+F10 su un incantesimo («Lancia», «Dettagli», «Confronta»; Esc
chiude e il fuoco torna), Esc su «Ripristina predefiniti» torna a «Preferenze», targhetta
«Svantaggio: Prono», creatura trascinata dal Compendio sulla mappa (5 → 6 pedine), vassoio dei
dadi staccato in una finestra con l'identità del DM e il tiro che arriva alla scheda principale.

Percorsi aggiornati al minimo, con un commento datato «Final review …» in ogni punto:
`campaign-members`, `campaign-members-review` (l'espulso non vede Doran), `dice-tray-review` e
`p3-roll-engine` (ordine del vassoio, clic sul numero), `offline`, `sheet-plus` (tiro al clic),
`inventory-plus`, `p4-inventory` (opzioni ripiegate in «Visualizzazione»), `chat` (maiuscoletto),
`damage-tray` (riquadro compatto), `core` (radio dei dadi della pozione), `b61-review-fixes` (la
riga delle sotto-schede scorre e resta dove l'ha lasciata; otto schede del giocatore; il
Compendio tra i pannelli), `b62-ia` (otto schede con «Consultazione», gruppo «Documents»),
`party` («Entra al Tavolo» nella barra della campagna), `preferences` («Annulla» sulla conferma
riapre Preferenze), `p3-hp` (il numero dei PF apre la gestione dei PF, «Correggi» è una sua
sezione), `notifications` (salire di livello non chiede più di confermare la scheda),
`encounter-builder` (le fasce spiegate a parole, senza il codice CMP-106).

Due difetti reali trovati dai percorsi e corretti partendo da un test rosso:

- **Chat compatta sul telefono:** i bottoni della riga («Share», «Vote», «Snapshot», «/?») erano
  alti 36 px anche al tatto; ora 40 px sul tatto e sotto i 720 px («P2 F8…»).
- **Opzioni dell'inventario che si richiudevano:** «toggle» arriva dopo il clic, quindi una scelta
  fatta subito dopo aver aperto «Visualizzazione» ridisegnava la sezione chiusa; ora il ridisegno
  legge lo stato vivo («P2 F10: an option changed right after opening…»).

Ultimo esito per percorso (70/70 verdi): `b61-review-fixes`, `b62-ia`, `b62-review-fixes`,
`back-guard`, `builder`, `builder-advance`, `campaign-members`, `campaign-members-review`,
`campaign-members-review2`, `campaign-mobile`, `character-library`, `character-library-review`,
`chat`, `chat-review-fixes`, `combat`, `combat-tracker`, `combat-tracker-review`,
`command-palette`, `compendium`, `core`, `damage-tray`, `dice-3d`, `dice-tray`,
`dice-tray-review`, `encounter-builder`, `final-fixes`, `handoffs`, `home`, `integrations`,
`inventory-plus`, `inventory-plus-review`, `knowledge`, `knowledge-review`, `loot`, `measure`,
`notifications`, `offline`, `p1-leveling`, `p3-axe-hp`, `p3-hp`, `p3-privacy`, `p3-roll-engine`,
`p4-inventory`, `p4-prep`, `p4-rest`, `p6-dm-table`, `p6-phone-map`, `p6-table-more`,
`p9-palette`, `party`, `preferences`, `preparation`, `quickbar`, `quickbar-review`, `r1-privacy`,
`r5-encounters`, `r5-initiative`, `r8-palette`, `reactions`, `residuals-a`, `residuals-b`,
`rest-shared`, `session-view`, `sheet-plus`, `special-moves`, `spells-plus`,
`spells-plus-review`, `token-menu`, `visual-fixes`, `w2b1-shell` (tutti `-journey.js`). Righe
complete in `logs/journeys.log`, riepilogo in `logs/journeys-final.txt`.

Note sui giri: `measure` è stato rosso una volta nel giro lungo («Measure label missing», letto
subito dopo il movimento del puntatore) e verde da solo e subito dopo `p4-prep`, cioè nello stesso
ordine: un'intermittenza di tempi, non un cambiamento di questo lavoro. `builder-advance` va
eseguito dopo `builder` (lo dice il percorso). `campaign-members` e `chat-review-fixes` usano file
d'esempio copiati nella cartella delle prove (`not-an-image.txt`, `glass-ruins-cover.png`,
`big-680kb.png`, `noise0-3.png`). La regressione completa di tutti i percorsi resta alla fase
successiva.

## Test

`node --test design/blueprint/tests/*.test.mjs`: **2628/2628** (46 test nuovi in
`tests/final-fixes.test.mjs`; aggiornati a comportamenti voluti `combat`, `reactions` (slot dei
goblin), `ia-consolidation` (otto schede del giocatore), `visual2-pages` (intestazione senza
«Entra»), `w2b1-integration` (tre tiri privati), `damage-tray` (riquadro compatto)).
