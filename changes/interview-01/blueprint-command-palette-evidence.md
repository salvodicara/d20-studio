# B23 — Ricerca globale, palette dei comandi e scorciatoie: evidenze

24/09/2026. Area B23 del blueprint (`design/blueprint/command-palette.mjs`), caricata dal
registro (B11) come le altre aree. Tutto è locale e simulato nel browser: nessun indice su
server, nessuna sincronizzazione tra dispositivi. Dati sintetici coerenti con lo stato
esistente: Livia, Doran, Iria, Mira, le creature della scena, la campagna `lanterns`, le voci
della campagna, i contenuti delle altre aree (chat, materiali, immagini, tabelle…) e il
compendio SRD 5.2.1 già presente.

## File

| File                                                               | Contenuto                                                                                                                                                                                                                |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `design/blueprint/command-palette.mjs`                             | modulo d'ingresso: indice dei contenuti leggibili, ricerca con tolleranza ai refusi, prefissi `>` `@` `?`, palette (controller + dialogo), creazione rapida, guida generata, editor delle scorciatoie, gestore dei tasti |
| `design/blueprint/shortcuts.mjs`                                   | dominio puro delle scorciatoie: tasti effettivi per identità, conflitti, tasti riservati, spostamento, ripristino, etichette IT/EN e Mac, gruppi della guida                                                             |
| `design/blueprint/command-palette.css`                             | stili con prefisso `cmdk-`, token di `styles.css`; palette in colonna che entra sempre nello schermo (1440×900 e 390×844)                                                                                                |
| `design/blueprint/tests/shortcuts.test.mjs`                        | 8 test Node sul dominio                                                                                                                                                                                                  |
| `design/blueprint/tests/command-palette.test.mjs`                  | 16 test Node con store, registro e dominio `campaign-content` reali (ricerca, permessi, revoca, creazione rapida, controller, tasti, editor, guida, markup)                                                              |
| `changes/interview-01/blueprint-checks/command-palette-journey.js` | percorso nel browser reale, 13 passi, IT desktop 1440 (giocatore e DM) + EN telefono 390 al tocco                                                                                                                        |
| `changes/interview-01/blueprint-command-palette-evidence.md`       | questo documento                                                                                                                                                                                                         |

**File condivisi toccati: nessuno.** `extensions.mjs` elencava già `command-palette`. L'area
usa solo punti del registro esistenti: sostituisce il servizio `search` (previsto per B23 nel
piano del registro), registra una sezione di stato `command-palette` (`undo: "preserve"`), i
propri comandi e i propri stili, e ascolta `reset` e `role-changed`.

## Dove si trova (≤ 3 clic)

- **Lente nell'intestazione** (ogni pagina, anche il Tavolo; nome accessibile «Cerca» come la
  ricerca del core che sostituisce): 1 clic apre «Cerca e comandi». Oppure **Ctrl+K / ⌘K**
  ovunque, anche mentre si scrive in un campo.
- **N** (fuori dai campi di testo) apre la **Creazione rapida**; dalla palette, pulsante
  «Creazione rapida» in basso (2 clic, anche al tocco).
- **?** apre la **Guida alle scorciatoie**; dalla palette, «Scorciatoie» (2 clic) → «Modifica
  le scorciatoie» (3 clic) apre l'editor.
- Dalla scheda di un personaggio nella scheda **Magie**, la palette si apre già filtrata sugli
  incantesimi (e da Inventario sugli oggetti, da Campagna › Mondo sulle voci del mondo, da
  Campagna › Diario sui resoconti, da Appunti sulle note).

## Capacità → prova

