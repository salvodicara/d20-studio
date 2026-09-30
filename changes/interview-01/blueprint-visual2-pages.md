# Passaggio visivo 2 — Pagine: Inizio, Panoramica della campagna, Preferenze, Biblioteca

30/09/2026 · worktree `codex/interview-01` (lavoro non committato) · un solo scrittore
(Claude Code, Opus 5.5) · sessioni del browser `d20-visual2-pages` (catture e misure) e
`d20-visual2-pages-j` (percorsi) · server `http://127.0.0.1:8879/` · solo dati sintetici.

File riservati e cambiati (tutti in `design/blueprint/`): `home.mjs`, `home.css`, `campaign.mjs`,
`party.mjs`, `party.css`, `preferences.mjs`, `preferences.css`, `library.mjs`, `library.css`,
`DESIGN.md` (solo la nuova sottosezione «Pagine» in coda al §4), il test nuovo
`tests/visual2-pages.test.mjs` e questa nota. Non cambiati: `help.mjs`, `campaign.css`. Nessun
percorso del browser modificato nel repository.

Indicazione dell'owner (29/09): copiare i prodotti esistenti «a mani basse», un riferimento per
ogni scelta. Compito: Inizio come il cruscotto di Roll20 e la home di D&D Beyond con accesso;
Panoramica come il cruscotto della campagna di Kanka e la pagina della campagna di D&D Beyond;
Preferenze come il menu opzioni di BG3; schede della Biblioteca che scorrono sul telefono.

## In breve (prima → dopo)