| Capacità (censimento)                                             | Percorso                                           | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Regola / fonte                                                                                                          | Pattern adottato (prodotto, ID)                                                                                                                                                                                                                                                                                  | Prova                                                                                                                                   |
| ----------------------------------------------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **SV-02** Palette con prefissi e filtro contestuale               | Lente o Ctrl/⌘+K → campo «Cerca» + «Categoria»     | Una sola ricerca per pagine, personaggi e compagni, magie e oggetti delle schede leggibili, voci della campagna (note, persone, luoghi, fazioni, missioni, resoconti), scene (DM), PNG (DM: apre il Tavolo e seleziona la pedina), compendio SRD, risultati delle altre aree, comandi. `>` elenca solo i comandi permessi a questa identità (compresi «Vai a: …» per ogni pagina accessibile); `@` elenca i filtri, `@incantesimi dardo` o `@spells fire` applica il filtro e lo toglie dal testo; `?` mostra prefissi e guida. Backspace nel campo vuoto toglie il filtro. Frecce, PagSu/PagGiù, Invio apre, Esc chiude subito.                                                                                                               | Nessuna regola di gioco: si consulta, non si applica (F-062, I-184)                                                     | Quick Insert, **modulo** Foundry (FVT-187: `@` filtro, `>` comandi, `?` aiuto, filtro dal contesto della scheda); Alchemy OmniSearch (VTL-211: Cmd/Ctrl+K, frecce, Invio, Esc chiude la modale in cima); Kobold+ Ctrl/Cmd+K (CMP-108); Owlbear Scry!, estensione di terzi (VTL-107: cerca e seleziona la pedina) | Journey passi 1, 3–7, 11; test «> lists only…», «from the Spells tab…», «controller…»; `b23-01`, `b23-02`, `b23-03`, `b23-05`, `b23-08` |
| **SV-03** Ricerca tollerante ai refusi, per categoria, con filtri | Stesso campo; filtro «Categoria» o `@`             | Nomi IT **e** EN e alias (es. «fire bolt» trova Dardo di fuoco anche in italiano), accenti ignorati; esatto > inizio > parola intera > inizio di parola > contenuto > tutte le parole > **refuso** (1 errore da 4 lettere, 2 da 8, trasposizioni comprese) > testo della voce con frammento evidenziato. «concentrazoine» trova «Concentrazione» (Regola · SRD 5.2.1). Ogni riga ha badge del tipo (Personaggio, Nota, Luogo, Incantesimo, Regola, Comando, «Immagini e file»…) e ambito (Solo io / Campagna / Scheda di Livia / SRD 5.2.1). Conteggio annunciato in una regione `aria-live`.                                                                                                                                                  | Voce «Concentrazione» del compendio SRD 5.2.1 (2024), EN p. 179 / IT p. 206, già caricata da B16                        | TaleSpire ricerca dal vivo tollerante ai refusi (VTL-203); D&D Beyond type-ahead per categoria con descrizioni brevi e tolleranza agli errori, **annunciato** (DDB-164); LegendKeeper testo completo (CMP-242)                                                                                                   | Journey passo 3 e 6; test «fuzzy matching…», «'liv' finds Livia first…»; `b23-04-typo.png`                                              |
| **SV-04** Creazione rapida di qualsiasi voce                      | **N** ovunque, o palette → «Creazione rapida»      | Dialogo con tipo (Nota personale, Persona, Luogo, Fazione, Missione), titolo e testo facoltativo. Crea la voce vera nel dominio `campaign-content` (bozza → salva → revisione → applica in un solo commit privato), **«Solo io»** finché l'autore non la condivide dalla voce. Si resta nella stessa pagina («torna»); avviso con il tasto per ritrovarla; la voce è subito cercabile e prima nei Recenti. Funziona anche senza rete (è privata). Senza campagna: solo note personali.                                                                                                                                                                                                                                                         | Nessuna regola di gioco                                                                                                 | Kanka: N apre il quick creator per qualsiasi tipo con campi minimi (CMP-237, CMP-238)                                                                                                                                                                                                                            | Journey passi 2, 11, 13; test «N quick create…», «quick create dialog…»; `b23-14-phone-create.png`                                      |
| **SV-17** Scorciatoie ricollegabili, conflitti, ripristino        | Guida → «Modifica le scorciatoie» (o `>configura`) | Elenco per categoria (Ovunque, Sul Tavolo, altre pagine, «Vai a una pagina» ripiegato), ricerca per nome o tasto. Clic sul tasto → «Premi i tasti…» → la combinazione. Tasti riservati rifiutati (Esc, Tab, Invio, Spazio, frecce del Tavolo, Ctrl+A/C/V/X/Z). Tasto già usato in un contesto sovrapposto → avviso che nomina il comando e il contesto, con «Assegna e sposta» o «Annulla»; spostato, l'altro resta senza tasto. «Togli», «Predefinita» per riga; «Ripristina predefinite (n)» con conferma nella pagina. Scelte **personali per identità**, salvate nello stato, sopravvivono al ricaricamento, mai annullate dall'Undo di gioco.                                                                                             | Tasti riservati del core (`CORE.command` in `registry.mjs`)                                                             | Foundry core Configure Controls: categorie, ricerca, conflitti, legami bloccati, Reset Defaults con conferma (FVT-191, SVC-162); BG3 categorie e reset (CRP-182)                                                                                                                                                 | Journey passi 8–10; test «editor: E conflict…», dominio `tests/shortcuts.test.mjs`; `b23-07-conflict.png`, `b23-13-controls.png`        |
| **SV-18** Guida generata dal registro dei comandi                 | **?** ovunque, o palette → «Scorciatoie»           | Generata ogni volta dai comandi visibili all'identità (il DM vede anche i suoi): prefissi della ricerca, poi Ovunque, Sul Tavolo, altre pagine; tasti in `<kbd>` con nomi italiani (Maiusc, Invio) o inglesi, ⌘/⌥/⇧ su Mac; «personalizzata» e «conflitto» segnati; sezione «Conflitti» (anche quelli del caricamento delle aree); conteggio dei comandi senza tasto.                                                                                                                                                                                                                                                                                                                                                                          | —                                                                                                                       | Kobold+ modale generata dalle scorciatoie registrate (CMP-239); D&D Beyond Maps foglio delle scorciatoie (DDB-127) ed etichetta adattata a Windows/Mac (DDB-086); Roll20 tasti nei tooltip (R20-197)                                                                                                             | Journey passi 8, 9, 13; test «the guide is generated…»; `b23-06-guide.png`, `b23-11-phone-guide.png`                                    |
| **X-08** Registro unico dei comandi → palette, guida, tasto       | Tutto quanto sopra                                 | Un catalogo: comandi del registro (`registry.list("command")` con ruoli e `when`) + navigazione del core (pagine, sezioni della campagna, aree con pagina). Lo stesso comando compare nella palette con il suo tasto, nella guida e nell'editor; un solo gestore dei tasti usa le scelte dell'identità e impedisce al gestore della shell di eseguire un predefinito spostato. Nuovi comandi della palette: Apri ricerca (Ctrl/⌘+K), Creazione rapida (N), Guida (?), Configura, Annulla la tua ultima modifica, Riposi (Y), Termina turno, Condizioni e stato della pedina selezionata, Registro, Avvia o concludi il combattimento (Alt+R, solo DM). I comandi del Tavolo premono i controlli del core (stesse conseguenze, stessi rifiuti). | «Termina turno» usa il controllo esistente (`advanceTurn`, conseguenze in attesa, senza rete): nessuna regola duplicata | Improved Initiative: ogni comando ha id, etichetta, tasto predefinito, posto in barra/riga e tooltip con il tasto (CMP-155–157, VTL-130); Y riposo di BG3 (CRP-153, adattato: apre il pannello dei riposi, dove si sceglie breve o lungo)                                                                        | Journey passi 4, 9, 11; test «key dispatch…», «the area replaces…»; `b23-02`, `b23-08`                                                  |
| **SV-01 / F-062 / I-184** Permessi, ritorno, revoca               | Ricerca in qualsiasi pagina                        | Solo proiezioni già leggibili: il DM non trova la nota «Solo io» del giocatore né il suo documento privato; una scheda privata non compare all'altra identità; PNG e scene in preparazione solo al DM. Invio apre, **Indietro del browser** torna al contesto; riaprendo, termine e filtro scelto tornano (testo selezionato: si riscrive o si riapre); «Torna a: …» in cima. Una voce condivisa e poi **revocata** sparisce dalla ricerca e nei Recenti diventa «Voce non più disponibile» senza il vecchio titolo; sceglierla la toglie (correzione). Il filtro dal contesto (Magie) non si ricorda altrove.                                                                                                                                 | Autorità della voce in `campaign-content` (`setCampaignEntryAccess`)                                                    | Kanka ricerca della campagna e Quick Insert come riferimenti di F-062 (R156); ritorno con ricerca conservata I-184 (DELEGATED)                                                                                                                                                                                   | Journey passi 3, 11, 12; test «revocation…», «private sheets stay private…»; `b23-09-revoked.png`                                       |
| **SV-23 / SV-30** Tastiera, fuori rete                            | —                                                  | Campo `combobox` con `aria-activedescendant`, `listbox` e opzioni ≥ 48 px; bersagli ≥ 40 px; focus nel campo all'apertura. Senza rete la ricerca funziona e lo stato dice «senza rete: solo ciò che è su questo dispositivo»; creazione rapida e scorciatoie funzionano perché private.                                                                                                                                                                                                                                                                                                                                                                                                                                                        | —                                                                                                                       | WAI APG combobox (già fonte di NAV-11)                                                                                                                                                                                                                                                                           | Journey passi 1, 3, 13; test «palette markup…», «N quick create…» (offline)                                                             |