| Superficie     | Prima                                                                                                                                                                                                                                    | Dopo                                                                                                                                                                                                                                                                                                                                                                         | Copiato da                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inizio**     | una colonna lunga (ripresa, personaggio e resoconto senza cornice, accesso rapido, appuntamento **sotto** l'accesso rapido, campagne…) e a destra una colonna delle novità alta circa 870 px (misurata sull'immagine) con i testi interi | una griglia sola: «Continua a giocare» con l'immagine della campagna e, **accanto, alla stessa altezza**, il prossimo appuntamento (297 px entrambi); sotto, personaggio e resoconto in due card, poi i personaggi recenti come card, le campagne e il resto; a destra un pannello compatto delle novità (tre righe per voce, 735 px) che parte all'altezza delle card       | Roll20 (dashboard, «My Games», Announcements), D&D Beyond (home con accesso, «My Characters»), Foundry (pagina d'ingresso con la prossima sessione) |
| **Panoramica** | titolo «Panoramica» con il nome della campagna in piccolo; riquadri a due colonne; il gruppo come nomi con barre; «Esplora il mondo / I tuoi appunti» come bottoni nudi in fondo                                                         | l'intestazione della campagna di Kanka (nome in serif grande, descrizione, etichette; l'immagine della campagna come sfondo sotto un velo; i membri con avatar); il gruppo come card dei personaggi di D&D Beyond (ritratto, nome, classe e livello, «Giocato da…», PF, CA/PP); «Ultime voci» (Kanka «recently modified») con Mondo e Appunti; il materiale rivelato in card | Kanka (widget «Campaign header», elenco delle voci), D&D Beyond (pagina della campagna), Roll20 (avatar dei giocatori)                              |
| **Preferenze** | dialogo di 600 px con un muro di **22 pillole** di categoria sopra i campi, impilati                                                                                                                                                     | dialogo di 1040 px: **elenco verticale delle categorie a sinistra** (26 voci in tre gruppi di ambito, con il numero di impostazioni), impostazioni a destra con nome a sinistra e valore a destra (riquadro ≥ 620 px); la categoria aperta è accesa e segue lo scorrimento; sul telefono l'elenco è una fila di pillole che scorre                                           | BG3 (menu opzioni), Foundry v13 («Game Settings»)                                                                                                   |
| **Biblioteca** | sul telefono le 7–8 schede delle raccolte andavano a capo in **quattro righe**                                                                                                                                                           | una riga sola che scorre di lato, la raccolta aperta portata in vista (anche l'ultima), anello del fuoco interno                                                                                                                                                                                                                                                             | D&D Beyond (schede della scheda) e le altre strisce dell'app                                                                                        |

Immagini (fuori dal repository):
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/pages/`

- `before/` e `after/` × `1440x900-dark`, `1440x900-light`, `390x844-dark`, `390x844-light`: per
  giocatore e DM `home`, `home-full`, `campaign`, `campaign-full`, `prefs`, `prefs-jump`
  (settima categoria aperta), `library`, `library-last` (ultima raccolta aperta); in `after/`
  anche `*-home-art` e `*-campaign-art` (la campagna con un'immagine, vedi sotto).
- `compare/`: prima | dopo affiancati per ogni vista e variante.
- `references/foundry-configure-settings.png` (immagine ufficiale Foundry, fuori dal repo).
- `scripts/`: modello di cattura (`head.js`, `audit-block.js`, `tail.js`, `run-one.sh`), misure
  (`probe-measure.js`), esecutore dei percorsi (`run-journey.sh`) e le copie eseguite.
- `logs/`: JSON di ogni giro (audit in pagina per ogni immagine), misure, suite Node.
- `journeys/<nome>/`: immagini e log dei percorsi rieseguiti.

## Riferimenti studiati (30/09/2026)

| Prodotto           | Fonte                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Che cosa ho preso                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Kanka              | Doc. [Customising a dashboard](https://docs.kanka.io/en/latest/guides/dashboard.html) (widget: Entry List, Entry Preview, Calendar, Random, **Campaign Header** «shows the campaign's name, short description, and dashboard image as a background»); blog 2020 «How to set up your Kanka campaign dashboard» (default dashboard, «recently modified entries»); Oss. `kanka.jpg` del passaggio di sistema (banner con immagine e velo, avatar, titolo) | intestazione della campagna; «Ultime voci»; card del materiale                               |
| Foundry VTT v13    | Doc. [Settings](https://foundryvtt.com/article/settings/) («you can use the sidebar on the left… pick a system or module from the list»); Oss. immagine ufficiale «Configure Game Settings» (20/10/2025): colonna sinistra con ricerca, elenco «Core [33]», «Dungeons & Dragons Fifth Edition [22]»…, righe separate da un filo, «Reset Defaults» in basso a sinistra, impostazioni a destra con nome a sinistra e controllo a destra                  | dialogo delle Preferenze a due colonne, gruppi, conteggi, righe                              |
| BG3                | indicazione dell'owner e critica del 29/09 («il menu opzioni di BG3 usa un elenco verticale»); census CRP-180…184 (categorie delle opzioni: colori, lettura, tasti, unità)                                                                                                                                                                                                                                                                             | elenco verticale delle categorie a sinistra, scelta evidenziata in oro, riga nome/valore     |
| Roll20             | census R20-001 («My Games»: immagine, titolo, Launch, avatar dei giocatori, ultimo gioco), R20-003 (Announcements nella barra destra), R20-049 (prossima sessione nell'ora locale), SVC-025 (icona del gioco)                                                                                                                                                                                                                                          | cruscotto a colonna larga + pannello destro; immagine della campagna nel riquadro «continua» |
| D&D Beyond         | census DDB-002 (home e navigazione), DDB-063 («My Characters»: card con ritratto, nome, livello e classe), DDB-068 (widget dei personaggi recenti), DDB-071/073 (pagina della campagna, personaggi e giocatori), DDB-060 (schede che scorrono sul telefono)                                                                                                                                                                                            | fila dei personaggi, card del gruppo, membri, strisce                                        |
| Foundry VTT (join) | census FVT-002 (pagina d'ingresso con titolo, sfondo, prossima sessione)                                                                                                                                                                                                                                                                                                                                                                               | appuntamento accanto a «continua», immagine del mondo                                        |

Limiti della ricerca, dichiarati: le pagine d'aiuto e il wiki di Roll20 rispondono 403 a questo
strumento (uso le righe del census, prese dalle stesse pagine il 23/09); per D&D Beyond non ho
trovato un'immagine ufficiale della home con accesso né della pagina della campagna (uso il
census e la descrizione dell'owner); per BG3 non ho ottenuto un'immagine ufficiale del menu
opzioni (le pagine consultate — PCGamesN, Kotaku, Can I Play That?, Gamepressure — non la
mostrano): l'elenco verticale viene dall'indicazione dell'owner, la forma concreta (colonna,
conteggi, righe, ripristino in basso a sinistra) dall'immagine ufficiale di Foundry.

Ogni scelta ha la sua riga in [DESIGN.md §4 «Pagine»](../../design/blueprint/DESIGN.md).

## Modifiche

### Inizio (`home.mjs`, `home.css`)

- `home.mjs`: la route avvolge la pagina di `home-ui.mjs` (non riservato, markup invariato) in
  `<div class="home-dashboard">`, che porta come variabile CSS `--home-art` l'immagine del profilo
  della campagna (`campaignSummary(...).image`, solo `data:image/png|jpeg|webp;base64`, lo stesso
  controllo di `campaign-members`). Il blocco «Prossimo appuntamento» ha `order: 11` (prima 30,
  ereditato dal blocco del nucleo): nel documento viene subito dopo «Continua a giocare», così
  lettura, tastiera e vista coincidono.
- `home.css`: da 1101 px `.home-main` diventa `display: contents` e ogni riquadro è una cella di
  una griglia a due colonne (riga 1 riservata a un avviso dell'account, riga 2 continua +
  appuntamento, poi la colonna larga e il pannello delle novità a destra); `row-gap: 0` e margini
  sotto i riquadri, così le righe vuote non aggiungono spazio. «Continua a giocare»: pannello
  sinistro con l'immagine (cover) o, senza immagine, il gradiente della copertina dell'elenco
  Campagne con l'emblema della mappa; sul telefono l'immagine resta come banner 16:7. Personaggio
  e resoconto in due card; personaggi recenti in card da 220 px (fila a scorrimento sul telefono);
  novità compatte (testo a tre righe, intero al passaggio o al fuoco); «Primi passi» ripiegati alti
  40 px (erano 24).

### Panoramica (`party.mjs`, `party.css`, `campaign.mjs`)

- `campaign.mjs`: `campaignOverviewBlocks().heading(commands, { subtitle })` — il cruscotto del
  gruppo chiede il titolo senza sottotitolo (il nome passa nell'intestazione); gli altri usi
  sono invariati.
- `party.mjs`: `billboard()` (intestazione di Kanka: nome, descrizione, etichette, immagine come
  sfondo, membri con l'avatar dell'account, nome e ruolo — il ruolo si omette se coincide con il
  nome); `partyCard()` (card di D&D Beyond: ritratto della scheda dall'area media se esiste,
  altrimenti l'iniziale nella cornice BG3; nome che apre la scheda; classe e livello; «Giocato
  da…»; PF; CA e PP dove il DM li condivide); `tileLinks()` (il riquadro «Collegamenti» elenca le
  cinque voci leggibili cambiate per ultime, escluse le sezioni spente, poi Mondo e Appunti).
  Invariati: `data-party-dashboard`, `data-party-tile`, `data-party-mini`, `data-party-sheet`,
  `data-party-route`, `data-campaign-open`, i riquadri predefiniti e il loro ordine, il titolo
  `h1` «Panoramica» con `data-campaign-heading`, i comandi nell'intestazione (il percorso del
  gruppo clicca «Entra al Tavolo» dentro `.campaign-heading`).
- `party.css`: intestazione, membri, card, «Ultime voci», materiale rivelato in card; testo
  sopra l'immagine nei colori delle etichette della mappa (`--token-label`, `--token-label-halo`,
  che non cambiano con il tema), fondo scuro sotto l'immagine; sul telefono velo uniforme.

### Preferenze (`preferences.mjs`, `preferences.css`)

- `preferences.mjs` (`enhancePreferencesDialog`): l'elenco delle categorie è costruito una volta
  sola come prima (stesse voci, stessi `data-pref-jump`, stesso nome accessibile: il conteggio è
  `aria-hidden`), raggruppato per ambito (le `legend` dei fieldset) e con una voce in più,
  «Lingua e rete», per lingua e rete simulata; va in testa al corpo del dialogo; il resto del
  corpo passa, **senza cambiare nodi né nomi dei campi**, in un riquadro `.pref-pane` che scorre
  da solo. `markJump()` accende la categoria aperta (`aria-current`) mentre il riquadro scorre e
  la tiene in vista nell'elenco (`scrollIntoStrip`); il clic porta il fuoco sul primo controllo
  della categoria come prima.
- `preferences.css`: dialogo largo 1040 px, colonna sinistra 200–248 px (`--surface-2`, filo,
  scorrimento proprio), riga accesa in oro tenue; impostazioni su una riga quando il riquadro
  stesso è largo almeno 620 px (`@container pref-pane`: a 768 px il riquadro è di 482 px e i nomi
  andrebbero schiacciati, quindi restano impilati); gruppi di ambito senza scatola (titolo serif,
  categorie sotto un filo); sul telefono la fila di pillole.

### Biblioteca (`library.mjs`, `library.css`)

- `library.css`: `.library-tabs` in una riga (`flex-wrap: nowrap`, `overflow-x: auto`), schede
  che non si stringono, anello del fuoco interno.
- `library.mjs`: `scrollIntoStrip` sulla raccolta aperta dopo ogni disegno.

## Campagna con un'immagine

Nei dati d'esempio «Le lanterne di Bruma» non ha un'immagine: Inizio e Panoramica mostrano il
ripiego (gradiente della copertina e card piatta), senza illustrazioni inventate. Per vedere il
riquadro con l'immagine, il giro di cattura, come DM, apre Campagne › Gestione › «Modifica nome,
immagine e descrizione…» e carica un PNG ricavato nella pagina dall'illustrazione vettoriale
sintetica del prototipo `handouts-art.mjs` «art-wagon» (percorso reale del profilo, nessun
dato scritto a mano); poi fotografa Inizio e Panoramica come DM e giocatore (`*-art.png`).

## Verifiche

### Giri di immagini (metodo impeccable: costruire, un giro, un lotto, un giro di conferma)

| Giro                      | Che cosa                                                                                                                                                                                                                                                                                                        | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `before`                  | 4 varianti × 12 viste (giocatore e DM), con audit in pagina (scorrimento orizzontale, contrasto WCAG dai colori calcolati, testo tagliato, bersagli < 24 px, elementi oltre il bordo)                                                                                                                           | nessun errore; 1 bersaglio piccolo per vista di Inizio: «Primi passi» ripiegati alti 24 px                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| sonde (`probe1`–`probe3`) | sviluppo: griglia di Inizio, telefono, tema chiaro, immagine della campagna                                                                                                                                                                                                                                     | difetti trovati e corretti durante la costruzione: appuntamento sovrapposto a «Continua a giocare» (specificità della regola di default, ora `:where`), card più alta della sua vicina, titolo della ripresa schiacciato in una colonna di 200 px sul telefono, iniziale del ritratto sopra l'immagine nel tema chiaro (la regola chiara di `.portrait` vinceva: ora l'immagine è in linea con posizione e misura e l'iniziale è trasparente con una specificità più alta), bottoni dell'appuntamento allineati a destra sul telefono, divisore del prossimo appuntamento dentro il riquadro sul telefono, «Resoconto · Resoconto» nelle Ultime voci |
| `after1` (giro 1)         | 4 varianti × 16 viste (le 12 più `home-art` e `campaign-art` per DM e giocatore)                                                                                                                                                                                                                                | nessun errore; difetti: avviso «Profilo della campagna aggiornato» ancora nelle foto con l'immagine; sul telefono il velo orizzontale lasciava il testo sopra la parte chiara dell'immagine; nel tema chiaro l'audit segnalava 1,38:1 sul testo dell'intestazione perché il colore sotto l'immagine era `--canvas` (chiaro): se l'immagine non si carica il testo sarebbe illeggibile; nelle Preferenze del telefono i gruppi restavano in una scatola dentro il riquadro; rilevatore impeccable: triangolo di «Primi passi» disegnato con un bordo spesso (falso «side-tab»)                                                                        |
| lotto unico               | attesa dell'avviso prima delle foto; velo verticale uniforme sul telefono; fondo `--token-label-halo` sotto l'immagine; gruppi senza scatola a ogni larghezza; triangolo con `clip-path`; più una sonda a 768/1024/1180 px che ha mostrato i nomi schiacciati nelle righe a 768 → righe con una container query | —                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `after` (conferma)        | 4 varianti × 16 viste                                                                                                                                                                                                                                                                                           | **64 viste, nessun errore di pagina, nessun passo saltato, nessuno scorrimento orizzontale, nessun testo sotto AA, nessun bersaglio sotto 24 px, nessun testo tagliato, niente oltre il bordo** (l'audit segnala ancora l'iniziale nascosta dietro i ritratti con immagine: colore trasparente di proposito, come nel passaggio di sistema)                                                                                                                                                                                                                                                                                                          |

### Misure (`logs/measure-final.json`, `logs/tablet-2.json`)

- Inizio 1440×900: «Continua a giocare» e prossimo appuntamento in alto a 270 px, alti 297 px
  entrambi (956 e 360 px di larghezza); personaggio/resoconto e pannello delle novità partono
  insieme a 591 px; pannello delle novità 735 px (prima circa 870). Ordine del Tab: «I tuoi
  personaggi», «Entra al Tavolo», «Apri campagna», «Aggiungi al calendario», «Apri sessioni»,
  Livia, «Leggi il resoconto», «Tutte le campagne»: segue la vista.
- Altezza della pagina a 1440 (scuro): Inizio giocatore 2126 → 1904 px, DM 2184 → 1962 px;
  Panoramica giocatore 1371 → 1735 px, DM 1867 → 2231 px (l'intestazione della campagna e le card
  aggiungono altezza: è il contenuto nuovo richiesto).
- Preferenze 1440: dialogo 1040 px, elenco 248 px, riquadro 790 px, 26 categorie in 3 gruppi; il
  Tab dal bottone di chiusura va alla prima categoria («Lingua e rete»); Invio su «Notifiche»
  porta il fuoco sul primo controllo (`notifications.cat-requests`) e accende «Notifiche»; tornando
  in cima al riquadro si riaccende «Lingua e rete». Telefono: una riga di pillole alta 57 px, la
  categoria aperta in vista, dialogo 354 px, nessuno scorrimento orizzontale.
- Biblioteca 390: 7 raccolte in **1** riga (prima 4), striscia alta 48 px, l'ultima raccolta
  aperta è in vista (`scrollLeft` 702), anello del fuoco pieno di 3 px disegnato all'interno.
- Tablet 768, 1024, 1180 px, giocatore e DM: Inizio, Panoramica, Biblioteca e Preferenze senza
  scorrimento orizzontale; riquadro delle Preferenze 482 / 738 / 790 px.

### Test Node

- Nuovo `tests/visual2-pages.test.mjs` (6 test): intestazione della campagna (nome, descrizione,
  etichette, membri; titolo «Panoramica» e comandi nell'intestazione invariati), immagine solo se
  `data:image/…;base64`, card del gruppo con i loro agganci, «Ultime voci» senza le sezioni
  spente, Inizio (appuntamento dopo la ripresa nel documento, immagine sull'involucro), regole CSS
  (striscia della Biblioteca, dialogo a due colonne, container query, griglia di Inizio).
- Moduli toccati: `home`, `help`, `P1-home-first-steps`, `party`, `r7-party`, `preferences`,
  `library-ui` → 98/98 prima del test nuovo.
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: **2574/2574** (il compito
  diceva 2562: +6 di questo passaggio, +6 aggiunti in parallelo da un'altra superficie).

### Percorsi del browser (uno per comando, allarme 200 s)

Eseguiti da copie in `scripts/journeys/` identiche agli originali tranne la cartella delle
immagini (spostata in `journeys/<nome>/`, per non sovrascrivere le prove dei giorni precedenti)
e il `};` finale tolto come chiede il README.

| Percorso                                                                                        | Esito                                                                                                                                                                                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `home-journey`                                                                                  | **passa** (rieseguito anche dopo l'ultima modifica CSS)                                                                                                                                                                                                                                                                                                                                                            |
| `p9-sessions-journey` (elenco delle categorie: «Notifiche»)                                     | passa                                                                                                                                                                                                                                                                                                                                                                                                              |
| `library-journey`, `library-mobile-journey`, `p8-library-journey`                               | passano                                                                                                                                                                                                                                                                                                                                                                                                            |
| `party-journey` (cruscotti per ruolo, ordine dei riquadri, «Entra al Tavolo» nell'intestazione) | passa                                                                                                                                                                                                                                                                                                                                                                                                              |
| `campaign-mobile-journey`, `p4-campaign-journey`                                                | passano                                                                                                                                                                                                                                                                                                                                                                                                            |
| `account-journey`, `campaign-members-journey` («Continua a giocare» e il suo `h2`)              | passano                                                                                                                                                                                                                                                                                                                                                                                                            |
| `preferences-journey`                                                                           | **rosso al passo 6, fuori da questa superficie**: aspetta `.table-inspector .stats .stat` «Movimento» al Tavolo, che il passaggio parallelo «Tavolo» ha tolto dall'ispettore (`table.mjs`, 02:53). I passi 1–5 (ambiti, frecce, tema e testo al 125 %, movimento ridotto, colori) passano                                                                                                                          |
| copia di verifica di `preferences-journey` (solo in `scripts/journeys/`, non nel repository)    | con la lettura del movimento sostituita dall'unità della didascalia della mappa e il passo 13 (attrezzi della mappa, coperti dal nuovo `.table-party` del Tavolo) saltato: **passa** tutto il resto — proposte del DM, ripristino con conferma e annullamento, suoni, modalità solo scheda, telefono EN al 125 % e **150 % testo + 125 % interfaccia senza scorrimento orizzontale su 18 pagine × giocatore e DM** |

### Rilevatore impeccable

`detect.mjs --json` su `home.css`, `party.css`, `preferences.css`, `library.css`, `home.mjs`,
`party.mjs`, `preferences.mjs`, `library.mjs`: 1 risultato durante il lavoro (il triangolo
disegnato con un bordo, falso «side-tab»), **0** dopo il lotto. Modalità ridotta a espressioni
regolari come nei passaggi precedenti.

## Scostamenti e limiti

- **Markup di Inizio**: `home-ui.mjs` non è riservato; la pagina resta il suo markup e la nuova
  disposizione è una griglia CSS in cui `.home-main` è `display: contents`. Il pannello delle
  novità usa gli stessi elementi: il testo è accorciato a tre righe con `line-clamp` (intero al
  passaggio o al fuoco, sempre intero per gli ausili), non riscritto. Nessun modo di mostrare
  meno voci senza toccare `home-ui.mjs` (`NEWS_SHOWN = 3`).
- **Immagine della campagna**: solo quella del profilo (percorso esistente, Roll20 SVC-025);
  nessuna immagine di ripiego inventata. Le foto «art» usano un'illustrazione sintetica del
  prototipo caricata dal percorso reale.
- **«Ultime voci»**: nei dati d'esempio c'è una sola voce leggibile (il resoconto senza titolo,
  senza data): il riquadro è vero ma povero; Missioni, handout e sessioni hanno i loro dati e
  non entrano in questo elenco (servirebbe un indice comune delle modifiche: lavoro di dominio).
- **Riquadri predefiniti del cruscotto**: invariati (i test e `party-journey` ne fissano l'ordine
  esatto); per questo «membri» sta nell'intestazione e le «ultime voci» nel riquadro
  «Collegamenti», invece di due riquadri nuovi di Kanka.
- **Riferimenti non osservati di persona**: BG3 menu opzioni (nessuna immagine ufficiale
  trovata), home di D&D Beyond con accesso e pagina della campagna (nessuna immagine ufficiale),
  pagine di Roll20 (403): righe del census e indicazione dell'owner, dichiarate in DESIGN.md.
- Chromium su macOS soltanto; dimensione della finestra senza emulazione del tocco per le foto
  (il tocco è coperto dai percorsi `home`, `library-mobile`, `campaign-mobile` e dalla copia di
  verifica delle Preferenze); nessun dispositivo reale. Revisione in un solo contesto: va
  ripetuta da un'altra sessione sulla SHA candidata.

## Consegne (fuori da questo passaggio)

1. Superficie «Tavolo»: aggiornare `preferences-journey.js` (passi 6 e 13) all'ispettore e alla
   barra del gruppo nuovi (`.table-inspector` senza la stat «Movimento» in esplorazione; il
   `.table-party` intercetta il puntatore sopra `.map-toolbar`).
2. `home-ui.mjs`: per un pannello delle novità ancora più corto, mostrare 2 voci (`NEWS_SHOWN`)
   o solo titolo e data con «Leggi» (Roll20 Announcements); scelta di contenuto, non di stile.
3. Un indice comune delle modifiche della campagna (voci, missioni, handout, sessioni) darebbe a
   «Ultime voci» il contenuto del widget «recently modified» di Kanka.