## Controlli d'accettazione della scheda B23

| #   | Accettazione                                                                                      | Dove è provato                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Ctrl/Cmd+K ovunque; «liv» trova Livia e le note accessibili con badge; Invio apre, Indietro torna | Passo 3 (Ctrl+K sul Tavolo, Meta+K al ritorno): Livia prima (Personaggio · Campagna), nota «Solo io», documento del giocatore, ≥ 3 tipi; Invio → scheda di Livia; `goBack` → Tavolo; termine conservato                                                                              |
| 2   | `>` solo i comandi permessi; `@` filtra                                                           | Passo 4 (giocatore: niente «Avvia o concludi il combattimento» né «Nuovo handout»), passo 11 (DM li vede); passo 5 (`@`, `@note liv` → solo Note)                                                                                                                                    |
| 3   | «concentrazoine» trova Concentrazione                                                             | Passo 6: prima riga «Concentrazione» · Regola · SRD 5.2.1; Invio apre la voce nel compendio                                                                                                                                                                                          |
| 4   | Dalla scheda Magie la ricerca è già filtrata agli incantesimi                                     | Passo 7: Categoria = Incantesimi, prime righe le magie di Livia nell'ordine della scheda; «dardo» → solo incantesimi                                                                                                                                                                 |
| 5   | N crea una nota rapida e torna                                                                    | Passo 2 (N sul Tavolo → nota privata, si resta sul Tavolo), passo 11 (DM crea un Luogo), passo 13 (tocco, EN)                                                                                                                                                                        |
| 6   | «?» mostra la guida generata; ricollegare «Termina turno» a E segnala il conflitto; ripristino    | Passi 8–10: il conflitto nomina il comando che tiene E («Aura sulla pedina selezionata», area B18); Annulla, poi «Assegna e sposta»; tasto riservato rifiutato; ricaricamento; E sul Tavolo esegue Termina turno («Nessun combattimento in corso.»); «Ripristina tutte» con conferma |
| 7   | Le revoche restano rispettate                                                                     | Passo 12: la Torre Grigia condivisa dal DM e poi riportata a «Solo io» sparisce dalla ricerca del giocatore e dai Recenti (senza titolo), correzione con un tocco                                                                                                                    |

## Verifiche svolte

- `node --test design/blueprint/tests/shortcuts.test.mjs design/blueprint/tests/command-palette.test.mjs`:
  24/24.
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: 1070/1070 (24/09, con le
  altre aree presenti in quel momento).
- Browser reale (Chromium, `playwright-cli -s=d20-b23`, server `127.0.0.1:8879`):
  `command-palette-journey.js` superato per intero; nessun `pageerror`. Passi: 1 lente, Esc e
  compatibilità con i controlli della ricerca del core; 2 N sul Tavolo; 3 «liv», frecce,
  Invio, Indietro, termine conservato (⌘K); 4 `>`; 5 `@`; 6 refuso; 7 contesto Magie;
  8 guida, conflitto E, Annulla, sposta, tasto riservato; 9 ricaricamento ed E sul Tavolo;
  10 ripristino con conferma; 11 DM: privacy, comandi del DM, Luogo creato e condiviso;
  12 giocatore: trova, apre; revoca; Recenti corretti; 13 telefono EN 390 al tocco: lente,
  filtro, apertura, creazione rapida, guida, editor, nessun overflow, piede del dialogo dentro
  lo schermo, bersagli ≥ 40 px.
- Controlli a parte con le fixture del registro (`?fixture=sample-extension,failing-extension`):
  «Cerca» → `[name=query]` «prima» → `.search-result` «Prima nota» apre la pagina dell'area;
  «prov» → testo esatto «Prova»; Ctrl+Maiusc+N esegue il comando dell'area; Ctrl+Maiusc+E su un
  comando guasto resta isolato con l'avviso. I percorsi di altre aree che usano la ricerca del
  core (account, chat, campaign-notes, campaign-integration, registry-smoke) usano gli stessi
  agganci; non li ho rieseguiti per intero perché scrivono nelle cartelle di prova delle loro aree.

Schermate 1440×900 e 390×844 (fuori dal checkout), controllate a vista:
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B23/`

| File                         | Stato                                                            |
| ---------------------------- | ---------------------------------------------------------------- |
| `b23-01-liv-it.png`          | «liv» sul Tavolo: Livia, nota «Solo io», oggetti, immagini, chat |
| `b23-02-commands-player.png` | `>` del giocatore, comandi del Tavolo per primi con i loro tasti |
| `b23-03-filter-notes.png`    | `@note liv`: solo note                                           |
| `b23-04-typo.png`            | «concentrazoine» → Concentrazione                                |
| `b23-05-spells-context.png`  | scheda Magie: filtro Incantesimi, magie di Livia in ordine       |
| `b23-06-guide.png`           | guida generata                                                   |
| `b23-07-conflict.png`        | conflitto E con «Assegna e sposta» / «Annulla»                   |
| `b23-08-commands-dm.png`     | `>` del DM                                                       |
| `b23-09-revoked.png`         | Recenti con «Voce non più disponibile»                           |
| `b23-10-phone-en.png`        | telefono EN: «fire», righe compatte                              |
| `b23-11-phone-guide.png`     | telefono EN: guida                                               |
| `b23-12-phone-controls.png`  | telefono EN: editor                                              |
| `b23-13-controls.png`        | editor a 1440                                                    |
| `b23-14-phone-create.png`    | telefono EN: creazione rapida                                    |

## Scelte e adattamenti

- **E non è un predefinito della palette.** Improved Initiative usa «e» per la modifica rapida
  di un combattente; al Tavolo E è già dello strumento Aura (B18, caricato prima). Per la regola
  del registro vince il primo caricato: prenderlo avrebbe prodotto un avviso permanente in «Cosa
  è pronto». «Condizioni e stato della pedina selezionata» resta senza tasto; è proprio E il
  tasto su cui l'accettazione mostra il conflitto.
- **«Termina turno» senza tasto predefinito.** BG3 usa Spazio (CRP-093), riservato al Tavolo;
  Improved Initiative usa N (CMP-155), che qui è la creazione rapida di Kanka. Si assegna
  dall'editor.
- **Conflitti risolti esplicitamente.** Foundry mostra un avviso e lascia due comandi sullo
  stesso tasto; qui si chiede «Assegna e sposta» o «Annulla», così un tasto non esegue mai due
  comandi. Se un'area caricata dopo porta un predefinito uguale a una scelta dell'identità, vince
  la scelta (e la guida lo segna come conflitto).
- **Esc chiude subito la palette** (Alchemy), anche con testo nel campo: il campo di ricerca
  nativo altrimenti lo cancellerebbe al primo Esc.
- **Recenti, ultimo termine e «Torna a»** sono dati di comodità di questo dispositivo per
  ciascuna identità (`localStorage`), come la cronologia di Quick Insert; non entrano nel
  registro delle modifiche. «Ripristina esempio» li cancella.
- **Compatibilità con la ricerca del core**: il nome «Cerca», il campo `name="query"`, l'elenco
  `#search-results` e la classe `search-result` sul titolo di ogni risultato restano, così i
  controlli già scritti per la ricerca del core continuano a valere. Il tasto è indicato nella
  palette e nella guida, non nel nome del pulsante.
- I risultati delle aree arrivano dal loro `search` con i loro permessi; il compendio SRD è
  indicizzato direttamente (nomi IT/EN, alias, tipi) e il suo fornitore non viene ripetuto.

## Limiti onesti

- Mancano, rispetto a Quick Insert: la calcolatrice `=`, l'inserimento o trascinamento di un
  risultato in una scheda o in un testo, la selezione multipla con Maiusc. Aprire un risultato
  consulta, non aggiunge nulla (come chiede I-184).
- La tolleranza ai refusi è completa sui contenuti del core e sul compendio; per i contenuti
  delle altre aree la palette interroga il loro fornitore con il termine e con le sue prime 3–4
  lettere, quindi un refuso nelle prime lettere di un messaggio di chat può non trovarlo.
- Ricerca semantica, sinonimi oltre agli alias ed EN/IT dei testi liberi non ci sono; nessuna AI.
  D&D Beyond ha solo annunciato la sua ricerca (DDB-164): copiamo raggruppamento per tipo e
  tolleranza agli errori, non un comportamento osservato.
- I comandi del Tavolo (Termina turno, Registro, Avvia/concludi, Condizioni e stato) premono il
  controllo visibile del core: se il controllo non c'è (turno di un altro, nessuna pedina
  selezionata) il comando lo dice e non fa nulla.
- Le scorciatoie sono personali nello stato di esempio di questo browser: nessuna sincronizzazione
  tra dispositivi; il DM non può proporle a un giocatore (SV-21). Nessuna opzione per altri layout
  di tastiera (Universal Keybindings, SVC-162): Alt+lettera usa il tasto fisico, gli altri tasti
  il carattere prodotto.
- Sul telefono la palette, la creazione rapida, la guida e l'editor funzionano al tocco; catturare
  un nuovo tasto richiede una tastiera collegata (lo dice l'editor).
- Solo Chromium; nessuna prova con lettore di schermo (SV-24 resta aperta).
- Elenco limitato a 50 risultati (150 comandi con `>`); non c'è paginazione.

## Review fixes — correzioni dopo la revisione (24/09/2026)

Dieci segnalazioni della revisione di B23. Ognuna è stata prima riprodotta (test Node che
falliva, oppure il browser), poi corretta nei soli file di B23. **File condivisi toccati:
nessuno** (né `app.mjs`, né `registry.mjs`, né `help.mjs`, né `chat-domain.mjs`).

| Grav. | Segnalazione                                                    | Esito                  | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Prova                                                                                                                                                                                                                      |
| ----- | --------------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1    | Il bonus del contesto faceva trovare tutto anche con un refuso  | Confermata e corretta  | Il bonus di contesto (+50) si aggiunge solo a un risultato che corrisponde davvero. Con «gobbllin zzz» sul Tavolo o «qqqzzzxx» nella scheda Magie la lista dice «Nessun risultato» e Invio non fa nulla (prima eseguiva «Termina turno»).                                                                                                                                                                                                                                                                                                      | Test «a query that matches nothing…»; journey 14 b e f (la palette resta aperta, nessun avviso «Nessun combattimento»).                                                                                                    |
| P1    | Dopo la revoca, la chat della campagna restava cercabile        | Confermata e corretta  | Difesa in profondità nella palette: senza accesso alla campagna, i risultati delle aree che aprono Campagna, Tavolo, Preparazione o la vista di gioco vengono scartati. La causa (`searchChat` in `chat-domain.mjs` non controlla l'appartenenza) resta da correggere in B17: è tra le consegne qui sotto.                                                                                                                                                                                                                                     | Test «revoked membership…» con la vera area chat (prima: «Nome del compagno riservato: controlla la corda…»); journey 14 g; `campaign-integration-journey.js` ora supera il controllo «Search leaked former shared actor». |
| P2    | Chrome/Edge su Mac mostravano «Ctrl K»                          | Confermata e corretta  | Nuovo `isMacPlatform()` in `shortcuts.mjs`: riconosce «macOS» (Chromium), «MacIntel», «iPhone», «iPad» senza distinzione di maiuscole. Palette, guida, editor e avviso della creazione rapida mostrano ⌘K, come l'aiuto (F1).                                                                                                                                                                                                                                                                                                                  | Test «Mac detection…» con navigator finti; journey passo 2 (avviso «(⌘K)») e 14 c (guida ⌘K) su Chrome headless macOS.                                                                                                     |
| P2    | X-08: il tasto non arrivava a tooltip e `aria-keyshortcuts`     | Corretta in parte      | Nuovo `effectiveShortcut(ctx, id)` esportato (tasto attuale dell'identità). `decorateControls` scrive il tasto nel `title` («Cerca (⌘K)», «Misura (R)») e in `aria-keyshortcuts` della lente, dell'aiuto, delle notifiche, di Riposi, Termina turno, Registro, Avvia/concludi e degli strumenti Misura, Puntatore, Sagoma, Disegna, Seleziona; segue subito una modifica o una rimozione (dopo ogni disegno della pagina). Un'area può marcare il suo controllo con `data-command="<id>"`. I pulsanti della palette hanno `aria-keyshortcuts`. | Test «Mac labels on Chromium; effective keys…»; journey 14 a e d (ricollegata a ⌘J, il tooltip della lente diventa «Cerca (⌘J)»; ripristino → ⌘K).                                                                         |
| P2    | La guida non elencava i tasti fissi del core                    | Confermata e corretta  | Righe «fisso» generate da `CORE.command` (i tasti seguono il core), in italiano e inglese: Esc, Tab/Maiusc+Tab, Invio/Spazio ovunque; Ctrl/⌘+Z, frecce, Invio/Spazio sulla mappa (Foundry, legami bloccati).                                                                                                                                                                                                                                                                                                                                   | Test «the guide also lists the core's fixed keys…», «the core's fixed keys are listed…»; journey 14 c; `b23-15-guide-fixed.png`.                                                                                           |
| P3    | L'editor accettava Ctrl+R, Ctrl+F, Canc…                        | Confermata e corretta  | Rifiutati con il motivo: tasti del browser (Ctrl/⌘ + R F P S L W T N Q, Maiusc+R/W/T/N, F5, F11, F12) e, sul Tavolo, Canc e Backspace (tolgono le pedine selezionate del DM, menu della pedina DDB-117).                                                                                                                                                                                                                                                                                                                                       | Test «browser keys and Table element keys…», «editor refuses browser…»; journey 14 d.                                                                                                                                      |
| P3    | Creazione rapida senza annullamento                             | Limite registrato      | `campaign-content` non ha eliminazione né archiviazione delle voci e le modifiche narrative non sono annullabili (regola dell'incremento 7). La voce resta privata («Solo io») e si corregge dalla sua pagina. Serve un'eliminazione nel dominio della campagna: consegna al proprietario di `campaign-content`.                                                                                                                                                                                                                               | —                                                                                                                                                                                                                          |
| P3    | Dettagli di testo e ordine                                      | Corretta               | `>` senza testo: prima i comandi della pagina, poi gli altri in ordine alfabetico nella lingua scelta, poi «Vai a…». A parità di punteggio la lunghezza e l'ordine usano la lingua scelta. La riga dei conflitti ora dice la regola vera («vale la scorciatoia che hai scelto tu, altrimenti quella del comando caricato per primo»). «Nella pagina library» → «Nella pagina Biblioteca». Tab durante la cattura toglie «Premi la nuova combinazione» e lascia il fuoco dove va. Colonna dei tasti allineata per sezione (subgrid).            | Test «editor refuses browser… order are localized»; journey 14 c (descrizioni allineate) e d (Tab).                                                                                                                        |
| P3    | I-184 / F-062: fonti guaste, homebrew, ambito, filtro ricordato | Corretta in gran parte | Una fonte che fallisce viene chiamata a parte (contenuta dal registro) e nominata: stato «alcune fonti non hanno risposto: Ricerca guasta», lista vuota che lo dice. Homebrew della Biblioteca leggibile indicizzato (nome IT/EN, tipo della Biblioteca, «Personale» o «Condiviso», apre la revisione). Voce di un'altra campagna: «Altra campagna». Un fornitore può dichiarare `scope`, che la palette mostra. La categoria scelta torna solo nella pagina in cui è stata scelta; il testo torna ovunque.                                    | Test «a failing source…», «sheet spell rows… homebrew…», «the remembered category stays on its page…»; journey 13 (telefono, Indietro) e 14 e, h; `b23-16-failed-source.png`.                                              |
| P3    | Nome del file del percorso; magie della scheda aprivano l'SRD   | Una corretta, una no   | Le righe «Scheda di Livia» ora aprono la scheda nella tab Magie; la riga SRD resta per il compendio. Il nome `command-palette-journey.js` resta: `blueprint-home-evidence.md` lo riesegue già con questo nome; va corretta la riga della scheda in `docs/interview/CAPABILITY_CENSUS.md` (riga 1189, documento condiviso: consegna al coordinatore).                                                                                                                                                                                           | Test «sheet spell rows open the sheet…»; journey 13 (tap → `#characters?…tab=spells`) e 14 f.                                                                                                                              |

### Consegne ad altre aree

- **B17 (chat)**: `searchChat` in `chat-domain.mjs` deve controllare `isCampaignMember` prima di
  cercare messaggi e discussioni. La palette ora li scarta per un ex membro, ma la regola va
  nel dominio della chat.
- **B30 (aiuto)**: `help.mjs` scrive `Mod+K` e «F1» fissi. Dopo una modifica nell'editor l'aiuto
  mostra il tasto vecchio. Può leggere `effectiveShortcut(ctx, "command-palette.open")` e
  `effectiveShortcut(ctx, "home.help")` da `command-palette.mjs`, e usare `isMacPlatform()` da
  `shortcuts.mjs` al posto del proprio controllo della piattaforma.
- **Coordinatore**: la scheda di B23 in `CAPABILITY_CENSUS.md` nomina `palette-journey.js`; il
  file è `command-palette-journey.js`.
- **Aree con ricerca**: possono restituire `scope` (etichetta IT/EN) in ogni risultato, per
  dire chi lo legge («Solo io», «Campagna»); la palette lo mostra accanto al tipo.

### Verifiche dopo le correzioni

- `node --test design/blueprint/tests/shortcuts.test.mjs design/blueprint/tests/command-palette.test.mjs`:
  36/36 (12 test nuovi, scritti prima delle correzioni e falliti per le ragioni segnalate).
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: 1334/1334.
- Browser (Chromium headless su macOS, `playwright-cli -s=d20-b23`): `command-palette-journey.js`
  superato per intero, 14 passi, nessun `pageerror`. Il nuovo passo 14 prova tooltip e
  `aria-keyshortcuts`, Invio inerte dopo un refuso, tasti fissi e colonna allineata, rifiuti
  dell'editor, Tab, categoria per pagina, revoca (contesto separato) e fonte guasta
  (`?fixture=failing-extension`). Il passo 13 (telefono EN) ora prova anche Indietro con la
  categoria ricordata e il tap su una magia che apre la scheda.
- Regressioni della ricerca, copiate con le immagini in `B23/regress/` per non scrivere nelle
  cartelle di altre aree: `campaign-integration-journey.js` superato (2/2), `chat-journey.js`
  13/13, `campaign-notes-journey.js` 3/3, `account-journey.js` superato. Fixture
  `sample-extension`: «prima» → «Prima nota» apre la pagina dell'area, «prov» → «Prova».
  `registry-smoke-journey.js` si ferma al suo primo controllo, che presuppone nessuna area
  costruita: è superato da quando le aree esistono e non riguarda B23.

Nuove schermate: `b23-15-guide-fixed.png` (guida con righe «fisso», colonne allineate),
`b23-16-failed-source.png` (fonte guasta nominata). Le altre `b23-*.png` sono state rigenerate.

### Limiti rimasti

- **Barra e riga di X-08**: Improved Initiative mette ogni comando anche in una barra o in una
  riga. Qui il comando resta nel suo controllo, nella palette e nella guida. Mancano una barra
  personalizzabile e la scelta del posto.
- I tasti dei controlli sono mostrati per un elenco noto di controlli più `data-command`.
  Un'area che non marca il proprio pulsante non mostra il tasto nel tooltip.
- I tasti del visore delle immagini (+, −, 0) non sono riservati nell'editor.
- La creazione rapida non si annulla (vedi sopra); la voce si corregge dalla sua pagina.
