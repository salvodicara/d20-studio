# Blueprint — passaggio visivo: direzione, sistema e componenti di base

29/09/2026 · worktree `codex/interview-01` · un solo scrittore (Claude Code, Opus 5.5) · file
riservati: `design/blueprint/styles.css`, `registry.css`, `ui.mjs` (solo marchio),
`index.html` (solo `theme-color`), `DESIGN.md` (nuovo), questa nota.

Obiettivo (owner, I-236 e 29/09): copiare i prodotti di mercato «a mani basse», con un
riferimento per ogni scelta visiva e il minimo di invenzione. Passaggio **solo visivo**: nessun
comportamento, posizione (registry plan §5), attributo `data-*`, ruolo, etichetta o id cambiato.

Esito: [DESIGN.md](../../design/blueprint/DESIGN.md) con direzione, token (scuro e chiaro),
componenti e la tabella «Elemento → prodotto copiato → come/perché → fonte» (una riga per scelta).

## 1. Ricerca (29/09/2026)

Immagini ufficiali e codice pubblico; campioni di colore presi con ImageMagick sui ritagli.
Ritagli salvati fuori dal repository (materiale protetto, non va nel repo pubblico):
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/system/references/`.

| Prodotto                          | Fonte consultata                                                                                                                                                                   | Estratto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Baldur's Gate 3                   | Steam, immagini ufficiali 1920×1080 (combattimento `ss_f8c7…`, «Select Subclass» `ss_44d3…`); icone ufficiali su bg3.wiki; Extending UI (docs.baldursgate3.game)                   | hotbar quasi nera (`#0C101C`–`#1C171E`) con filo e cornici bronzo (`#90846E`), due righe di slot scuri, gruppi separati da divisori rossi; pagine in pillole bronzo con etichetta serif (Common, Items, Passives, Custom); ritratto tondo a cornice bronzo con PF serif; End Turn tondo teal (anello `#0B97C8`, centro `#07091E`); ordine di turno: card in fila centrata, alleati teal, nemici cremisi (`#7E2342`), di turno cornice chiara, nome e livello serif sotto; risorse: Azione cerchio verde `#348655`, Bonus triangolo `#DC5800`, Reazione stella a quattro punte `#A32799`, Movimento `#D5B255`, slot quadrati ciano `#51D5FE`, patto magenta `#E43EE0`; pannelli scuri a filo bronzo con angoli arrotondati, titolo serif, scelta evidenziata con bordo oro |
| Solasta                           | Steam, immagini ufficiali (creazione `ss_87c2…`, iniziativa `ss_e576…`)                                                                                                            | pannelli grigio-ardesia, etichette sans maiuscole spaziate, nomi in serif maiuscoletto; stat box quadrate con numero grande e modificatore; iniziativa: ritratti alti con bordo teal e PF sotto in teal                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| D&D Beyond                        | articolo «How to Customize Your Character Sheet» (immagini desktop e Underdark mobile); Azmoria/dndbeyonddark (CSS del foglio)                                                     | colore di tema su cornici e controlli (DDB Red di serie, scelta dall'utente); stat box con etichetta condensata maiuscola, modificatore grande, punteggio in ovale; schede ACTIONS/SPELLS… condensate con sottolineatura; filtri ALL pieno nel colore del tema; HEAL verde / DAMAGE rosso contornati; tabella abilità PROF/MOD/SKILL/BONUS; Underdark: cassetto `#11161A`, card `#101519`, righe `#3A4A59`; font Roboto, Roboto Condensed, MrsEaves; intestazione `#28282A`                                                                                                                                                                                                                                                                                               |
| Owlbear Rodeo 2                   | repository ufficiali `owlbear-rodeo/dice` (PluginThemeProvider), `colored-rings` (colors.ts, helpers.ts, style.css, header.jpg), `initiative-tracker` (header.jpg), SDK `Theme.ts` | tema di base: primary `#bb99ff`, secondary `#ee99ff`, background `#1e2231`/paper `#222639`, `borderRadius: 16`, niente ripple, dialoghi schiariti del 7 %; menu contestuale e selettore colori in pannelli fluttuanti arrotondati `#3E404F`; pannello d'iniziativa traslucido sfocato; anello di stato `strokeWidth(5)` in dodici colori; stack sans di sistema; transizioni di 100 ms                                                                                                                                                                                                                                                                                                                                                                                    |
| Foundry VTT v13 (+ sistema dnd5e) | note 13.332; immagine «v13 new UI preview»; immagine «Controls Configuration» (13, 20/10/2025); `foundryvtt/dnd5e` `less/variables/base.less` e `dark.less`                        | Theme V2 chiaro/scuro, elementi sobri che si ritirano; colonna sinistra di attrezzi e colonna destra di schede-icona dense; hotbar di slot quadrati numerati; chip dei tasti a filo arrotondato; bottoni rettangolari a filo; dnd5e: oro `#9f9275`, pergamena `#f1ebe8`, blu-grigi `#242731`…`#434857`, PF `#3ba55d`, temporanei `#007F7F`, pillole a filo, vuoto tratteggiato, barra di scorrimento oro, fallback serif `"Palatino Linotype", serif`                                                                                                                                                                                                                                                                                                                     |
| Roll20 Jumpgate                   | blog «Jumpgate Update: Fog of War and Dynamic Lighting» (immagini DL_Menu, TokenswVision); annuncio della nuova barra (luce e buio)                                                | pannello quasi nero, righe dense con etichetta, info e interruttore a pillola (viola quando attivo), gruppo di bottoni segmentato, campi piccoli a filo; selezione della pedina come riquadro ciano; icone a contorno                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Kanka                             | homepage (immagine devices-preview)                                                                                                                                                | barra laterale scura con testata della campagna, gruppi maiuscoli piccoli con icone, voce aperta come riga piena; pagina di voce con banner, avatar, titolo grande, sotto-navigazione e card a intestazione                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

Per ogni famiglia richiesta la scelta è nella tabella di DESIGN.md §4: palette per ruolo,
gerarchia tipografica, cornici, pannelli e card, bottoni, schede, icone, anelli delle pedine,
hotbar, ritratti di turno, dialoghi, densità.

## 2. Modifiche

- **`styles.css`**: blocco di token (§2 di DESIGN.md) con i valori chiari, del contrasto
  elevato e del movimento ridotto; tutti i colori letterali delle regole sostituiti da token
  (restano solo quelli dentro le definizioni dei token). Restyling dei componenti di base
  (intestazione, navigazione, bottoni, schede e sotto-schede, barre laterali, pannelli, stat
  box, tabelle, stato vuoto, campi, select, spunte, `kbd`, chip, dialoghi, menu, avvisi) e del
  guscio del Tavolo (tela, colonne degli attrezzi, zoom, colonna di schede, ritratti di turno,
  pedine e selezione, ispettore, risorse, hotbar con pagine, slot, PF, slot incantesimo e Fine
  turno). Nuova classe opzionale `.switch`. Le regole strutturali lette dai test (geometria
  della hotbar, blocchi «Phone», `.map-toolbar`, `.map-subtools`, `.table-tabs`, blocco
  «Reconcile (27/09)») sono intatte; nessun nuovo `@media (max-width: 720px)` (i test leggono
  l'ultimo).
- **`registry.css`**: errori contenuti, cassetto, impostazioni, tooltip e avvisi con azioni sui
  token (tooltip come lastra BG3, avviso con filo bronzo).
- **`ui.mjs`**: solo `logo()`: colore del bordo di riserva `#12171d` e serif del «20» dallo stack
  di visualizzazione. Icone invariate (tratto 1,6, come le icone a contorno di Roll20).
- **`index.html`**: `theme-color` `#0f1419` (colore dell'intestazione).
- **Markup presentazionale aggiunto: nessuno.** Le «maiuscole» delle etichette sono
  `font-variant-caps: all-small-caps`: `innerText` e nomi accessibili restano come scritti
  (per esempio `b62-ia-journey.js` confronta `innerText === "Extra"` sulle schede della scheda).
- Specificità dichiarate: `.table-layout .resources > span.available:nth-child(n):before`
  supera la regola a colore unico del tema chiaro di `preferences.css`; `.table-hotbar
.combat-action` riveste gli slot della hotbar sopra `combat.css`.

## 3. Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** (la base, prima
  delle modifiche, era 2558/2558: il conteggio 2543 del compito era più vecchio).
- **Browser** (Chromium, `playwright-cli`, sessione `d20-visual-system`, server
  `127.0.0.1:8879`): per ciascuna delle quattro varianti (1440×900 e 390×844, scuro e chiaro)
  nessun errore di pagina, nessuno scorrimento orizzontale, Tavolo in combattimento senza
  scorrimento verticale a 1440×900 e hotbar di 115 px (come prima; limite 120).
- **Regressione `b62-review-fixes-journey.js`** (copia con cartella d'uscita spostata nella mia
  evidenza, perché l'originale scrive nella cartella del 26/09): tutti e cinque i gruppi
  passano — hotbar raggiungibile e alta 115 px a 1366×768 e 1440×900 per giocatore e DM, menu
  della pedina sul telefono senza piega (IT/EN), attrezzi del DM sotto la barra fissa, fuoco da
  tastiera che resta sulla scelta (outline solido), colonna del DM a 1366×768 nell'ordine di
  Foundry. Nota: l'originale termina con `};` e il CLI lo rifiuta (il README chiede di non
  mettere il punto e virgola finale): nella copia l'ho tolto.
- **Contrasto** (calcolo WCAG sui token): testo 13,2:1, secondario 7,6:1, oro 9,0:1, inchiostro
  su oro 9,6:1, bordi dei controlli 3,5–4,1:1, segnaposto 6,2:1; chiaro: testo 14,9:1,
  secondario 7,2:1, accento 6,9:1, bordi 4,2:1, segnaposto 4,5:1; simboli delle risorse sulla
  hotbar 5,0–10,9:1.
- **Fuoco, bersagli, movimento**: anello di 3 px invariato (4 px in contrasto elevato); nessun
  controllo sotto 40 px introdotto; durate a 0 con movimento ridotto.
- **Rilevatore impeccable** (`detect.mjs --json` su styles.css, registry.css, index.html):
  nessun risultato, ma in modalità ridotta (moduli di parsing assenti): non è un via libera.

## 4. Immagini

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/system/`:

- `before/` e `after/`: `home`, `sheet`, `campaign`, `library`, `preparation`,
  `table-player-exploration`, `table-dm-exploration`, `table-dm-combat`, `table-player-combat`
  × `1440x900`/`390x844` × `dark`/`light` (36 + 36); in `after/` anche `dialog-panels`,
  `toast`, `toast-error` (i due avvisi sono messi nell'elemento `#toast` della pagina solo per
  la foto).
- `compare/`: prima | dopo affiancati per ogni vista e variante.
- `after-{dark,light}-{desktop,phone}.jpg`, `after-components.jpg`, `after-dialogs.jpg`:
  panoramiche.
- `capture-template.js`, `make-captures.sh`, `capture-*.js`: gli script effettivamente eseguiti
  (dati di esempio sintetici; lo stato locale del browser viene azzerato).
- `regression/`: copia del journey B62 con log e immagini.

Il combattimento DM mostra il riquadro dei tiri d'iniziativa aperto dall'avvio (comportamento
esistente, identico prima e dopo).

## 5. Metodo e scostamenti dichiarati

- Skill caricate: impeccable (contesto con `--target design/blueprint/index.html`, playbook
  new-work, craft-floor prima delle modifiche) e frontend-design. Nessun PRODUCT.md alla radice:
  il brief dell'owner ha fissato la direzione («copiare», prodotti nominati), cioè l'uscita
  «canone» del playbook; il sorteggio delle direzioni non è stato eseguito perché la direzione
  era già vincolata dal brief. Nessuno strumento per domande strutturate in questa sessione: le
  risposte sono state dedotte dal brief. Nessuno strumento per sotto-agenti: la revisione finale
  è stata fatta nel thread (due giri di immagini), e va ripetuta da un'altra sessione.
- Craft-floor contro brief: niente font scaricati (il brief lo vieta), quindi serif di sistema;
  il serif compare in etichette della hotbar e in Fine turno solo perché BG3 lo fa.
- Limiti: Chromium su macOS soltanto; nessun dispositivo reale; i font di sistema cambiano per
  sistema (Iowan Old Style su Apple, Palatino Linotype su Windows); il carattere proprietario di
  BG3 e le cornici ornate non sono riprodotti (niente immagini: cornici a filo); Fine turno è a
  pillola, non tondo, per non cambiare la geometria della barra; il maiuscoletto è sintetizzato
  dove il font non lo possiede.

## 6. Consegne (file fuori da questo passaggio)

1. `preferences.css`, tema chiaro: sostituire i colori letterali delle regole per elemento
   (`.app-header`, `.table-inspector`, `.resources .available:before`, `#toast`, `.map-*`…) con
   i token; oggi coincidono quasi del tutto, ma il colore unico delle risorse va tolto.
2. `combat.css`: `.combat-action:hover/.active` usa `#3b3d32` (verde fuori palette): leggere
   `--accent-soft`; poi la regola di rivestimento in `styles.css` può sparire.
3. `conditions-ui.css`: badge della pedina su `--status-*`.
4. Aree con più colori letterali da portare sui token: `fog-vision.css` (51), `token-menu.css`
   (40), `world.css`, `preparation.css`, `session-view.css` (37–38 ciascuno), `annotations.css`,
   `character-builder.css`, `media.css`, `handouts.css`, `chat.css`, `relations-graph.css`.
5. Interruttori delle aree (`cs-switch`, `int-switch`, `dtray-switch`, `offline-switch`,
   `safety-switch`…): adottare `.switch` o i suoi token.
6. `hp-widget`/`damage.css`: nel tema chiaro «Cura» e «Danno» disabilitati hanno testo quasi
   illeggibile (già così prima di questo passaggio).
7. Journey con `};` finale (per esempio `b62-review-fixes-journey.js`): togliere il punto e
   virgola, come chiede il README.

## campaign — Campagna: pannello, membri, impostazioni, dati, sessioni, sicurezza, diario, mondo, relazioni, gruppo, bottino, esplorazione, materiali

29/09/2026 · stesso worktree · un solo scrittore (Claude Code, Opus 5.5) · file riservati
(tutti in `design/blueprint/`): `campaign.css`, `campaign-members.css`, `campaign-settings.css`,
`campaign-data.css`, `sessions-plus.css`, `safety.css`, `journal-plus.css`, `world.css`,
`relations-graph.css`, `party.css`, `loot.css`, `exploration.css`, `handouts.css`; in questa nota
solo questa sezione. Passaggio **solo CSS**: nessun markup (neanche presentazionale),
attributo `data-*`, ruolo, etichetta, id, testo o posizione cambiati.

Riferimenti di superficie: Kanka/World Anvil per campagna e mondo, D&D Beyond per la pagina di
campagna e i numeri, il diario di BG3 per le missioni; per il resto i componenti di base di
[DESIGN.md](../../design/blueprint/DESIGN.md) (§3) e le righe della sua tabella §4. Nessuna
nuova ricerca sul web in questa sessione: ogni riga sotto rimanda a una riga di DESIGN.md §4
(immagini e codice già campionati nel passaggio di sistema) oppure a un riferimento che l'area
citava già nel suo CSS (ricerca delle aree precedenti), segnato «area».

### Elemento → prodotto copiato (area «campaign»)

| Elemento                                                                                                                                                                           | Prodotto copiato                                                    | Come / perché                                                                                                                                                                                     | Fonte                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Pagine di campagna: card, blocchi, righe                                                                                                                                           | Kanka + D&D Beyond                                                  | card piatte `--surface`, filo `--line`, raggio 12; aggiunto il filo dove mancava (`.cm-home`, `.sp-recap`, `.campaign-notice`)                                                                    | DESIGN §4 «Card e pannelli piatti»                                   |
| Titoli di card e nomi (campagne, personaggi del gruppo, voce scelta nel grafo, mercante, data del calendario)                                                                      | BG3 + Solasta + Kanka                                               | serif di visualizzazione `--font-display` (prima sans o Georgia letterale)                                                                                                                        | DESIGN §4 «Titoli serif»                                             |
| Etichette di valori (fatti delle card, proprietà dell'archivio, monete, CA/PP del gruppo, file della marcia, giorni del mini-calendario, gruppi di regole, «Ora» della cronologia) | D&D Beyond                                                          | `--font-label` in maiuscoletto (`all-small-caps`, `--text-md`) al posto di `text-transform: uppercase`: `innerText` e nomi accessibili restano come scritti                                       | DESIGN §4 «Etichette condensate in maiuscoletto»                     |
| Scelta evidenziata (percorsi d'ingresso, scelte di adesione, formati di esportazione, opzioni e preset delle regole, immagine scelta, andatura, pacchetto aperto, giorno scelto)   | BG3 «Select Subclass»                                               | bordo oro su tessera accesa (`--accent` + `--accent-soft`), come la scheda laterale aperta del Tavolo                                                                                             | DESIGN §4 «Scheda laterale aperta»                                   |
| Filtro a segmenti (Attive/Archiviate, Elenco/Grafo)                                                                                                                                | Roll20 Jumpgate + D&D Beyond                                        | gruppo di bottoni in un pozzo `--sunken` con filo `--line-strong`; segmento scelto pieno d'oro con inchiostro scuro (filtro «ALL»)                                                                | ricerca §1 (Roll20: gruppo segmentato); DESIGN §4 «Bottone primario» |
| Sotto-schede Marcia/Viaggio/Campo                                                                                                                                                  | D&D Beyond + Foundry dnd5e                                          | le stesse pillole di `.table-subtab` (maiuscoletto, filo `--line-strong`, aperta piena d'oro)                                                                                                     | DESIGN §4 «Sotto-schede del pannello»                                |
| Chip (etichette, tipi del grafo, linee e veli, livelli di reputazione, merci, lucchetto)                                                                                           | Foundry dnd5e                                                       | pillola del core `.badge`: filo `--line-strong`, fondo `--surface-2`; premuta nel colore del tema; tipo spento resta tratteggiato e barrato                                                       | DESIGN §4 «Chip»                                                     |
| Chip di stato (ruolo, in corso, completata, fallita, sconosciuto, equipaggiato, vantaggio/svantaggio)                                                                              | Foundry dnd5e + D&D Beyond                                          | testo nel colore di significato (`--accent`, `--positive`, `--warning`, `--danger`), filo al 60 % dello stesso colore come il bottone di pericolo                                                 | DESIGN §4 «Chip», «Bottone di pericolo»                              |
| Segreti e note solo DM (blocchi segreti, righe e ricompense segrete, badge «segreto» del mondo, note del DM dei materiali, eventi nascosti)                                        | Roll20 Jumpgate (toni GM) + blocchi segreti di Foundry/LegendKeeper | viola `--vis-dm`, bordo tratteggiato 1 px, tinta 8–10 %, sempre con icona o parole; nascosto ai giocatori `--vis-hidden`; privato `--vis-private`                                                 | DESIGN §4 «Visibilità»; area (commento di `campaign.css`)            |
| Avvisi in linea (promemoria, richieste, «vista come», offerte, banner, avvisi di sessione, note di condivisione, esiti)                                                            | Foundry v13 (notifiche)                                             | fondo tenue del colore di stato con filo dello stesso tono, raggio 6; tolte le barre laterali colorate da 3 px                                                                                    | ricerca §1 (Foundry 13.332); craft floor impeccable                  |
| Menu (Nuova voce, Altro, contestuale, suggerimenti @/[[, Altro dei materiali)                                                                                                      | Owlbear + Foundry                                                   | menu del core: lastra `--raised`, filo `--frame-soft`, `--shadow-2`, righe a tutta larghezza                                                                                                      | DESIGN §3 «Menu, tooltip, avvisi»                                    |
| Barre PF e carico del gruppo, barre di esperienza e viaggio                                                                                                                        | Foundry dnd5e (+ D&D Beyond per la barra PE)                        | `--hp-full/-mid/-low` su `--hp-track`; PE e viaggio in `--accent` sulla stessa traccia                                                                                                            | DESIGN §4 «Barre dei PF»                                             |
| Monete e mini statistiche del gruppo                                                                                                                                               | D&D Beyond + Solasta                                                | stat box del core: filo bronzo, etichetta in maiuscoletto, numero 700 tabulare                                                                                                                    | DESIGN §4 «Stat box»                                                 |
| Avatar e ritratti (membri, formazione di marcia, portatore di un oggetto)                                                                                                          | BG3                                                                 | materiali di `.portrait`: ardesia `--token-ally-fill`, cornice bronzo, iniziale serif                                                                                                             | DESIGN §4 «Ritratto»                                                 |
| Mappa del mondo: legenda e zoom                                                                                                                                                    | Owlbear Rodeo 2                                                     | pannelli fluttuanti traslucidi come `.map-zoom` (blur 10, raggio 14, bottoni raggio 10, `--shadow-2`)                                                                                             | DESIGN §4 «Attrezzi della mappa fluttuanti»                          |
| Nomi, scala e segni sulla mappa del mondo; spilli e titolo della scena senza mappa                                                                                                 | Owlbear + BG3                                                       | colore e alone del nome delle pedine (`--token-label`, `--token-label-halo`), oro delle porte per anelli e misura: la mappa non cambia tema. Corregge i nomi scuri su mappa scura del tema chiaro | DESIGN §4 «Nomi sulle pedine»                                        |
| Piastre sulla mappa (salute dei nemici, danno da applicare, bottino, punti trovati, velo di sicurezza)                                                                             | BG3 (targhette) + piastre delle porte                               | `--door-fill/-rim/-ink` e alone del nome; ferito nell'anello ostile, a terra in grigio                                                                                                            | DESIGN §2 (token delle porte e delle pedine)                         |
| Carta X                                                                                                                                                                            | BG3 (cornice) + Owlbear (dialogo)                                   | forma del dialogo del core (raggio 16, `--shadow-3`), lastra scura fissa in ogni tema costruita da token invarianti (`--status-dying`, alone, etichetta), marchio serif                           | DESIGN §4 «Dialogo»                                                  |
| Carte dei segnali (Stop, Rallenta, Continua, mano alzata) e Stop sulla barra della mappa                                                                                           | D&D Beyond (Heal/Damage) + materiali BG3                            | grandi bottoni `--raised` a filo bronzo; Stop sempre tinto di pericolo, mano alzata in oro; Stop del HUD contornato rosso che si riempie al passaggio                                             | DESIGN §4 «Bottone di pericolo»                                      |
| Interruttori delle impostazioni (`.cs-switch`)                                                                                                                                     | Roll20 Jumpgate                                                     | aspetto del core `.switch` (pillola 40×22, pomello, oro acceso) senza cambiare markup; la riga resta il bersaglio da 44 px                                                                        | DESIGN §4 «Interruttore»                                             |
| Calendario e cronologia del mondo                                                                                                                                                  | Kanka (calendario) + World Anvil (cronologia)                       | celle piatte a filo, oggi in oro, giorno scelto acceso; eventi come chip `--raised`; cronologia su filo bronzo con punti incorniciati                                                             | DESIGN §1 (Kanka/World Anvil per il mondo); area                     |
| Diario delle missioni e indice dell'archivio                                                                                                                                       | diario di BG3 + Kanka + Monk's Enhanced Journal                     | voce aperta come riga piena con testo e filo oro (niente barra laterale); schede del lettore con filo oro in alto sulla scheda aperta                                                             | DESIGN §4 «Barra laterale di campagna»; area                         |
| Mappa di disponibilità                                                                                                                                                             | when2meet / Rallly                                                  | tinte dei token di stato (sì 38 %, forse 34 %, no `--danger-soft`), numeri e parole in ogni cella                                                                                                 | area (CA-43)                                                         |
| Campi in linea (link da copiare, quantità da scaricare, righe della preparazione)                                                                                                  | Foundry v13 + Roll20                                                | campo del core: `--sunken`, filo `--line-strong`, raggio 6, oro al fuoco; il codice d'invito resta nel monospace di sistema (si legge carattere per carattere)                                    | DESIGN §4 «Campi e select»                                           |
| Testo da leggere ad alta voce nei materiali                                                                                                                                        | D&D Beyond (testo in riquadro delle avventure)                      | riquadro `--surface-2` con filo bronzo, corsivo, senza barra laterale                                                                                                                             | area (B15); non ri-verificato in questa sessione                     |

### Modifiche

- **Colori**: 198 righe con colori letterali prima → 58 dopo, tutte dichiarate sotto (arte
  della mappa del mondo, meteo, tavolozza categoriale del grafo). Tutto il resto legge i token.
- **Tipi e misure**: `rem`/`px` dei testi d'interfaccia → scala `--text-*`; Georgia e stack
  sans letterali → `--font-display`/`--font-ui`; raggi → `--radius-*`; ombre →
  `--shadow-*`; transizioni → `--dur-fast`/`--ease-out`. Nessun `text-transform` rimasto.
- **Correzioni visibili**: nomi e scala della mappa del mondo leggibili nel tema chiaro;
  `.loot-warning` usava `--focus` (blu nel tema chiaro) → `--warning`.
- **Specificità dichiarata**: `:root[data-pref-theme="light"] aside.handouts-dm-note` supera la
  tinta ambra che `preferences.css` dà alla nota del DM nel tema chiaro (regola scritta per i
  vecchi colori letterali), così la nota resta viola come gli altri contenuti solo DM.
- **Adattamenti a `preferences.css`** (non riservato): iniziale degli avatar in `--text` e
  monogramma della copertina in `--accent`, perché il tema chiaro dà loro un fondo pergamena.

### Scostamenti dichiarati

- **Arte della mappa** (`world.css`: terre, acque, fiumi, strade, bussola, città) e **meteo**
  sul Tavolo (`exploration.css`: pioggia, neve, nebbia): contenuto illustrato, non interfaccia;
  colori propri in entrambi i temi, come la mappa di battaglia («la mappa non cambia tema»).
- **Tavolozza categoriale del grafo** (`--rg-*` per tipo di voce, scura e chiara): colori di
  dati sempre accompagnati da forma e nome; tavola, linee e controlli vengono dai token. Le
  linee segrete del grafo restano **oro** e non viola, perché il testo del grafo dice
  «tratteggiate dorate» e questo passaggio non cambia testi.
- **Testi SVG sulle mappe** (etichette di spilli, piastre, velo, titolo della scena) restano in
  unità della mappa, fuori dalla scala tipografica; **spaziature** in px come nel core.
- **Etichette dei fieldset**: lasciate in peso 600 (il maiuscoletto sulle legende trasformava i
  nomi delle regole in etichette: provato e tolto).
- **Stati extra** (grafo, calendario, cronologia, pagina d'archivio, inviti e gestione dei
  membri, carta X, schede con gli interruttori): solo «dopo». I file riservati non sono
  tracciati in questo worktree e non avevo una copia del loro stato precedente: il «prima» è
  documentato solo dalle 100 immagini delle viste principali.

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** dopo le modifiche
  (nessun test legge questi file CSS).
- **Prettier**: `--check` pulito sui tredici file.
- **Rilevatore impeccable** (`detect.mjs --json` sui tredici file): nessun risultato.
- **Immagini** (sessione `d20-visual-campaign`, server `127.0.0.1:8879`, dati d'esempio,
  stato locale azzerato): 25 viste × 1440×900 e 390×844 × scuro e chiaro, prima e dopo (200
  immagini, pagine intere per la campagna, prima schermata per i pannelli del Tavolo); in ogni
  variante nessun errore di pagina e nessuno scorrimento orizzontale. Controllo in un solo
  giro, difetti corretti in blocco, un giro di conferma.
- **Percorsi del browser** (copie con la cartella d'uscita spostata nell'evidenza e senza il
  `;` finale, uno per comando, `alarm 200`): `campaign-members`, `campaign-settings`,
  `campaign-data`, `sessions-plus`, `safety`, `quests`, `world-map`, `relations-graph`,
  `party`, `loot`, `travel`, `handouts`, `campaign-mobile`, `p9-journal` → **14/14 passano**,
  compresi bersagli ≥ 40 px, niente scorrimento orizzontale, telefono EN al tocco. Il primo
  tentativo di `campaign-members` si è fermato solo perché i file di prova
  (`not-an-image.txt`, copertina) stavano nella cartella originale del 24/09: copiati (con
  quelli di `world-map`) nella cartella nuova, passa.
- **Contrasto** (WCAG sui token, scuro/chiaro): viola solo DM sul suo riquadro 5,3/6,2:1;
  testo su `--accent-soft` 9,7/12,8:1, secondario 5,6/6,2:1; pericolo sul suo fondo 4,8/5,6:1;
  positivo 6,6/5,2:1; avviso su `--surface-2` 9,0/5,3:1; celle del sondaggio 5,4–8,7:1; carta X
  14,2:1; nomi sulla mappa 15,6:1; monogramma oro sull'ardesia 4,7:1.

### Immagini

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/campaign/`:
`before/` e `after/` (`campaign-{overview,group,sessions,journal,entry,world,archive,relations,
quests,handouts,world-map,loot,safety,rules,members,settings,data,campaigns}`,
`campaign-{overview,safety}-player`, `table-{travel,handouts-panel,loot,safety,party}` ×
`1440x900`/`390x844` × `dark`/`light`); in `after/` anche `extra-*` (grafo, calendario,
cronologia, pagina d'archivio, inviti, gestione, Stop inviato, carta X, impostazioni con
interruttori); `compare/` (prima | dopo); `journeys/` (copie eseguite, log e immagini);
`capture-template.js`, `extras-template.js`, `extras2.js`, `make-captures.sh`, `run-all.sh`,
`make-extras.sh`, `make-compare.sh`: gli script effettivamente eseguiti. Tra le immagini
«prima» (23:07) e «dopo» (23:39) altre sessioni parallele hanno cambiato altri fogli (per
esempio `combat.css`, `token-menu.css`, `preferences.css`): le differenze fuori da queste aree
(barra del Tavolo, menu della pedina, cromie del core) non sono di questo passaggio.

### Consegne

1. `preferences.css`, tema chiaro: le regole per elemento su `.cm-cover`, `.cm-avatar`,
   `.cm-copy input`, `.cm-banner`, `.handouts-dm-note`, `.handouts-outcome`,
   `.handouts-pin-view blockquote`, `.handouts-stage-note`, `.handouts-prep-link select`,
   `.safety-card.is-stop` (e `strong`), `.safety-card.is-hand.is-raised`,
   `.safety-chip-remove:hover`, `.loot-progress` ora duplicano o contraddicono i token: da
   togliere; poi può sparire anche la regola a specificità alta di `handouts.css`.
2. `styles.css`: `.campaign-group-toggle` usa ancora `text-transform: uppercase`, contro la
   regola del maiuscoletto di DESIGN.md.
3. Chip «Solo DM» / «Solo io» del core (per esempio negli aggiornamenti delle missioni):
   potrebbero adottare `--vis-dm` / `--vis-private` come i segreti di queste aree.
4. Grafo delle relazioni: se si vuole il viola solo DM anche per le linee segrete, cambiare
   prima il testo «tratteggiate dorate» (fuori da un passaggio visivo).
5. Journey con `};` finale in queste aree (`campaign-settings`, `campaign-data`,
   `sessions-plus`, `safety`, `quests`, `world-map`, `party`, `loot`, `travel`, `handouts`):
   togliere il punto e virgola, come chiede il README (già consegna 7).

## home-services — «Inizio e servizi» (29/09/2026)

Scrittore unico di questo gruppo: Claude Code (Opus 5.5), worktree `codex/interview-01`, sessione
del browser `d20-visual-home-services`. File riservati, tutti in `design/blueprint/`:
`home.css`, `notifications.css`, `command-palette.css`, `preferences.css`, `account.css`,
`offline.css`, `integrations.css`, `community.css`, `assistant.css`; di questa nota solo la
presente sezione. Passaggio **solo CSS**: nessun markup, attributo `data-*`, ruolo, etichetta,
id, testo visibile o posizione cambiati; nessun markup presentazionale aggiunto; nessun font o
file esterno. Riferimenti di superficie del gruppo: cruscotti di Roll20 e D&D Beyond (Inizio),
palette dei comandi di Foundry (Quick Insert) e Alchemy (Cerca e comandi), impostazioni
dell'account di D&D Beyond (Account), menu delle opzioni di BG3 (Preferenze e accessibilità).

### Esito

- **Token al posto dei letterali.** Nei nove file restano solo tre colori letterali, dichiarati
  come marchi o dati e non come tema: il blurple di Discord (`--int-discord` `#5865f2`) con il
  suo inchiostro bianco nell'anteprima del canale e l'inchiostro scuro degli avatar
  (`--account-avatar-ink` `#17232e`, la stessa coppia che `account-avatar.mjs` scrive in linea
  accanto ai colori scelti dal membro, che non seguono il tema). Le definizioni dei token del tema
  chiaro e del contrasto elevato in `preferences.css` restano letterali perché sono la palette.
  Dimensioni del testo sulla scala `--text-*`, raggi su `--radius-*`, durate su `--dur-*` /
  `--ease-out`, caratteri su `--font-display` / `--font-label` / `--font-ui` (via Georgia letterale
  degli avatar e del conto alla rovescia, via il monospace «di costume» della palette; resta il
  monospace dove il contenuto è codice: comando da copiare, CSV, risposte dell'API).
- **Componenti di base riusati, non reinventati**: schede di sezione (`.home-tabs` con l'aspetto di
  `.tabs button`), sotto-schede a pillola (filtri delle notifiche, categorie delle Preferenze),
  chip (`.badge`: tipi della palette, ambito delle preferenze, strumenti di sicurezza, stato
  dell'assistente), campo (`.field`: ricerca e categoria della palette, righe della scaletta
  dell'assistente, comando da copiare, codice), `kbd` (tasti della palette), interruttore
  (`.switch`: il binario `.offline-switch-track` ne copia misure e colori perché il markup
  dell'area usa uno `span`), avviso con azioni (`.ui-action-toast`: i pop-up delle notifiche),
  dialoghi (cornice e raggio del tour), card piatte a filo (cruscotto).
- **Difetti corretti in blocco**: nel tema chiaro la palette mostrava campo di categoria, elenco
  dei risultati e tasti blu notte illeggibili (colori scuri fissi); lo stato «Da rivedere»
  dell'offline era `#e9b872` su pergamena (contrasto ≈ 1,8:1, ora `--warning` 5,6:1); il widget
  «Trova un tavolo» di Inizio non aveva il filo delle altre card; bordi laterali spessi di 3–4 px
  come accento (suggerimento BG3, pop-up delle notifiche, riga scelta della palette, avviso
  offline delle integrazioni, nota dell'account) sostituiti da filo intero o tinta.
- **Tema chiaro** (`preferences.css`): tolte le regole per elemento che ricoloravano i
  componenti di base con letterali ormai coperti dai token (intestazione, navigazione, attrezzi
  della mappa, ispettore, hotbar, dialoghi, avvisi, campi, segnaposto, selezione, barre di
  scorrimento…), comprese quella che dava a tutti i simboli delle risorse un solo colore (consegna
  1 del sistema) e quelle di Inizio, notifiche e integrazioni ora inutili. Restano, sui token: il
  ritratto di pagina in pergamena con iniziale oro (come il ritratto della scheda di
  `characters.css`, invece del blu delle pedine), gli slot della hotbar di `combat.css` e le
  motivazioni del combattimento, le superfici di altre aree che dipingono ancora colori scuri
  fissi (session-view, chat, menu delle pedine, dispense, compendio, bottino, sicurezza, media,
  membri: letterali sostituiti da `--sunken`, `--hp-track`, `--danger-soft`, miscele di
  `--warning` / `--positive` / `--accent` con `--surface`, `--float-bg`, `--shadow-2`). Tolta la
  regola della cornice chiara di `.character-portrait`: `characters.css` ora usa i token.
- **Regressione trovata e chiusa** (percorso `preferences-journey.js`: «text did not grow to
  125%»): la riscrittura delle lunghezze di B22 moltiplica i px di una proprietà personalizzata
  solo per la scala dell'interfaccia, quindi con i token `--text-*` del sistema la dimensione del
  testo non ingrandiva più nulla. `preferences.css` ridefinisce la scala tipografica con i due
  fattori (`calc(15px * var(--pref-text-scale, 1) * var(--pref-ui-scale, 1))`, stessi valori di
  `styles.css` a 100 %, specificità `:root:root`); da tenere allineata a `styles.css`.

### Elemento → prodotto copiato (home-services)

«Oss.» = osservato su immagine ufficiale (ritagli del sistema, §1 e §4 di DESIGN.md); «Doc.» =
documentazione pubblica letta il 29/09/2026; «Census» = riferimento già registrato dall'area nel
censimento o nei commenti del file; «Core» = componente o riga di DESIGN.md riusati.

| Elemento (file)                                                                                                                                                                                                                      | Prodotto copiato                                                                        | Come / perché                                                                                                                                                                      | Fonte                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Card del cruscotto di Inizio (`.home-card`, `.community-home`, `.home-aside`)                                                                                                                                                        | D&D Beyond + Kanka (card piatte); Roll20 (colonna destra che scorre da sola)            | superficie `--surface`, filo `--line`, raggio 12, nessuna ombra; «Trova un tavolo» prende il filo che gli mancava                                                                  | Core «Card e pannelli piatti»; Census B30 (Roll20 right sidebar)                                                                                                   |
| Primi passi (`.home-start`)                                                                                                                                                                                                          | BG3 pannello con cornice                                                                | l'unica card incorniciata in bronzo (`--frame-soft`), piatta: via la sfumatura teal `#263b42`, fuori palette                                                                       | Oss. BG3 Select Subclass (`bg3-panel-subclass.jpg`)                                                                                                                |
| Le tre strade (`.home-path`)                                                                                                                                                                                                         | BG3 tessere di scelta                                                                   | tessera infossata `--surface-2`, raggio 6; «pronta» con filo verde                                                                                                                 | Oss. BG3 Select Subclass                                                                                                                                           |
| Etichette sopra il testo (`.home-eyebrow`, `.home-pop-kicker`, `.cmdk-group`, `.notifications-toast-category`, `.int-sim strong`, `.int-group-title`, `.offline-kind`, `.offline-version h4`, `.community-kicker`, `.cmdk-guide h3`) | D&D Beyond (Roboto Condensed maiuscolo)                                                 | `--font-label` in `all-small-caps` al posto di `text-transform: uppercase`: `innerText` resta come scritto                                                                         | Core «Etichette condensate in maiuscoletto»                                                                                                                        |
| Etichette dei fatti (`dt` di `.home-facts`, `.account-summary`, `.community-facts`, `.int-stats`)                                                                                                                                    | D&D Beyond (etichetta sopra il numero)                                                  | etichetta condensata in maiuscoletto, valori a cifre tabulari                                                                                                                      | Core «Stat box», «Numeri tabulari»                                                                                                                                 |
| Schede della colonna di Inizio (`.home-tabs [role=tab]`)                                                                                                                                                                             | D&D Beyond schede di sezione                                                            | stesso aspetto di `.tabs button` (condensate, oro con sottolineatura); la classe core non si può usare perché il markup è `role=tab`                                               | Core «Schede di sezione»                                                                                                                                           |
| Contatori (`.home-count`, `.notifications-filter-count`)                                                                                                                                                                             | D&D Beyond (conteggio nel colore del tema) + pillole dnd5e                              | pillola piena d'oro con inchiostro scuro, cifre tabulari                                                                                                                           | Core «Chip», «Bottone primario»                                                                                                                                    |
| «Nuova», «Simulazione» (`.home-badge-new`, `.assistant-sim-badge`)                                                                                                                                                                   | D&D Beyond colore del tema                                                              | chip core con filo `--accent-line` e tinta `--accent-soft`                                                                                                                         | Oss. DDB sheet (colore del tema sui controlli attivi)                                                                                                              |
| Barra dei PE (`.home-xpbar`)                                                                                                                                                                                                         | D&D Beyond (barra dei PE nell'intestazione della scheda con avanzamento a PE)           | linea sottile oro su traccia `--hp-track`, a pillola                                                                                                                               | Conoscenza del prodotto, non ricampionata in questa sessione                                                                                                       |
| Conto alla rovescia (`.home-appointment-when`)                                                                                                                                                                                       | BG3 + Solasta titoli serif; D&D Beyond colore del tema                                  | serif `--font-display` (era Georgia letterale), oro, cifre tabulari                                                                                                                | Core «Titoli serif»                                                                                                                                                |
| Personaggi recenti (`.home-chip`)                                                                                                                                                                                                    | Foundry v13 (forma) + BG3 (materia): il bottone core                                    | tessera raggio 6 a filo bronzo, oro al passaggio                                                                                                                                   | Core «Bottone normale»                                                                                                                                             |
| Suggerimento alla prima occorrenza (`.home-pop`)                                                                                                                                                                                     | BG3 tutorial (CRP-001)                                                                  | lastra `--surface` in cornice `--frame` 1 px, raggio 12, `--shadow-2` (fluttua); via il bordo sinistro di 4 px                                                                     | Census CRP-001; Core «Tooltip», «Ombre»                                                                                                                            |
| Tour guidato (`.home-tour`, `.home-tour-ring`)                                                                                                                                                                                       | Foundry Tours; dialogo core (BG3 + Owlbear)                                             | anello nel colore del fuoco, il resto sotto il velo `--scrim`; card con cornice e raggio 16 dei dialoghi                                                                           | Census B30 («Foundry tour»); Core «Dialoghi»                                                                                                                       |
| Filtri del centro notifiche (`.notifications-filter`)                                                                                                                                                                                | D&D Beyond filtri + pillole dnd5e                                                       | la sotto-scheda core: pillola, scelta piena d'oro                                                                                                                                  | Core «Sotto-schede»                                                                                                                                                |
| Righe delle notifiche (`.notifications-open`)                                                                                                                                                                                        | Foundry / Owlbear righe di menu                                                         | riga intera raggio 6, `--raised` al passaggio                                                                                                                                      | Core «Righe di menu»                                                                                                                                               |
| Pop-up delle notifiche (`.notifications-toast`)                                                                                                                                                                                      | avviso con azioni core (BG3 + Owlbear)                                                  | lastra `--raised`, filo bronzo, raggio 12, `--shadow-2`; categoria in maiuscoletto oro                                                                                             | Core «Menu, tooltip, avvisi con azioni»                                                                                                                            |
| Offline / annulla / richieste nel centro (`.notifications-offline`, `-undo`, `-pending`)                                                                                                                                             | avviso di salvataggio core; piede dei dialoghi                                          | tinte `--danger-soft` / `--positive-soft`, piastra `--surface-2`, raggio 6                                                                                                         | Core «Avvisi», «Dialoghi»                                                                                                                                          |
| Campo e risultati della palette (`.cmdk-field input`, `.cmdk-filter select`, `.cmdk-list`)                                                                                                                                           | Foundry Quick Insert (un campo, miglior risultato in cima) + campo core                 | pozzo `--sunken`, filo `--line-strong`, oro al fuoco; elenco in `--surface-2`                                                                                                      | Doc. [Quick Insert](https://foundryvtt.com/packages/quick-insert); Core «Campi»                                                                                    |
| Riga scelta della palette (`.cmdk-option[aria-selected]`)                                                                                                                                                                            | BG3 opzione scelta                                                                      | tessera accesa `--accent-soft` dentro un filo oro pieno; via la striscia sinistra                                                                                                  | Oss. BG3 Select Subclass                                                                                                                                           |
| Chip di tipo della palette (`.cmdk-type`)                                                                                                                                                                                            | pillole dnd5e; BG3 blu degli incantesimi                                                | chip core; incantesimi in `--info` (il ciano `--res-slot` non raggiunge 4,5:1 sul chiaro), sempre con la parola                                                                    | Core «Chip»; Oss. bg3.wiki Spell_Slot_Icon                                                                                                                         |
| Tasti (`.cmdk-kbd`)                                                                                                                                                                                                                  | Foundry v13 Controls Configuration                                                      | uguali a `kbd` core; via il monospace                                                                                                                                              | Core «Tasti»                                                                                                                                                       |
| Tipo della creazione rapida (`.cmdk-kind`)                                                                                                                                                                                           | Kanka quick create (Census) + BG3 opzione scelta                                        | rettangolo raggio 6 a filo, scelto con filo e tinta oro                                                                                                                            | Census B23; Oss. BG3 Select Subclass                                                                                                                               |
| Categorie delle Preferenze (`.pref-jump .button`)                                                                                                                                                                                    | BG3 Options (sei categorie: Gameplay, Keybinds, Video, Audio, Interface, Accessibility) | striscia di categorie in testa come BG3, disegnata con la sotto-scheda core a pillola                                                                                              | Doc. [bg3.wiki Options](https://bg3.wiki/wiki/Options); Core «Sotto-schede»                                                                                        |
| Ambito dell'impostazione (`.pref-scope`)                                                                                                                                                                                             | pillole dnd5e                                                                           | chip core, forma e parola dentro (mai colore da solo)                                                                                                                              | Core «Chip»                                                                                                                                                        |
| Avvisi nel colore del tema (`.pref-proposals`, `.pref-help`, `.pref-sheet-only`, `.account-banner`, `.community-callout/-preview`, `.community-offline`, `.assistant-consent-banner`, `.int-offline`)                                | D&D Beyond colore del tema su cornici                                                   | filo `--accent-line` e tinta `--accent-soft`; variante di pericolo in `--danger-soft`                                                                                              | Oss. DDB sheet                                                                                                                                                     |
| Zona di pericolo (`.account-danger`, `.account-banner.is-danger`, `.assistant-restricted`, badge offline «bloccato/perso», stato «Senza rete»)                                                                                       | D&D Beyond «Damage» rosso contornato                                                    | bordo `color-mix(--danger 60 %)`, come `.button.danger`                                                                                                                            | Core «Bottone di pericolo»                                                                                                                                         |
| Avatar (`.account-avatar`)                                                                                                                                                                                                           | BG3 ritratto della hotbar                                                               | cornice `--frame` 2 px con filo scuro interno, iniziale serif (come `.portrait`)                                                                                                   | Core «Ritratto»                                                                                                                                                    |
| Avatar in uso (`.account-avatar-item.is-active`)                                                                                                                                                                                     | BG3 opzione scelta                                                                      | filo oro su tessera `--accent-soft`                                                                                                                                                | Oss. BG3 Select Subclass                                                                                                                                           |
| Interruttore offline (`.offline-switch-track`)                                                                                                                                                                                       | Roll20 Jumpgate                                                                         | misure e colori del `.switch` core: pillola 40×22, pomello 12, oro acceso                                                                                                          | Core «Interruttore»                                                                                                                                                |
| Stati della connessione (`--offline-warn` → `--warning`)                                                                                                                                                                             | semantica core                                                                          | verde in linea, rosso senza rete, oro in riconnessione, ambra da rivedere, anche nel chiaro                                                                                        | Core «Colori per ruolo»                                                                                                                                            |
| Simulazioni e parti mascherate (`.int-sim`, `.community-sim`, `.offline-simulation`, `.assistant-masked`)                                                                                                                            | Foundry dnd5e slot vuoto                                                                | contorno tratteggiato `--line-strong`                                                                                                                                              | Core «Stato vuoto tratteggiato»                                                                                                                                    |
| Moduli delle integrazioni (`.int-module`, `.int-group-title`)                                                                                                                                                                        | Foundry Manage Modules; Kanka gruppi di moduli                                          | una spunta per riga, gruppi in maiuscoletto                                                                                                                                        | Census B55; Core «Barre laterali» (gruppi Kanka)                                                                                                                   |
| Anteprima del canale Discord (`.int-channel`, `.int-app`, `.int-msg-*`)                                                                                                                                                              | Discord (messaggio, tag APP, barra a sinistra degli embed)                              | pozzo `--sunken` del tema invece di `#1d2127` fuori palette; blurple e barra degli embed restano: sono il disegno di Discord (eccezione dichiarata alla regola sui bordi laterali) | Doc. [discord.js embeds](https://discordjs.guide/legacy/popular-topics/embeds) (il colore dell'embed è il bordo sinistro)                                          |
| Comandi e codice (`.int-command input`, `pre` delle integrazioni, `.home-report-preview`, `.assistant-preview`)                                                                                                                      | campo core (Foundry v13)                                                                | pozzo `--sunken`, raggio 6; monospace solo dove il contenuto è codice                                                                                                              | Core «Campi»                                                                                                                                                       |
| Elenco dei tavoli pubblici (`.community-card`, `.community-filters`)                                                                                                                                                                 | Roll20 Looking for Group                                                                | filtri a sinistra (lingua, giorno, orario, nuovi giocatori, 18+), righe a filo, posti in grassetto a cifre tabulari, titolo sottolineato che diventa oro                           | Doc. [Roll20 LFG](https://help.roll20.net/hc/en-us/articles/360037774473-Using-Our-Looking-for-Group-Tool), [wiki](https://wiki.roll20.net/Looking_For_Group_Tool) |
| Strumenti di sicurezza e avvisi di contenuto (`.community-chips li`)                                                                                                                                                                 | pillole dnd5e                                                                           | chip core a filo                                                                                                                                                                   | Core «Chip»                                                                                                                                                        |
| Citazioni dell'assistente (`.assistant-cite`)                                                                                                                                                                                        | D&D Beyond collegamenti nel colore del tema                                             | numero oro in grassetto a cifre tabulari, tinta oro al passaggio (bersaglio 40 px invariato)                                                                                       | Core: collegamenti `a` in `--accent` (`styles.css`)                                                                                                                |
| Stato dell'assistente (`.assistant-status`)                                                                                                                                                                                          | pillole dnd5e                                                                           | chip core; acceso con filo e tinta positivi                                                                                                                                        | Core «Chip»                                                                                                                                                        |
| Dimensione del testo (`--text-*` in `preferences.css`)                                                                                                                                                                               | BG3 text size, Foundry font size (Census SVC-170, FVT-189)                              | la scala tipografica segue anche la dimensione del testo, non solo la scala dell'interfaccia                                                                                       | Census B22                                                                                                                                                         |

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** prima e dopo (il 2543
  del compito era vecchio). Il test «every dark surface of the area has a light-theme
  counterpart» di `integrations.test.mjs` resta verde: le superfici leggono i token.
- **Percorsi dell'area** (copie in `journeys/` con cartella d'uscita spostata nell'evidenza e `};`
  finale tolto; fixture di B29 copiate accanto): `home`, `notifications`, `command-palette`,
  `preferences`, `account`, `offline`, `integrations`, `community`, `assistant` → tutti passano,
  nessun errore di pagina. `preferences` falliva sulla dimensione del testo prima della
  correzione descritta sopra; `account` falliva solo per le fixture rimaste nella cartella del
  24/09.
- **Contrasto misurato sulla pagina** (testo contro fondo composto, `scripts/contrast-*.js`,
  38 elementi ripassati presenti nell'esempio; personaggi recenti e messaggi del canale non ci
  sono in uno stato appena azzerato, e il percorso delle integrazioni misura i messaggi ≥ 4,5:1 nel
  chiaro): minimo 6,0:1 nello scuro e 5,0:1 nel chiaro (il conteggio dentro il filtro scelto);
  nessun valore sotto 4,5. A 390 px: nessuno scorrimento orizzontale; schede di Inizio e
  filtri delle notifiche ≥ 40 px.
- **Rilevatore impeccable** (`detect.mjs --json` sui nove file): restano solo le due barre degli
  embed di Discord, eccezione dichiarata; la nota dell'account è passata a un filo di 1 px.
- **Immagini**: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/home-services/`:
  `before/`, `after/`, `compare/` (prima | dopo) con 41 viste × 1440×900 e 390×844 × scuro e
  chiaro (Inizio con Novità/Guide/Supporto, aiuto, suggerimento, tour, centro notifiche con
  preferenze, stato offline e pop-up, palette con comandi, guida, editor dei tasti e creazione
  rapida, Preferenze in tre punti, account in quattro schede e menu, offline in linea e senza
  rete, tavoli pubblici con annuncio, candidature e pagina pubblica, reclutamento, integrazioni in
  cinque schede, assistente spento, attivazione, consenso e risposta, accesso e prova senza
  account); `scripts/` con i modelli di cattura e di contrasto effettivamente eseguiti;
  `journeys/` con log e immagini dei percorsi. Il pop-up delle notifiche è messo nella pagina
  solo per la foto, con il markup di `notifications.mjs`.

### Scostamenti e limiti

- Skill: impeccable (contesto con `--target design/blueprint/home.css`, playbook polish,
  craft-floor prima delle modifiche). Direzione già fissata dal brief e da DESIGN.md: nessuna
  nuova direzione, nessun nuovo token in `styles.css` (non è di questo gruppo).
- Le etichette «eyebrow» esistenti (Primi passi, Suggerimento, Annuncio pubblico) restano: sono
  testo del markup; sono disegnate come le etichette di D&D Beyond.
- Barra dei PE di D&D Beyond: riferimento dalla conoscenza del prodotto, non ricampionato qui.
  Il menu delle opzioni di BG3 è citato dalla documentazione di bg3.wiki (categorie), non da
  un'immagine.
- Chromium su macOS soltanto; font di sistema (il maiuscoletto è sintetizzato dove il font non
  lo possiede).

### Consegne (fuori da questo gruppo)

1. `styles.css` (sistema): la scala `--text-*` è ripetuta in `preferences.css` con il fattore del
   testo; se cambiano i valori in `styles.css`, cambiarli anche lì (oppure far leggere a B22 un
   solo punto). La regola a specificità alzata per i simboli delle risorse non serve più: il
   colore unico del tema chiaro è stato tolto.
2. `session-view.css`, `chat.css`, `token-menu.css`, `handouts.css`, `compendium.css`,
   `loot.css`, `safety.css`, `media.css`, `campaign-members.css`: quando passano ai token, le
   loro righe nel blocco «light theme: areas» di `preferences.css` possono sparire.
3. `combat.css`: con `.combat-action:hover/.active` su `--accent-soft` (consegna 2 del sistema)
   sparisce anche la regola chiara corrispondente in `preferences.css`.

## table — Tavolo: combattimento, tracker, menu pedina, dadi, danni, barra rapida, mosse, annotazioni, nebbia, conoscenza, regioni, sessione, chat

29/09/2026 · stesso worktree · un solo scrittore (Claude Code, Opus 5.5) · file riservati in `design/blueprint/`:
`combat.css`, `combat-tracker.css`, `token-menu.css`, `dice.css`, `dice-3d.css`, `damage.css`,
`quickbar.css`, `special-moves.css`, `annotations.css`, `fog-vision.css`, `knowledge.css`,
`regions.css`, `session-view.css`, `chat.css`; di questa nota solo questa sezione.

Passaggio **solo CSS**: nessun comportamento, posizione, markup, attributo `data-*`, ruolo,
etichetta, id o testo visibile cambiato; **nessun markup presentazionale aggiunto**. Le regole
strutturali lette dai test (`combat.css` altezza del palco in combattimento, `special-moves.css`
`.combat-bar:has(.sm-tray)` e `.combat-dock .sm-dock-toggle`, `token-menu.css`
`.token-menu.sheet` con `max-height: calc(100dvh - 24px - env(...))`) sono intatte.

### Esito (area «table»)

- **Colori letterali da 369 a 28**, tutti gli altri su token di DESIGN.md §2. Restano, dichiarati
  sotto: la palette degli effetti incantesimo sulla mappa (`dtray-fx-*`, 25 valori, già
  proprietà locali per tipo di danno) e i tre campioni della legenda del righello a due livelli
  (`special-moves.css`, specchio dei colori che `special-moves.mjs` disegna sulla mappa).
- **Font letterali eliminati**: Georgia → `--font-display`, lo stack `-apple-system…` →
  `--font-ui`, le etichette → `--font-label`; il monospazio di formule, regole e tasti → sans
  con cifre tabulari (i tasti ereditano il `kbd` di base). Resta lo stack «Papyrus, Luminari» del
  testo in lingua sconosciuta (effetto di contenuto). Taglie su `--text-*`, raggi su
  `--radius-*`, ombre su `--shadow-*`, durate su `--dur-*`/`--ease-out`.
- **Palette della mappa invariata tra i temi** (`--map-*`, 14 valori, in testa a `combat.css`,
  che `index.html` carica sempre): la mappa resta scura anche nel tema chiaro, quindi le
  sovrapposizioni delle aree (anelli, badge, maniglie, etichette, nebbia, barriere, regioni,
  fumetti) non possono leggere token d'interfaccia che nel chiaro diventano scuri. I valori sono
  quelli che le aree usavano già, raccolti in un solo posto; da promuovere in `styles.css`
  (Consegne). Pedine e porte continuano a usare `--token-*` e `--door-*`.
- **Componenti di base riusati senza toccare il markup**: bottoni delle aree nella materia di
  `.button` (fondo `--raised`, filo `--frame-soft`, raggio 6, 600); bottoni sopra la mappa come
  `.map-tool` (senza bordo, raggio 10, attivo oro tenue); barre degli attrezzi sopra la mappa
  come `.map-toolbar` (traslucide, blur 10, raggio 14, `--shadow-2`); menu fluttuanti come i
  menu di base (`--raised`, filo bronzo, raggio 12, `--shadow-2`); campi come il pozzo di base
  (`--sunken`, `--line-strong`, raggio 6); chip come `.badge` (pillola, `--line-strong`);
  schede di sezione come `.tabs` (maiuscoletto condensato, attiva in oro con sottolineatura);
  interruttore dell'Ispirazione come `.switch`.
- **Nessuna striscia laterale colorata**: le barre `border-left`/`border-top` da 3–4 px (esito,
  avvisi, carte dei tiri, richieste, eventi delle regioni, narrazione, citazioni, turno corrente,
  gruppi divisi, vassoio delle Mosse)
  diventano cornici intere col colore dello stato su fondo tenue (craft floor di impeccable).
- **Tema chiaro, difetti chiusi dal passaggio**: blocchi «Conoscenza e furtività» scuri e
  illeggibili → pergamena; «Giorno» premuto nel pannello Visione illeggibile → oro leggibile;
  «Cura» e «Danno» disabilitati quasi illeggibili → verde e rosso leggibili (consegna 6 del
  sistema, 6.6); schermata di prova BG3 (`dice3d`): fondo sempre scuro con testo nei token del tema (dedotto dal
  CSS, non fotografato prima) → velo nei colori del tema.

### Elemento → prodotto copiato (area «table»)

Fonte: «DESIGN §4 …» = la riga del sistema, con immagine o codice campionati nel passaggio di
sistema; «area» = riferimento già citato nel CSS o nel modulo dell'area (ricerca delle aree
precedenti); «noto» = conoscenza del prodotto **non riverificata in questa sessione** (nessuna
ricerca web qui): da confermare in revisione.

| Elemento                                             | Prodotto copiato                            | Come / perché                                                                                                                                          | Fonte                                                                        |
| ---------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Palette della mappa invariata (`--map-*`)            | Foundry v13                                 | il tema chiaro/scuro riguarda l'interfaccia, non la tela: le sovrapposizioni sulla mappa tengono i loro colori                                         | DESIGN §4 «Tema scuro primario» (Foundry 13.332, temi); tela invariata: noto |
| Segni di costo negli slot e nei filtri               | BG3                                         | cerchio verde, triangolo arancio, stella magenta a quattro punte (prima un rombo viola), con i token `--res-*` delle risorse della hotbar              | DESIGN §4 «Simboli delle risorse di turno»                                   |
| Filtri di costo, scelto pieno d'oro                  | D&D Beyond                                  | filtri ALL/ACTION/BONUS: quello scelto è pieno nel colore del tema, in un gruppo segmentato scuro                                                      | DESIGN §4 «Sotto-schede del pannello»                                        |
| Etichetta del gruppo nello slot («ARMI», «COMUNI»)   | D&D Beyond                                  | etichetta condensata in maiuscolo sul bordo dello slot                                                                                                 | DESIGN §4 «Etichette condensate in maiuscoletto»                             |
| Icone degli effetti attivi                           | Visual Active Effects + BG3                 | pozzo tondo scuro in un filo bronzo, come le icone delle condizioni sotto i ritratti BG3                                                               | area (TV-85); BG3: noto                                                      |
| Esito, trattenuta dell'Ispirazione, note, avvisi     | D&D Beyond + Kanka (card piatte)            | riquadro intero a filo con fondo tenue nel colore dello stato, non una striscia laterale (craft floor)                                                 | DESIGN §4 «Card e pannelli piatti»                                           |
| Striscia d'interruzione (reazioni)                   | BG3                                         | lastra con filo oro in alto che chiede prima di proseguire il turno                                                                                    | noto                                                                         |
| Tracker: riga di chi agisce                          | Foundry v13 + BG3                           | riga attiva evidenziata (Foundry) con doppia cornice oro, bordo e filo interno, come il ritratto di chi agisce                                         | DESIGN §4 «Ritratti di turno» (CRP-090); Foundry: area                       |
| Tracker: ritratti                                    | Owlbear colored rings                       | colori e anelli delle pedine della mappa, iniziale serif: riga e pedina si riconoscono                                                                 | DESIGN §4 «Anelli delle pedine»                                              |
| Tracker: iniziativa                                  | D&D Beyond                                  | numero in un riquadro scuro a filo bronzo, cifre tabulari                                                                                              | DESIGN §4 «Stat box», «Numeri tabulari»                                      |
| Avviso «Tocca a te»                                  | Monk's Combat Details + BG3                 | avviso già esistente; cornice oro e parole in serif                                                                                                    | area (Monk's); DESIGN §4 «Titoli serif»                                      |
| Menu della pedina                                    | Owlbear Rodeo + BG3                         | lastra fluttuante arrotondata con righe a tutta larghezza, nella materia BG3 (`--raised`, filo bronzo); nome serif; ritratto con l'anello della pedina | DESIGN §4 «Righe di menu», «Tooltip»                                         |
| Selezione multipla, riquadro di selezione            | Roll20 Jumpgate                             | ciano per il gruppo selezionato e per il riquadro trascinato (la selezione singola resta l'anello oro di sistema)                                      | DESIGN §4 «Cerchio di selezione» (riquadro ciano Roll20)                     |
| Dadi: sezioni Tira / Richieste / Impostazioni        | D&D Beyond                                  | schede di sezione di base (maiuscoletto condensato, attiva oro sottolineata)                                                                           | DESIGN §4 «Schede di sezione»                                                |
| Dadi: Normale / Vantaggio / Svantaggio               | D&D Beyond                                  | pillole dei filtri, la scelta piena d'oro                                                                                                              | DESIGN §4 «Sotto-schede del pannello»                                        |
| Dadi: tasti d4…d20, numeri da tirare                 | D&D Beyond                                  | tasti nella materia del bottone di base; numeri in riquadri a filo bronzo col valore in oro                                                            | DESIGN §4 «Bottone normale», «Stat box»                                      |
| Carta del risultato e richieste                      | Foundry (carta di tiro) + dnd5e (richiesta) | carta a filo intero, totale grande in serif con cifre tabulari; esito sul colore del filo                                                              | area (Shard VTL-157, dnd5e request); DESIGN §4 «Titoli serif»                |
| Schermata di prova (dice3d)                          | BG3                                         | vignetta nei colori del tema, titolo e CD serif in una targa a filo oro, SUCCESSO/FALLIMENTO in capitali spaziate                                      | area (CRP-131)                                                               |
| Riepilogo dei tiri (dice3d)                          | D&D Beyond / Dice So Nice                   | risultato nella lastra fluttuante di base sopra i dadi                                                                                                 | area                                                                         |
| Punti ferita: Cura / Danno                           | D&D Beyond                                  | HEAL verde e DAMAGE rosso contornati attorno a un solo importo; parole leggibili anche disabilitate                                                    | DESIGN §4 «Bottone di pericolo» (Heal/Damage)                                |
| Barra dei PF e temporanei                            | Foundry dnd5e                               | `--hp-full`, `--hp-temp`, `--hp-track` dei token di sistema                                                                                            | DESIGN §4 «Barre dei PF»                                                     |
| Difese (resistenza, immunità, vulnerabilità)         | Foundry dnd5e                               | pillole a filo (FVT-139); il colore per tipo (freddo, oro, rosso) è scelta nostra sui token di ruolo                                                   | area (FVT-139); DESIGN §4 «Chip»                                             |
| Carta dei danni da applicare                         | Foundry dnd5e                               | carta della chat a filo bronzo, righe dei bersagli dentro                                                                                              | DESIGN §4 «Card e pannelli piatti»; dnd5e: noto                              |
| Barra rapida: slot                                   | BG3 + Roll20                                | pozzi scuri a raggio piccolo (BG3); il colore scelto dal giocatore sul filo superiore, come i bottoni colorati della barra delle macro di Roll20       | DESIGN §4 «Slot delle azioni»; Roll20: noto                                  |
| Barra rapida: nome della pagina                      | BG3                                         | pillola a filo bronzo con etichetta serif, come le pagine della hotbar                                                                                 | DESIGN §4 «Pagine della hotbar»                                              |
| Vassoio delle Mosse                                  | BG3                                         | pannello a comparsa sopra la hotbar, filo bronzo; ogni mossa è uno slot scuro, scelta accesa d'oro                                                     | DESIGN §4 «Slot delle azioni»; area                                          |
| Opzioni degli attrezzi sulla mappa (disegno, nebbia) | Owlbear Rodeo 2                             | la stessa lastra traslucida e arrotondata della colonna degli attrezzi                                                                                 | DESIGN §4 «Attrezzi della mappa fluttuanti», «Traslucenza»                   |
| Nebbia                                               | Owlbear Rodeo + Foundry                     | nera per i giocatori, semitrasparente per il DM                                                                                                        | noto                                                                         |
| Barriere                                             | Foundry v13                                 | un colore e un tratteggio per tipo di muro (codifica esistente), riportati sulla palette della mappa                                                   | noto                                                                         |
| Regioni sulla mappa                                  | Foundry v13                                 | regioni di scena come forme a fondo tinto con bordo pieno, un colore per tipo                                                                          | noto                                                                         |
| Conoscenza: misuratore                               | BG3                                         | quadrati come gli slot incantesimo, nell'oro del tema                                                                                                  | DESIGN §4 «Slot incantesimo»                                                 |
| Conoscenza: «Solo il DM»                             | Roll20 Jumpgate (via sistema)               | viola «solo DM» di `--vis-dm`, sempre con la parola                                                                                                    | DESIGN §4 «Visibilità»                                                       |
| Esamina                                              | BG3                                         | sezioni a carta piatta, nome serif, livelli bloccati tratteggiati                                                                                      | area (CRP-144, CRP-145)                                                      |
| Controlli di sessione sulla mappa                    | Owlbear Rodeo 2                             | bottoni e avvisi fluttuanti traslucidi, stato sul filo                                                                                                 | DESIGN §4 «Attrezzi della mappa fluttuanti»                                  |
| Indicatore di pausa                                  | Foundry                                     | targa semitrasparente al centro (esistente), ora con blur e serif                                                                                      | area                                                                         |
| Orologi di progresso                                 | Foundry (Progress Clocks)                   | spicchi riempiti d'oro su pozzo scuro                                                                                                                  | noto                                                                         |
| Chat: pannello e messaggi                            | Foundry v13                                 | scheda chat sulla superficie della barra laterale, messaggi come carte scure a filo; compositore agganciato sotto                                      | area (scheda chat Foundry, B61); DESIGN §4 «Colonna destra»                  |
| Chat: carta del tiro                                 | Foundry                                     | totale in riquadro con cifre serif oro, formula tabulare                                                                                               | area (TV-87/TV-97)                                                           |
| Chat: narrazione                                     | Roll20 (/desc)                              | lastra a filo oro, corsivo serif, con l'etichetta                                                                                                      | noto                                                                         |
| Chat: sussurri                                       | Foundry                                     | tinta dei sussurri a filo bronzo, destinatario su una riga                                                                                             | noto                                                                         |
| Fumetti sulla mappa                                  | Foundry                                     | fumetto chiaro con parole scure, uguale nei due temi                                                                                                   | area                                                                         |
| Lingua sconosciuta                                   | Foundry Polyglot                            | carattere di scrittura «Papyrus», mantenuto                                                                                                            | noto                                                                         |
| Avvisi a registro chiuso                             | D&D Beyond                                  | notifica del tiro come lastra fluttuante a filo oro                                                                                                    | area                                                                         |

### Verifiche (area «table»)

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** dopo le modifiche e dopo le
  correzioni del giro di difetti (la base dichiarata dal passaggio di sistema era 2558/2558; il
  2543 del compito era più vecchio).
- **Prettier** sui 14 file: tutti conformi.
- **Contrasto** (WCAG, calcolato sui token) delle coppie nuove: dado scartato 6,5:1 scuro /
  5,8:1 chiaro (prima 3,7:1 in una bozza, corretto); chip della selezione multipla 9,3 / 4,9;
  chip «nascosto» 5,6 / 5,1; badge «Solo il DM» 6,0; inchiostro sulla mappa 13,8; parole di
  Cura/Danno sul loro fondo tenue nel chiaro circa 5,3 / 5,6. Nessun controllo sotto 40 px
  introdotto; anelli del fuoco dei controlli a 3 px nel colore `--focus` (alcuni in annotazioni, nebbia e
  chat erano a 2 px o in oro).
- **Immagini** (Chromium, `playwright-cli`, sessione `d20-visual-table`, server
  `127.0.0.1:8879`, dati di esempio sintetici, stato locale azzerato): 30 viste × 4 varianti
  (1440×900 e 390×844, scuro e chiaro) prima e dopo = 120 + 120; in tutte le esecuzioni
  nessun errore di pagina, nessuno scorrimento orizzontale, nessun passo saltato (dopo una
  correzione dello script sul telefono, rieseguita anche per il «prima»).
- **Un giro di difetti, poi uno di conferma** (tutte le 120 immagini «dopo» rifatte sul CSS
  finale): titolo «Registro e chat» andato a capo per la serif più larga → corpo 15 px (la
  prima correzione, con ellissi, lo troncava a 1440: rifatta e misurata con
  `check-chat-head.js`, una riga non tagliata a 1440 e 390, scuro e chiaro); segni di costo nei
  filtri troppo piccoli → 12 px; dado scartato poco leggibile → `--muted` su `--raised`.
- **Percorsi delle aree** (copie in `journeys/` con la cartella d'uscita spostata nella mia
  evidenza e senza `;` finale, come chiede il README; uno per comando, `alarm 200`):
  tutti e 14 passano senza errori — `combat`, `combat-tracker`, `token-menu`, `dice-tray`,
  `dice-3d` (schermata di prova BG3 inclusa), `damage-tray` (vassoio in modalità assistita,
  registro PF, telefono), `quickbar`, `special-moves`, `annotations`, `fog-vision`, `knowledge`,
  `regions`, `session-view`, `chat`. In più la regressione `b62-review-fixes-journey.js` (copia
  del passaggio di sistema): hotbar raggiungibile e alta **115 px** a 1366×768 e 1440×900 per
  giocatore e DM, menu della pedina sul telefono (IT/EN) senza righe sotto la piega, attrezzi
  del DM sotto la barra fissa, fuoco da tastiera che resta sulla scelta.
- **Rilevatore impeccable** (`detect.mjs --json` sui 14 file): cinque avvisi, tutti falsi
  positivi o voluti — quattro sono i bordi trasparenti che disegnano il triangolo del bonus
  (`combat.css`), uno è il filo colorato di 3 px in cima al campione di colore della barra
  rapida (lo stesso segno dello slot, Roll20).

### Immagini (area «table»)

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/table/`:

- `before/`, `after/`: `session-view-hud`, `session-view-panel`, `annotations-panel`,
  `annotations-tool`, `fog-vision-panel`, `fog-vision-tool`, `token-menu`,
  `token-menu-submenu`, `token-menu-bestiary`, `dice-tray`, `combat-tracker-idle`,
  `special-moves-rules`, `damage-hp`, `knowledge-panel`, `knowledge-exam`, `regions-tool`,
  `regions-prep`, `combat-start-dialog`, `dice-3d-summary`, `combat-tracker-combat`,
  `chat-log`, `hotbar-actions`, `special-moves-tray`, `quickbar`, `combat-preview`,
  `combat-target`, `combat-attempt`, `damage-tray`, `dice-3d-roll`, `chat-roll-card` ×
  `1440x900`/`390x844` × `dark`/`light`.
- `compare/`: prima | dopo affiancati (metà scala) per ogni vista e variante; `crops/`: i
  ritagli usati per l'ispezione (hotbar, tracker, barre laterali, attrezzi sulla mappa,
  telefono).
- `capture-template.js`, `make-captures.sh`, `run-all.sh`, `rerun-phone-b.sh`,
  `make-compare.sh`, `confirm-round.sh`, `check-chat-head.js`, `capture-*.js`: gli script
  eseguiti; `journeys/`: copie dei percorsi, `run-journeys.sh`, log e immagini.

### Metodo e scostamenti dichiarati (area «table»)

- Skill: impeccable (`context.mjs --target design/blueprint/quickbar.css`, reference polish e
  craft-floor prima delle modifiche) e playwright-cli. Direzione già fissata da DESIGN.md e dal
  brief («copiare»): nessun sorteggio di direzioni.
- **Nuovi token nel file sbagliato di proposito**: `--map-*` stanno in `combat.css` perché
  `styles.css` non è di questo passaggio; vanno spostati (Consegne, 1).
- **Taglie letterali rimaste per geometria**: 9 px dell'etichetta del gruppo nello slot, 10 px
  del numero e dei passi negli slot della barra rapida (condividono un pozzo di 44 px), 11–17 px
  dei testi SVG sulla mappa (scala della mappa, non dell'interfaccia), 16 px del campo PF del
  menu (sotto i 16 px un telefono ingrandisce la pagina al fuoco), 34/40/56 px dei numeri
  grandi di dadi, CD e timer; raggi 10 e 14 px come `.map-tool` e `.map-toolbar` di sistema,
  che non hanno token.
- **Colori letterali rimasti**: effetti incantesimo `dtray-fx-*` (palette per tipo di danno, già
  proprietà locali, sulla mappa) e i tre campioni della legenda del righello (devono coincidere
  con i colori scritti in `special-moves.mjs`).
- **Scelte nostre dichiarate**: colori per tipo di difesa; tinta oro (`--accent-soft`) della
  riga attiva del tracker; bottone rosso «Avvia sessione» (valore esistente dell'area, ora sui
  token di pericolo, senza un prodotto di riferimento).
- Limiti: Chromium su macOS soltanto; nessun dispositivo reale; nelle 240 immagini mancano la
  schermata di prova BG3 del tiro con CD e il vassoio dei danni da approvare (servono stati che
  i dati di esempio non producono da soli; la vista `damage-tray` mostra la scheda Creatura
  dopo l'attacco applicato subito): li mostrano, solo «dopo», le immagini dei percorsi in
  `journeys/` (per esempio `damage-tray-journey/`).

### Consegne (area «table»; file fuori da questo passaggio)

1. `styles.css` `:root` e DESIGN.md §2: promuovere `--map-*` (14 valori) accanto a `--token-*` e
   `--door-*`, e toglierli da `combat.css`.
2. `styles.css`: `.selection-ring` usa `--accent-strong`, che nel tema chiaro è marrone scuro su
   una mappa che resta scura; `--map-gold-bright` lo terrebbe visibile.
3. `styles.css`: `.table-hotbar .combat-action:hover/.active` ora ripete ciò che `combat.css` fa
   già con i token (consegna 2 del sistema chiusa da questa parte): la regola di rivestimento
   può sparire.
4. `preferences.css`: le regole del tema chiaro per `.session-view-*`, `.chat-*`,
   `.token-menu*`, `.dice3d-*`, `.combat-action:hover/.active` e `.combat-reasons` sono ormai
   ridondanti (i token fanno lo stesso): da togliere o portare sui token.
5. JS con colori scritti nel markup (non visivo, quindi non in questo passaggio):
   `special-moves.mjs` (righello a due livelli, anelli di lancio), `path-ui.mjs` (percorso
   bloccato), `preparation.mjs`/`scene-assets-prep.mjs` (terreno e pedine d'anteprima),
   `chat.mjs` (pedina del ritaglio di mappa): leggere `--map-*`/`--token-*` via classi.

## characters — Personaggi: scheda, creazione, magie, inventario, forme, condizioni, riposi, progetti

29/09/2026 · stesso worktree · un solo scrittore (Claude Code, Opus 5.5) · file riservati in
`design/blueprint/`: `characters.css`, `character-builder.css`, `builder-plus.css`,
`sheet-plus.css`, `spells-plus.css`, `inventory-plus.css`, `character-library.css`,
`forms-ui.css`, `conditions-ui.css`, `projects.css`, `rest-ui.css`; di questa nota solo questa
sezione. Passaggio **solo CSS**: nessun comportamento, posizione nel piano del registro, markup
(neanche presentazionale), attributo `data-*`, ruolo, etichetta, id o testo cambiato. Le
etichette «in maiuscolo» sono `font-variant-caps: all-small-caps`; dove l'area aveva già
`text-transform: uppercase` è rimasto (l'`innerText` letto dai percorsi non cambia). Le regole
lette dai test (`.character-tab-content`, `.shp-generic`, `.shp-note-head`, blocco `560px` di
`.invp-cols`/`.invp-col`) sono intatte.

Riferimenti di superficie: **D&D Beyond** per la scheda (riquadri, numeri, filtri, etichette,
rarità), **BG3** per icone delle condizioni, risorse, slot, ritratti, tooltip e scelte; per il
resto i componenti di base di [DESIGN.md](../../design/blueprint/DESIGN.md) §3 e le righe della
sua tabella §4. Ricerca nuova di questa sessione (fuori dal repository, materiale protetto):
ritaglio dell'icona di stato di BG3 dall'immagine ufficiale già campionata dal sistema
(`bg3-hotbar.jpg` → `visual/characters/references/bg3-status-tile.png`: tessera quadrata, fondo
`#3B3023`, filo `#816A4E`, glifo pergamena); bg3.wiki «Conditions» (le condizioni attive stanno
accanto al ritratto; nessuna descrizione grafica); forum D&D Beyond «Green, blue, purple, etc
magic items» (rarità: comune nero/bianco in Underdark, non comune verde, rara blu, molto rara
viola, leggendaria arancio).

### Elemento → prodotto copiato (area «characters»)

| Elemento                                                                                                                               | Prodotto copiato                                               | Come / perché                                                                                                                                                                                | Fonte                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Ritratto della scheda e delle card della libreria (`.character-portrait`, `.clib-portrait`), ritratto senza immagine (`.bp-letter`)    | BG3 (ritratto della hotbar) = `.portrait` di base              | cornice bronzo 2 px `--frame`, filo scuro interno, iniziale serif; ad arco come i ritratti del Tavolo, tondo nel Percorso rapido come il ritratto BG3                                        | DESIGN §4 «Ritratto»                                                                  |
| Riquadri vitali (PF, CA, Movimento, Risorse del turno)                                                                                 | D&D Beyond (riga di box in cima alla scheda)                   | ogni box alto quanto il suo contenuto (prima CA e Movimento si allungavano quanto il box PF); sul telefono il box PF prende la riga intera, come la scheda DDB mobile                        | Oss. `ddb-sheet-desktop.jpg`, `ddb-underdark-mobile.jpg`                              |
| Barra dei PF nella scheda                                                                                                              | Foundry dnd5e                                                  | `--hp-full` (verde `#3ba55d`) invece del verde salvia letterale                                                                                                                              | DESIGN §4 «Barre dei PF»                                                              |
| Risorse del turno nella scheda                                                                                                         | BG3                                                            | Azione verde, Bonus arancio, Reazione magenta (`--res-*`) sul glifo ●/○ che la scheda scrive: lo stato resta nel testo, il colore dice quale risorsa                                         | DESIGN §4 «Simboli delle risorse»                                                     |
| Riquadri delle caratteristiche (`.shp-ability-box`, sola lettura `.clib-abilities`)                                                    | D&D Beyond                                                     | nome condensato in maiuscoletto in alto, modificatore grande 700, punteggio in un ovale sotto; filo bronzo (il «colore del tema» DDB è il nostro bronzo/oro)                                 | Oss. `ddb-sheet-desktop.jpg` (STRENGTH −1 / 9)                                        |
| Pillole CA, Iniziativa, Competenza, Percezione passiva, Velocità, Difese (`.shp-pill`)                                                 | D&D Beyond (box Proficiency Bonus, Walking Speed)              | etichetta in maiuscoletto sopra il numero, pozzo `--surface-2`, filo bronzo                                                                                                                  | Oss. `ddb-sheet-desktop.jpg`                                                          |
| Tiri salvezza e abilità: bonus e competenza (`.shp-value`, `.shp-prof`)                                                                | D&D Beyond (colonne PROF/MOD/SKILL/BONUS)                      | bonus in un box a filo bronzo; anello vuoto, pieno se competente, doppio per maestria                                                                                                        | Oss. `ddb-sheet-desktop.jpg`                                                          |
| Etichette dei blocchi (Tiri salvezza, Sensi, Abilità, Personalità, Organizzazioni/Alleati… delle Note, Effetti/Preferiti)              | D&D Beyond                                                     | maiuscoletto condensato (SAVING THROWS, SENSES, SKILLS)                                                                                                                                      | Oss. `ddb-sheet-desktop.jpg`                                                          |
| Gruppi delle azioni (Azione, Azione bonus, Reazione) e livelli delle magie (Trucchetti, Livello 1)                                     | D&D Beyond                                                     | titolo in maiuscoletto nel colore del tema sopra un filo bronzo (ACTIONS · Attacks per Action; CANTRIP)                                                                                      | Oss. `ddb-sheet-desktop.jpg`                                                          |
| Filtri di azioni, magie, inventario e note; sotto-sezioni della scheda (`.character-subtabs`)                                          | D&D Beyond («ALL» pieno) + pillole di Foundry dnd5e            | maiuscoletto condensato in pillola; il filtro scelto pieno d'oro con inchiostro scuro, come `.table-subtab` di base                                                                          | DESIGN §4 «Sotto-schede del pannello»                                                 |
| Costo d'azione nelle righe (Azione, Azione bonus, Reazione)                                                                            | BG3                                                            | il simbolo BG3 prima della parola (cerchio verde, triangolo arancio, stella magenta, come la hotbar), bordo del chip nello stesso colore                                                     | DESIGN §4 «Simboli delle risorse»; `bg3-resource-icons.png`                           |
| Slot incantesimo nella scheda                                                                                                          | BG3                                                            | quadrati ciano `--res-slot`, Magia del Patto magenta `--res-pact`; le cariche degli oggetti restano cerchi oro                                                                               | DESIGN §4 «Slot incantesimo»                                                          |
| Intestazioni di Magie, Inventario, Tempo libero, Registro, statistiche del Percorso rapido                                             | D&D Beyond (MODIFIER / SPELL ATTACK / SAVE DC; WEIGHT CARRIED) | stat box di base: filo bronzo, etichetta in maiuscoletto, numero 700 a cifre tabulari; i valori di una riga allineati in fondo anche se un'etichetta va a capo                               | DESIGN §4 «Stat box»                                                                  |
| Rarità degli oggetti                                                                                                                   | D&D Beyond                                                     | non comune `#1FC219`, rara `#4990E2`, molto rara `#9810E0`, leggendaria `#FEA227`; nel tema scuro la molto rara schiarita a `#b77cf0` (2,8:1 → 5,8:1); nel chiaro le altre scurite (≥ 4,5:1) | tonalità: forum DDB; esadecimali: valori diffusi del foglio DDB, non ricampionati qui |
| Icona dell'oggetto nell'inventario                                                                                                     | BG3 (casella dell'inventario e della hotbar)                   | pozzo scuro quadrato con filo bronzo, icona oro                                                                                                                                              | Oss. `bg3-hotbar.jpg`                                                                 |
| Avvisi della scheda (finestra di preparazione, notifiche, errori del builder, eccezioni, avvisi del Percorso rapido, riposi, progetti) | Foundry v13 (notifiche)                                        | lastra tinta con filo nel colore dello stato; tolte le barre laterali colorate da 3–4 px                                                                                                     | come l'area «campaign», riga «Avvisi in linea»                                        |
| Tooltip delle statistiche e tooltip fissato                                                                                            | BG3                                                            | lastra `--raised`, filo bronzo, raggio 6, `--shadow-2`, titolo serif, come `.ui-tip`                                                                                                         | DESIGN §4 «Tooltip»                                                                   |
| Interruttori degli effetti (Benedizione, Anatema)                                                                                      | Roll20 Jumpgate (`.switch`)                                    | pista a pillola con pomello, oro quando attivo; stesse misure del markup esistente                                                                                                           | DESIGN §4 «Interruttore»                                                              |
| Gioco / Modifica                                                                                                                       | Roll20 Jumpgate (gruppo segmentato)                            | segmento premuto pieno d'oro, bordo `--line-strong`                                                                                                                                          | come l'area «campaign», «Filtro a segmenti»                                           |
| Preferiti della scheda                                                                                                                 | BG3 (slot della hotbar)                                        | bottone doppio in pozzo scuro con filo bronzo                                                                                                                                                | DESIGN §4 «Slot delle azioni»                                                         |
| Condizioni attive (chip nella scheda e nell'ispettore) e catalogo delle 15 condizioni                                                  | BG3 (icone di stato)                                           | tessera a spigoli quasi vivi (raggio 4), lastra scura calda (bronzo sul pozzo), filo bronzo, etichetta pergamena 600                                                                         | Oss. ritaglio `bg3-status-tile.png`                                                   |
| Indebolimento 1–6                                                                                                                      | D&D Beyond (livelli) + Roll20 Jumpgate (segmenti)              | segmenti in pozzo; i livelli raggiunti pieni d'ambra `--warning` con inchiostro `--accent-ink` (leggibile in entrambi i temi)                                                                | DESIGN §4 «Filtro a segmenti», token di stato                                         |
| Badge della pedina e nome della condizione sulla mappa                                                                                 | BG3 + Owlbear (area)                                           | colori `--status-*`, inchiostro e alone della mappa (`--token-label`, `--token-label-halo`), uguali nei due temi; il nome sale sopra la maniglia di rotazione                                | DESIGN §2 «Stati di gioco»                                                            |
| Sezione aperta del builder, passo corrente del Percorso rapido, filtri del selettore, opzione scelta nei dialoghi                      | BG3 («Select Subclass») + D&D Beyond (passi numerati)          | bordo oro su tessera accesa (`--accent-soft`), nome della sezione in oro                                                                                                                     | DESIGN §4 «Scheda laterale aperta»                                                    |
| Nomi di classi, background, specie, personaggi pronti, card della libreria, doni e progetti, creatura nel pannello condizioni          | BG3 + Solasta                                                  | serif di visualizzazione 400                                                                                                                                                                 | DESIGN §4 «Titoli serif»                                                              |
| Presenza nella bozza condivisa                                                                                                         | Figma (contorno multiplayer) + Roll20 (viola GM)               | anello di 2 px nel colore di chi scrive: giocatore `--vis-private`, DM `--vis-dm`; il nome resta accanto al punto                                                                            | uso del prodotto (Figma); DESIGN §4 «Visibilità»                                      |
| Card della libreria                                                                                                                    | D&D Beyond («My Characters»)                                   | ritratto, nome, riga di livello; comandi sotto un filo                                                                                                                                       | conoscenza del prodotto, non ricampionato                                             |
| Anteprima di stampa                                                                                                                    | Foundry dnd5e chiaro                                           | i valori del tema pergamena (DESIGN §2, colonna «Chiaro») fissi, qualunque sia il tema dello schermo: è il foglio stampato                                                                   | DESIGN §2                                                                             |
| Scheda sopra la mappa                                                                                                                  | Foundry (finestra della scheda) + BG3 (cornice)                | intestazione `--header-bg` con filo bronzo, nome serif, `--shadow-3` dei dialoghi                                                                                                            | DESIGN §4 «Dialogo: cornice»                                                          |
| Riposi in corso, completamento e scelte dopo il lungo                                                                                  | BG3 (pannello a filo bronzo)                                   | filo `--frame` su `--surface-2` invece del filo oro pieno                                                                                                                                    | DESIGN §4 «Dialogo: cornice»                                                          |
| Sezione aperta e forma scelta del pannello Forme                                                                                       | `.button.active` di base + BG3 (scelta)                        | bordo e testo oro, tessera accesa (prima `--gold`, token inesistente: nessun colore)                                                                                                         | DESIGN §3 «Bottoni»                                                                   |

### Modifiche

- **Colori letterali da 156 righe a 29**, tutte dichiarate: la palette delle rarità
  (`inventory-plus.css`, 8 valori più il commento con gli originali DDB) e la carta della
  stampa (`character-library.css`, valori del tema chiaro più `#fff`/`#111` del blocco
  `@media print`). Spariti i ripieghi dei token inesistenti (`--border`, `--surface-raised`,
  `--success`, `--gold`) che lasciavano verde salvia, blu notte o nessun colore.
- **Tipi e misure**: 93 `font-size` sulla scala `--text-*` (stessi valori; `preferences.css`
  moltiplica ora quei token anche per la dimensione del testo — verificato: h1 38 → 57 px al
  150 %); Georgia e stack sans letterali → `--font-display`/`--font-ui`/`--font-label`; raggi →
  `--radius-*`; ombre → `--shadow-*`/`--keyline-dark`; transizioni → `--dur-*`/`--ease-out`.
- **Difetti corretti**: nel tema chiaro i box dei bonus di tiri salvezza e abilità, le proprietà
  delle armi, i preferiti, i riquadri delle caratteristiche e i badge «Azione bonus» erano scuri
  con testo scuro (illeggibili); la sezione aperta del builder era verde scuro con testo scuro;
  sul telefono l'etichetta «Cosciente» e la riga dell'Indebolimento uscivano dal box PF a metà
  larghezza; CA e Movimento si allungavano fino all'altezza del box PF; sulla mappa il nome della
  condizione della pedina scelta era tagliato dalla maniglia di rotazione (`translateY` −8 → −26,
  verificato: 3 px di margine); la sezione aperta di Forme non aveva colore (`--gold`); le abilità
  stellate («Preferite in alto») finivano `position: fixed` in basso a destra sopra la pagina,
  perché la loro lista porta la stessa classe `.shp-pinned` del tooltip fissato: le regole del
  tooltip ora valgono solo per il suo `aside` (la lista torna in cima alla colonna Abilità, il
  tooltip resta fluttuante).
- **Nessuna nuova regola `@media (max-width: 720px)`**; aggiunte solo due righe nel blocco
  `620px` già esistente di `characters.css`.

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** dopo le modifiche.
- **Percorsi delle aree** (copie con la sola cartella d'uscita spostata in
  `visual/characters/journeys/out/`, `};` finale tolto dove c'era), uno per comando, tutti senza
  errori: `sheet-plus`, `spells-plus`, `inventory-plus`, `builder`, `builder-plus`,
  `character-library`, `forms`, `conditions`, `conditions-badges` (due volte, prima e dopo lo
  spostamento del nome), `rest-shared`, `projects`, `b62-ia` (schede della scheda lette per
  `innerText`), più `preferences` (150 % testo + 125 % interfaccia su 18 pagine × giocatore e DM
  senza scorrimento orizzontale); `sheet-plus` ripetuto dopo la correzione delle abilità
  stellate. Tooltip fissato provato a mano: resta `fixed` in basso a destra con la cornice BG3.
- **Browser** (Chromium, `playwright-cli`, sessione `d20-visual-characters`): 32 viste × 1440×900
  e 390×844 × scuro e chiaro, prima e dopo, senza errori di pagina né scorrimento orizzontale.
- **Contrasto** (WCAG sui token, sul fondo reale): rarità scuro 5,2–8,5:1, chiaro 4,5–5,4:1;
  chip delle condizioni 12,7:1 (scuro) e 12,2:1 (chiaro), catalogo 13,4:1 / 12,9:1 (nome
  inglese 7,8:1 / 6,3:1); Indebolimento pieno 9,1:1 / 5,7:1; «Solo io» 7,6:1 / 6,0:1; emblema e
  passi completati (inchiostro `--bg` su `--positive`) 9,9:1 / 5,6:1; titoli d'oro dei gruppi
  9,0:1.
- **Rilevatore impeccable** (`detect.mjs --json` sugli 11 file): nessun risultato (in modalità
  ridotta, come per il sistema: non è un via libera).

### Immagini

Cartella `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/characters/`:

- `before/`, `after/`, `compare/` (prima | dopo): `library`, `sheet-top`, `sheet-bar`,
  `sheet-vitals`, `sheet-top-condition`, `sheet-actions(-list)`, `sheet-spells(-list)`,
  `sheet-inventory(-list)`, `sheet-features`, `sheet-gifts`, `sheet-story`, `sheet-notes`,
  `sheet-log`, `sheet-revisions`, `sheet-extras-forms`, `sheet-projects`, `sheet-recipes`,
  `dialog-conditions(-catalog, -add, -active)`, `dialog-rest`, `dialog-forms`,
  `builder-identity`, `builder-abilities`, `builder-quick`, `builder-premade`,
  `table-token-condition`, `table-sheet-overlay` × `1440x900`/`390x844` × `dark`/`light`
  (128 + 128 + 128).
- `after-{dark,light}-{desktop,phone}.jpg`: panoramiche; `references/bg3-status-tile.png`.
- `scripts/`: `capture-template.js`, `make-captures.sh` e i file generati; il «prima» è servito
  dalle copie originali in `css-before/` tramite una route del contesto del browser (il service
  worker dell'app scarica i fogli di stile), verificato identico al pixel alla prima cattura.
- `defects/`: i difetti corretti visti da vicino (abilità stellate prima/dopo, tooltip fissato
  dopo, nome della condizione sulla pedina prima/dopo, box PF con la condizione nei due temi).
- `journeys/` (copie eseguite, uscite in `journeys/out/`), `logs/` (suite e percorsi).

### Scostamenti dichiarati

- Le risorse del turno nella scheda tengono il glifo ●/○ colorato invece delle forme BG3: la
  forma sostituirebbe il testo che porta lo stato (disponibile/spesa), e il CSS non lo sa
  leggere senza dipendere dall'etichetta tradotta.
- Rarità «molto rara» schiarita nel tema scuro e le altre scurite nel chiaro rispetto a DDB
  (leggibilità); gli esadecimali DDB non sono stati ricampionati dal loro CSS in questa sessione.
- Il nome della condizione sulla mappa sale di 18 unità (−8 → −26) per non essere tagliato dalla
  maniglia di rotazione del menu pedina: è un aggiustamento visivo dentro la pedina, non un
  cambio di posizione di una funzione.
- Il box PF a tutta riga sul telefono e i box vitali alti quanto il contenuto cambiano la
  disposizione dentro la riga dei riquadri (stesso ordine, stessa pagina).
- La presenza nella bozza condivisa copia Figma, prodotto fuori dall'elenco dell'owner, perché
  nessuno dei riferimenti nominati ha una modifica condivisa di un campo.

### Consegne (area «characters»; file fuori da questo passaggio)

1. `preferences.css`: `:root[data-pref-theme="light"] .character-portrait` usa `#e6dcc6`/`#b9ab8e`
   letterali e copre il filo `--frame` del ritratto nel tema chiaro: leggere `--raised`/`--frame`.
2. `damage.css` (widget PF nella scheda): «Cura»/«Danno» disabilitati illeggibili nel tema chiaro
   (già consegna 6 del sistema; visibile in `sheet-top-*-light`).
3. `token-menu`: la maniglia di rotazione della pedina scelta cade sopra le etichette che stanno
   sopra la pedina; se ne arrivano altre, valutare di spostare la maniglia invece delle etichette.
4. `sheet-plus.mjs` `pinTip`: `document.querySelector(".shp-pinned")?.remove()` toglie il primo
   `.shp-pinned` della pagina, che può essere la lista delle abilità stellate invece del tooltip
   precedente (fino al rendering successivo): cercare `aside.shp-pinned`, o dare al tooltip una
   classe sua (il CSS è già limitato all'`aside`).

## prep-library — Preparazione e Biblioteca

29/09/2026 · worktree `codex/interview-01` · un solo scrittore (Claude Code, Opus 5.5) · file
riservati (sotto `design/blueprint/`): `preparation.css`, `encounter-builder.css`,
`generators.css`, `scene-assets.css`, `tables-decks.css`, `library.css`, `compendium.css`,
`homebrew-editor.css`, `adventures.css`, `media.css`; in questa nota solo questa sezione.
Passaggio **solo CSS**: nessun comportamento, posizione, attributo `data-*`, ruolo, etichetta,
id o testo cambiato; **markup presentazionale aggiunto: nessuno**. Riferimenti di superficie:
configurazione della scena e compendio di Foundry (dnd5e), costruttore di incontri ed elenchi di
D&D Beyond, attrezzi della scena di Owlbear Rodeo.

### Ricerca aggiuntiva (29/09/2026)

Materiale fuori dal repository (protetto o di terzi):
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/prep-library/references/`.

| Prodotto                                                                  | Fonte consultata                                                                                                                                                                                                                                           | Estratto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D&D Beyond Encounter Builder                                              | articolo «Tutorial: How to Build Encounters and Run Them on D&D Beyond» (dndbeyond.com/posts/1135), immagini `encounter-difficulty.jpg`, `encounter-summary.jpg`, `adding-monster-to-encounter.jpg`, `list-of-saved-encounters.jpg`, `monster-summary.jpg` | barra della difficoltà a parallelogramma; campioni (ImageMagick) Easy `#CCD9E2`, Medium `#FE9E0B`, Hard `#F04A00`, Deadly `#E23D4B` con alone, binario `#666D7F`; riepilogo con etichette condensate maiuscole (DIFFICULTY, TOTAL XP) e la fascia scritta nel suo colore; elenco mostri con pallini di difficoltà e «+ ADD»; «My Encounters» a righe con la difficoltà colorata; blocco del mostro con nome in maiuscoletto e filetti                                                                                                                                                                                                                      |
| Foundry dnd5e (sistema ufficiale, GitHub `foundryvtt/dnd5e`, ramo master) | `less/v2/compendium-browser.less`, `less/v2/blocks.less`, `less/v2/typography.less`, `less/variables/{base,dark,light}.less`, `templates/actors/embeds/npc-embed.hbs`                                                                                      | Compendium Browser: barra laterale di 230 px in Roboto Condensed, riga scelta `border-left: 4px solid var(--dnd5e-color-gold)`; blocco statistiche 2024 (`.statblock.rules-2024`): `border: 3px double`, raggio 8, fondo tenue (scuro `rgb(0 0 0/.35)`, chiaro `rgb(235 228 214/.35)`), titolo e titoli di sezione `font-variant: small-caps` sopra un filo, righe delle caratteristiche alternate tinte; callout `.narrative` (testo da leggere): fondo del blocco, filetti laterali oro (`--dnd5e-block-border-color: gold` nel tema scuro) e un punto a ogni angolo; `.drop-area` tratteggiata; legende dei fieldset in oro (`--fieldset-legend-color`) |
| Foundry VTT (base)                                                        | Knowledge Base «Scenes» (`scenes-directory-2021-01-29.jpg`, `scene-config-grid-tab-2021-12-17.png`, `scene-sidebar-context-2020-05-20.png`) e «Walls»                                                                                                      | directory delle scene: cartelle come barre piene con icona e nome, scene come miniature della mappa, contenuto annidato sotto la cartella; configurazione a schede; menu contestuale scuro, un comando per riga con icona; muri colorati per tipo (normale giallo, porta chiusa viola, aperta verde chiaro, chiusa a chiave rossa, segreta magenta scuro)                                                                                                                                                                                                                                                                                                  |

### Elemento → prodotto copiato → come/perché → fonte

«Oss.» = osservato su immagine ufficiale; «Cod.» = codice pubblico; «Doc.» = documentazione;
«DESIGN» = riga del sistema (DESIGN.md §3–4) riusata così com'è.

| Elemento                                                                                                                                                                                                             | Prodotto copiato                                                    | Come / perché                                                                                                                                                                                                                                             | Fonte                                                                                        |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Attrezzi della mappa in Preparazione (`.spatial-toolbar`)                                                                                                                                                            | Owlbear Rodeo 2                                                     | la lastra degli attrezzi del Tavolo stesa sopra l'anteprima: `--float-bg`, filo `--float-border`, raggio 14, attrezzi senza bordo raggio 10, scelto in oro tenue                                                                                          | DESIGN «Attrezzi della mappa fluttuanti», «Bottoni degli attrezzi»                           |
| Tela dell'anteprima e delle miniature (`.prep-map`, `.prep-scene-thumb`, `.sa-card-thumb`, `.sa-canvas-wrap`, `.sa-loupe`, `.sa-corners svg`)                                                                        | Owlbear Rodeo 2                                                     | `--canvas`, come sotto la mappa del Tavolo; miniatura incorniciata da un filo, oro al passaggio                                                                                                                                                           | DESIGN «Tela della mappa»                                                                    |
| Colori delle geometrie (muri, porte, aperte, chiuse a chiave, terreno)                                                                                                                                               | Foundry VTT (livello dei muri)                                      | un colore per tipo, come Foundry; valori invariati e nominati `--spatial-*` perché la mappa non cambia tema; selezione, maniglie e gesti su `--token-label` e `--door-fill`                                                                               | Doc. Foundry KB «Walls»; DESIGN §2 (pedine, porte)                                           |
| Elenco delle scene a cartelle (`.prep-folder-group`, `.prep-folder-head`, `.sa-folder-open`)                                                                                                                         | Foundry VTT (Scenes directory)                                      | intestazione di cartella come barra piena `--surface-2` con icona oro, nome e numero; le scene appese a una linea guida                                                                                                                                   | Oss. `scenes-directory-2021-01-29.jpg`                                                       |
| Menu «Altre azioni» (`.prep-menu`, `.sa-menu-list`, `.sa-context`, `.eb-menu`)                                                                                                                                       | Foundry VTT (menu contestuale della scena) sulla lastra del sistema | un comando per riga a tutta larghezza su `--raised`, filo `--frame-soft`, raggio 16, `--shadow-2`; righe raggio 10 (concentriche)                                                                                                                         | Oss. `scene-sidebar-context-2020-05-20.png`; DESIGN «Righe di menu», «Dialogo: raggio 16»    |
| Sotto-sezioni della Preparazione, categorie del compendio, tipi di generatore, filtri dell'outliner (`.prep-sections.is-sub`, `.compendium-category`, `.gen-kind`, `.sa-chip`)                                       | D&D Beyond (filtri) + Foundry dnd5e (pillola)                       | la sotto-scheda del sistema: pillola, maiuscoletto condensato, aperta piena d'oro con inchiostro scuro                                                                                                                                                    | DESIGN «Sotto-schede del pannello»                                                           |
| Raccolte della Biblioteca (`.library-tabs .button`)                                                                                                                                                                  | D&D Beyond (schede di sezione)                                      | come `.tabs`: maiuscoletto condensato, aperta in oro sottolineata; restano a capo (nessuno scorrimento nuovo)                                                                                                                                             | DESIGN «Schede di sezione»                                                                   |
| Colori della difficoltà (`--eb-low/moderate/high/deadly`)                                                                                                                                                            | D&D Beyond Encounter Builder                                        | Easy→Bassa `#CCD9E2`, Medium→Moderata `#FE9E0B`, Hard→Alta `#F04A00`, Deadly→Mortale `#E23D4B`; sotto Bassa neutro (`--muted`); nel chiaro scuriti a 4,8–6,4:1                                                                                            | Oss. `encounter-difficulty.jpg` (campioni)                                                   |
| Barra della difficoltà (`.eb-meter`)                                                                                                                                                                                 | D&D Beyond                                                          | parallelogramma (`skewX(-18deg)`), binario `--hp-track` con filo `--line-strong` (il `#666D7F` di DDB), riempimento nel colore della fascia; Mortale con alone                                                                                            | Oss. stessa immagine                                                                         |
| «Difficoltà 2024» e soglie (`.eb-band-line`, `.eb-budget`)                                                                                                                                                           | D&D Beyond (Encounter Summary)                                      | etichetta condensata in maiuscoletto, fascia grande in serif nel suo colore; soglie come stat box del sistema, quella raggiunta accesa col colore della fascia                                                                                            | Oss. `encounter-summary.jpg`; DESIGN «Stat box»                                              |
| Chip della fascia (`.badge.eb-band`)                                                                                                                                                                                 | D&D Beyond (pallini di difficoltà)                                  | testo nel colore normale, colore della fascia su bordo e pallino iniziale (il rosso di DDB su fondo scuro non arriva a 4,5:1 come testo piccolo)                                                                                                          | Oss. `adding-monster-to-encounter.jpg`                                                       |
| Quantità (`.eb-stepper output`)                                                                                                                                                                                      | D&D Beyond                                                          | − numero + con il numero in grassetto e cifre tabulari                                                                                                                                                                                                    | Oss. `encounter-summary.jpg`                                                                 |
| Riga aperta o scelta (compendio, elenco dei mostri, directory delle tabelle, cartelle dei media)                                                                                                                     | Foundry dnd5e Compendium Browser                                    | barra oro a sinistra (`inset 3px`) su riga piena (`--surface-2`/`--raised`); nei directory anche la riga piena di Kanka                                                                                                                                   | Cod. `compendium-browser.less` (`.item.selected`); DESIGN «Barra laterale di campagna»       |
| Filtri del compendio (`.compendium-filter-box`, `.compendium-facet > summary`)                                                                                                                                       | Foundry dnd5e Compendium Browser                                    | barra laterale su pannello piatto, intestazioni condensate in maiuscoletto                                                                                                                                                                                | Cod. `compendium-browser.less` (`.sidebar` in Roboto Condensed)                              |
| Blocco statistiche 2024 (`.compendium-statblock`, `.eb-block`, `.hbe-statblock`)                                                                                                                                     | Foundry dnd5e (statblock rules-2024) + D&D Beyond                   | cornice doppia 3 px `--line-strong`, carta `--surface-2`, nome e titoli in maiuscoletto serif sopra un filo, caratteristiche a righe alterne `--accent-soft`, etichette in grassetto nel colore del tema; sostituisce la barra superiore oro (stile 2014) | Cod. `typography.less` (`.statblock`), `dark.less`, `light.less`; Oss. `monster-summary.jpg` |
| Numeri tirabili (`.compendium-roll`, `.eb-roll`, `.hbe-roll`)                                                                                                                                                        | D&D Beyond (dadi integrati)                                         | riquadro con filo `--accent-line` su pozzo `--sunken`, cifre tabulari; oro tenue al passaggio                                                                                                                                                             | Oss. `ddb-sheet-desktop.jpg` (riferimenti del sistema)                                       |
| Testo da leggere ad alta voce (`.eb-read-aloud`)                                                                                                                                                                     | Foundry dnd5e (callout `narrative`)                                 | blocco `--surface-2` fra due filetti `--frame` con un punto a ogni angolo (pseudo-elementi), in serif                                                                                                                                                     | Cod. `blocks.less` (`.narrative`), `dark.less`                                               |
| Tooltip del glossario (`.compendium-tip`)                                                                                                                                                                            | BG3 (tooltip, come `.ui-tip`)                                       | lastra `--raised`, filo `--frame-soft`, `--shadow-2`, raggio 12; titolo serif, tipo in maiuscoletto                                                                                                                                                       | DESIGN «Tooltip»                                                                             |
| Avvisi in linea (`.compendium-context/status/resume`, `.hbe-notice`, `.hbe-culprit`, `.adv-warning/blocked/report/undo`, `.media-notice/report/lock`, `.eb-warn`, `.eb-proposal`, `.rt-notice`, `.compendium-place`) | Owlbear Rodeo (MUI Alert, variante standard)                        | fondo tinto `--*-soft` e filo del colore del significato (oro, avviso, successo, pericolo); tolte le strisce laterali spesse                                                                                                                              | Cod. `owlbear-rodeo/dice` PluginThemeProvider (tema MUI); Doc. MUI Alert                     |
| Campi e bottoni delle aree (`.gen-field-text`, `.media-inline-field`, bottone file della Preparazione)                                                                                                               | Foundry v13 + Roll20 (campi del sistema)                            | pozzo `--sunken`, filo `--line-strong`, raggio 6, oro al fuoco; il bottone file come `.button`                                                                                                                                                            | DESIGN «Campi e select», «Bottone normale»                                                   |
| Legende e sotto-titoli di sezione (Biblioteca, homebrew, generatori, avventure, pannelli laterali)                                                                                                                   | Foundry dnd5e + D&D Beyond                                          | legende in oro (`--fieldset-legend-color`) e sotto-titoli in maiuscoletto condensato                                                                                                                                                                      | Cod. `dark.less`; DESIGN «Etichette condensate»                                              |
| Etichette prima in `text-transform: uppercase` (`.compendium-kind`, `.compendium-facts dt`, facet, `.compendium-tip-kind`, `.rt-dir-head h2`, `.hbe-join`, `.media-folders-title`)                                   | D&D Beyond                                                          | `all-small-caps` in `--font-label`: `innerText` invariato                                                                                                                                                                                                 | DESIGN «Etichette condensate in maiuscoletto»                                                |
| Carte dei mazzi (`.rt-card`, `.rt-card-back`)                                                                                                                                                                        | BG3 (cornici bronzo)                                                | cornice `--frame`, fondo sfumato `--raised`→`--surface-2`, dorso a trama d'oro                                                                                                                                                                            | DESIGN «Bronzo delle rifiniture»                                                             |
| Gettoni a più facce sulla mappa (`.rt-token`)                                                                                                                                                                        | piastra delle porte del sistema                                     | la mappa non cambia tema: `--door-fill/rim/ink/focus`                                                                                                                                                                                                     | DESIGN §2 (porte)                                                                            |
| Directory di tabelle e cartelle dei media (`.rt-dir-*`, `.media-folder*`)                                                                                                                                            | Kanka + Foundry dnd5e                                               | intestazioni in maiuscoletto; aperta come riga piena con la barra oro                                                                                                                                                                                     | Oss. Kanka (riferimenti del sistema); Cod. `compendium-browser.less`                         |
| Area di rilascio dei file (`.media-dropzone`)                                                                                                                                                                        | Foundry dnd5e (`.drop-area`)                                        | contorno tratteggiato `--line-strong`, oro tenue quando un file la sorvola                                                                                                                                                                                | Cod. `blocks.less`                                                                           |
| Ritratto e tondo della pedina (`.media-portrait-frame`, `.media-round`, `.media-swatch-dot.is-none`)                                                                                                                 | BG3 (ritratto) + Owlbear (anelli colorati)                          | cornice bronzo 2 px con filo scuro interno e iniziale serif; tondo `--token-ally-fill` con anello `--token-ally-ring`                                                                                                                                     | DESIGN «Ritratto», «Anelli delle pedine»                                                     |
| Avviso sopra la mappa (`.media-map-missing`)                                                                                                                                                                         | Owlbear Rodeo 2                                                     | lastra fluttuante traslucida (blur 10) raggio 14 con filo `--danger`                                                                                                                                                                                      | DESIGN «Traslucenza con blur»                                                                |
| Adesivi della scena (`.sa-sticker`)                                                                                                                                                                                  | BG3 (slot della hotbar)                                             | pozzo `--sunken`, filo bronzo, raggio 4                                                                                                                                                                                                                   | DESIGN «Slot delle azioni»                                                                   |
| Piano, variante, passo e punto di partenza scelti (`.sa-floor.active`, `.sa-variants .is-active`, `.sa-steps .is-current`, `.prep-start:has(:checked)`)                                                              | BG3 («Select Subclass»)                                             | bordo oro su tessera accesa (`--accent-soft`)                                                                                                                                                                                                             | DESIGN «Scheda laterale aperta»                                                              |
| Card delle avventure (`.adv-card`) e dei pacchetti                                                                                                                                                                   | D&D Beyond (card delle fonti) + Kanka                               | card piatta con filo, titolo serif, riga meta; filo più marcato al passaggio                                                                                                                                                                              | DESIGN «Card e pannelli piatti», «Titoli serif»                                              |
| Titoli di scena, avventura, carta, testo estratto, tooltip (Georgia → `--font-display`)                                                                                                                              | BG3 + Solasta                                                       | nomi in serif con lo stack del sistema                                                                                                                                                                                                                    | DESIGN «Titoli serif»                                                                        |
| Tasti nel pannello Scena (`.sa-panel kbd`)                                                                                                                                                                           | Foundry v13                                                         | il chip dei tasti del sistema                                                                                                                                                                                                                             | DESIGN «Tasti»                                                                               |
| Anteprima del dungeon generato (`.gen-*` sulla mappa)                                                                                                                                                                | nessun riferimento nuovo                                            | arte della mappa: colori invariati, nominati `--gen-*`; numeri delle stanze in serif                                                                                                                                                                      | eccezione dichiarata                                                                         |
| Pagina di stampa e anteprime su carta (`.compendium-print-page`, `.adv-print-frame`, `.media-pdf-frame`)                                                                                                             | D&D Beyond (viste stampabili)                                       | carta indipendente dal tema, colori nominati (`--print-*`, `--adv-paper`, `--media-paper`)                                                                                                                                                                | census DDB-160                                                                               |

### Modifiche

- Tutti i colori letterali delle regole sono passati a token (restano solo dentro le definizioni
  nominate: `--spatial-*`, `--eb-*`, `--gen-*`, `--print-*`, carta e segno di file mancante);
  `Georgia` e gli stack `-apple-system` sostituiti da `--font-display`/`--font-ui`; raggi su
  `--radius-*`; ombre su `--shadow-*`; anelli del fuoco a 3 px `--focus` come il sistema.
- Tema chiaro, difetti corretti: blocco statistiche del compendio (testo scuro su carta scura
  fissa, illeggibile), sotto-sezione aperta della Preparazione («Tabelle e mazzi»: testo oro su
  ardesia), campi del generatore e dei media (pozzo scuro fisso), gettoni a più facce (testo del
  tema su piastra scura), carte dei mazzi e callout con fondi scuri fissi.
- Specificità dichiarate: `:root[data-pref-theme="light"] .compendium-categories
.compendium-category.active` supera di una classe la regola `:is()` di `preferences.css`
  (0,4,0) che altrimenti stende `--raised` sotto l'inchiostro chiaro della categoria aperta.
- Test che leggono questi file rispettati: blocco telefono `@media (max-width: 760px)` di
  `preparation.css` (menu di riga) e regole `hidden`/`display` di `media.css` invariate.

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** prima e dopo (il 2543 del compito era più vecchio).
- **Percorsi delle aree** (Chromium, `playwright-cli`, sessione `d20-visual-prep-library`, server
  `127.0.0.1:8879`), copie con la cartella d'uscita spostata in
  `…/prep-library/journeys/out/` (gli originali scrivono nelle cartelle datate del 23–27/09) e
  senza il `;` finale dove c'era: passano tutti e
  23: `preparation`, `p4-prep`, `encounter-builder`, `r5-encounters`, `encounter-lifecycle`,
  `generators`, `scene-assets`, `scene-assets-review`, `random-tables`, `library`,
  `library-mobile`, `library-files`, `library-import-recovery`, `library-builder`,
  `library-spell-recovery`, `p8-library`, `compendium`, `homebrew-editor`,
  `homebrew-editor-review`, `adventures`, `media`, `media-review`, `media-review2`
  (`encounter-builder`, `r5-encounters` e `compendium` ripetuti dopo l'ultima correzione).
  Due note: `scene-assets` si era fermato solo perché la copia non aveva ancora l'immagine di
  prova `sotterraneo-griglia.png` (copiata, poi passa); `media-review2` è instabile e non per
  il CSS: `handouts.mjs` apre il materiale della rotta con `setTimeout(…, 0)` e il percorso
  naviga subito a `#media`, così a volte il dialogo si apre sopra la pagina del file e copre
  «Elimina». Con il nuovo CSS 3 esecuzioni su 5 passano, con il CSS originale rimesso per un
  minuto 1 su 1; un CSS non apre dialoghi. Registri e immagini in
  `…/prep-library/journeys/` (`summary.txt`, `log-*.txt`, `out/`).
- **Immagini**: 23 viste × 1440×900 e 390×844 × scuro e chiaro, prima e dopo, nessun errore di
  pagina e nessuno scorrimento orizzontale in nessuna vista: `…/2026-09-29/visual/prep-library/` → `before/` e `after/` (88 + 88: `prep-scenes`,
  `prep-editor`, `prep-encounters`, `prep-encounter-open`, `prep-tables`, `prep-adventures`,
  `generators`, `library`, `library-homebrew`, `homebrew-editor` (mostro), `library-adventures`,
  `adventure-reader`, `library-packs`, `library-compendium`, `compendium-entry`,
  `library-media`, `media-detail` e i pannelli del Tavolo `table-scene-assets-panel`,
  `table-encounter-builder`, `table-random-tables`, `table-media-dock`,
  `table-compendium-screen`), `compare/` prima | dopo, `references/` (DDB, Foundry),
  `capture-template.js` e `make-captures.sh` (gli script eseguiti; dati sintetici, stato locale
  azzerato). Un giro d'ispezione ha corretto in blocco: etichette delle soglie che uscivano dal
  riquadro (ora sillabate, numeri allineati in basso), categoria aperta del compendio chiara nel
  tema chiaro (override), strisce laterali dei callout, chip dentro i titoli-etichetta; secondo
  giro di conferma sulle viste toccate
- **Contrasto** (WCAG sui valori): fasce di difficoltà scure 3,9–11,2:1 sulla superficie (la
  parola della fascia è testo grande; i chip usano il testo normale), chiare 4,8–6,4:1.
- **Rilevatore impeccable** (`detect.mjs --json` sui dieci file): prima 9 «side-tab», 2
  «border-accent-on-rounded», 1 «layout-transition»; dopo 3 «side-tab» (le due righe scelte copiate dal Compendium Browser di
  dnd5e e il diff di Foundry Rebuild Adventure, che già c'era) e 1 «layout-transition»
  (preesistente: larghezza del riempimento della barra); detector in modalità ridotta, non è un
  via libera.

### Scostamenti dichiarati

- **Dimensioni del testo in px, non `var(--text-*)`**: `preferences.mjs` (`scaledValue`) moltiplica
  per «Dimensione del testo» solo i `font-size` scritti in px; un `font-size: var(--text-sm)` non
  contiene px e crescerebbe solo con la scala dell'interfaccia. I valori sono allineati alla scala
  (11/12/13/15/17/21/26/38; 14 e 16 come i controlli e le schede del sistema) e i `rem` sono
  diventati px, così seguono anche la preferenza del testo.
- **Porte chiuse arancio, non viola**: Foundry colora di viola le porte chiuse; qui restano
  arancio per stare con la piastra dorata delle porte del Tavolo (`--door-rim`) e perché le
  geometrie compaiono anche ai giocatori. Muri, porte aperte e chiuse a chiave seguono già lo
  schema di Foundry.
- **Raggio 6 invece di 8** per blocchi statistiche e riquadri: la scala del sistema non ha 8.
- **Barra oro della riga scelta** (compendio, elenco dei mostri, directory): il rilevatore la
  segnala come «side-tab», ma è la riga scelta del Compendium Browser di dnd5e (codice citato);
  le strisce laterali dei callout, senza riferimento, sono state tolte.
- **Monospazio** per seme del generatore, espressioni e testo da importare: nessun token né
  riferimento; lasciato com'era.
- «Prima» dell'editor homebrew: la cattura iniziale apriva solo il dialogo di creazione; il
  «prima» della pagina dell'editor (mostro) è stato fotografato rimettendo per un minuto il
  `homebrew-editor.css` originale e ripristinando subito il nuovo (confronto `cmp` identico).
- Font di sistema: su macOS `--font-label` risolve ad Avenir Next Condensed; altrove varia.

### Consegne (file fuori da questo passaggio)

1. `preferences.mjs`/`styles.css`: i `font-size: var(--text-*)` del sistema (h1, h2, h3,
   `small`, `.badge`, gruppi di campagna) non crescono con «Dimensione del testo» (vedi sopra):
   o `scaledValue` riconosce le proprietà personalizzate di testo, o i titoli tornano in px.
2. `preferences.css`, tema chiaro: la lista `:is()` dei fondi `--raised` include
   `.compendium-category.active`, `.compendium-chip`, `.rt-dir-item.active`; con i token queste
   voci non servono più (la categoria aperta ha bisogno del proprio override).
3. `preferences.css`, tema chiaro: `.compendium-roll`, `.compendium-tip`, `.rt-notice`,
   `.rt-pending`, `.compendium-attribution` su `--surface` e `.rt-card` con sfumatura letterale:
   ora le aree leggono i token, si possono togliere.

## Critica e correzioni — tutta l'app (29/09/2026)

29–30/09/2026 · stesso worktree · un solo scrittore (Claude Code, Opus 5.5) · compito: critica
visiva indipendente di tutte le superfici, un solo lotto di correzioni, un solo giro di conferma.
File cambiati (tutti CSS in `design/blueprint/`, **nessun markup**, nessun `data-*`, ruolo,
etichetta, testo o posizione): `styles.css`, `characters.css`, `character-builder.css`,
`handouts.css`, `campaign-settings.css`, `campaign-data.css`, `combat-tracker.css`,
`sheet-plus.css`, `compendium.css`, `token-menu.css`, `session-view.css`, `adventures.css`; in
questa nota solo questa sezione.

### Metodo

- Skill impeccable: contesto (`context.mjs --target design/blueprint`, autorità DESIGN.md),
  playbook `critique` e `audit`, craft-floor prima delle modifiche. **Esecuzione ridotta a un solo
  contesto**: in questo flusso non c'è uno strumento per sotto-agenti, quindi la revisione di
  progetto (A) e le prove automatiche (B) sono state fatte in sequenza nello stesso thread; va
  ripetuta da un'altra sessione. Domande all'owner saltate (il compito chiede un lotto di
  correzioni); istantanea `.impeccable/critique/` non scritta (percorso non riservato).
- Browser: `playwright-cli`, sessione `d20-visual-critique` (catture) e `d20-visual-critique-dbg`
  (sonde e misure), server `127.0.0.1:8879`, Chromium su macOS, dati di esempio azzerati a ogni
  percorso. Tre dimensioni (1440×900, 1366×768, 390×844) × scuro e chiaro × tre percorsi: **p**
  giocatore (Inizio, Personaggi, scheda nelle sette categorie, creazione e una sua sezione,
  Campagna × 3, Biblioteca × 4 ambiti, servizi: ricerca, notifiche, preferenze, account, appunti,
  aiuto), **d** DM (Inizio, Personaggi, scheda di un PNG, Campagna × 12 sezioni che coprono i
  cinque gruppi, Preparazione nei quattro gruppi, Biblioteca di campagna), **t** Tavolo
  (esplorazione giocatore e DM, le nove schede della colonna, menu della pedina e sottomenu,
  «Tutti i pannelli», dialogo Avvia combattimento, dadi 3D, combattimento DM e giocatore, hotbar,
  scheda Creatura, anteprima di un'azione). **66 viste × 6 varianti = 396 immagini prima e 396
  dopo**, ognuna con un controllo in pagina: scorrimento orizzontale, contrasto WCAG calcolato dai
  colori effettivi (fondo composto risalendo gli antenati, opacità inclusa), testo tagliato,
  bersagli sotto 24 px, elementi oltre il bordo destro.
- Fuoco da tastiera: 45 pressioni di Tab su otto superfici per tema, con la misura di quanto un
  antenato che scorre taglia l'anello; per la colonna del Tavolo, le sotto-schede, le categorie
  della scheda e Gioco/Modifica (che 45 Tab non raggiungono) fuoco da tastiera diretto.
- Rilevatore impeccable (`detect.mjs --json design/blueprint`, modalità ridotta a espressioni
  regolari perché mancano i moduli di parsing): 11 risultati prima, 10 dopo.
- Evidenze (fuori dal repository): `~/Workspace/Codex/d20-blueprint-evidence/2026-09-29/visual/critique/`
  — `before/` e `after/` (una cartella per variante), `compare/` (25 prima | dopo delle viste
  toccate), `scripts/` (modello di cattura, esecutori, aggregatore, sonde), `logs/` (JSON di ogni
  percorso, `aggregate-before.txt`, `aggregate-after.txt`, audit del fuoco).

### Punteggio

| #   | Euristica (Nielsen)        | Voto      | Nota                                                                                                              |
| --- | -------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Stato del sistema          | 3         | avvisi, ritratti di turno, sincronia; il messaggio della mappa copriva i chip (corretto)                          |
| 2   | Linguaggio del mondo reale | 3         | termini dell'SRD italiano, simboli BG3                                                                            |
| 3   | Controllo e libertà        | 3         | Annulla, Esc, Chiudi ovunque                                                                                      |
| 4   | Coerenza e standard        | 3         | token coerenti; restano un oro per card e strisce che vanno a capo invece di scorrere                             |
| 5   | Prevenzione degli errori   | 3         | anteprime e conferme                                                                                              |
| 6   | Riconoscere, non ricordare | 3         | la colonna del Tavolo è di sole icone, con nomi accessibili e «Tutti i pannelli»                                  |
| 7   | Flessibilità ed efficienza | 3         | scorciatoie, palette, barra rapida                                                                                |
| 8   | Estetica e minimalismo     | 2         | Tavolo del DM con due file di chip sulla mappa; 22 pillole nelle Preferenze; CA e velocità due volte nella scheda |
| 9   | Riconoscere e correggere   | 3         | rifiuti con il motivo e il rimedio                                                                                |
| 10  | Aiuto e documentazione     | 3         | aiuto per pagina, tour, suggerimenti a richiesta                                                                  |
|     | **Totale**                 | **29/40** | **Buono**                                                                                                         |

Audit tecnico: accessibilità 3 (dopo il lotto nessun testo attivo sotto AA; restano bersagli
piccoli sulla mappa), reattività 3 (nessuno scorrimento orizzontale nelle 792 catture della
matrice; a 768 e 1024 px l'intestazione faceva scorrere di lato ogni pagina: corretto), temi 3
(chiaro completo; restano i letterali dichiarati di mappa, dadi e stampa), integrità 3 (rilevatore:
solo riferimenti dichiarati); prestazioni non misurate in questo passaggio. **12/16, buono.**

### Esito per superficie (prima → dopo, che cosa copia)

| Superficie                                                                      | Riferimento citato                                                        | Lo segue?                                                                                                  | Prima (difetto osservato o misurato)                                                                                                                                                                                                                                                                          | Dopo                                                                                                                                                                                                               | Che cosa copia la correzione                                                                                                 |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Inizio                                                                          | D&D Beyond (schede di sezione), card piatte Kanka                         | sì                                                                                                         | l'anello del fuoco di «Novità» tagliato sopra e sotto dalla striscia che scorre (restavano due righe verticali)                                                                                                                                                                                               | anello di 3 px disegnato dentro il controllo, con un filo del colore di fondo                                                                                                                                      | eccezione WCAG dichiarata in DESIGN.md §4 (nessun prodotto ha un anello uniforme)                                            |
| Personaggi (elenco)                                                             | D&D Beyond «My Characters»                                                | sì, tranne un bottone oro «Apri scheda» per card (DDB usa collegamenti a piè di card)                      | —                                                                                                                                                                                                                                                                                                             | invariato (Consegne, 2)                                                                                                                                                                                            | —                                                                                                                            |
| Scheda, sette categorie                                                         | D&D Beyond                                                                | sì (schede, stat box, tabella abilità, filtri)                                                             | riquadri vitali ammassati a sinistra: a 1440 occupavano 953 px su 1344 e lasciavano vuoto il terzo destro; conteggi dei filtri a 4,4:1 nel chiaro (opacità 80 %); anello tagliato su Gioco/Modifica                                                                                                           | da 1001 px una fascia a tutta larghezza (PF su due righe, gli altri tre alti uguali, 139 px, bordo destro = bordo della riga); conteggi pieni; anello interno                                                      | la fila superiore di D&D Beyond (riquadri alla stessa altezza da un bordo all'altro)                                         |
| Creazione del personaggio                                                       | D&D Beyond builder + BG3 (scelta evidenziata)                             | sì                                                                                                         | «Aggiungi classe» e «Aggiorna scelte e PF» stirati per tutta la larghezza del modulo: sembravano campi                                                                                                                                                                                                        | 138 e 170 px, la misura del bottone di base (il telefono resta a tutta larghezza)                                                                                                                                  | i bottoni dei moduli di Foundry e il bottone di base di DESIGN.md §3                                                         |
| Campagna, cinque gruppi                                                         | Kanka (gruppi, voce aperta piena, card piatte)                            | sì                                                                                                         | intestazioni dei gruppi in `text-transform: uppercase` (contro la regola del maiuscoletto; `innerText` «CAMPAGNA»); anello tagliato sulle schede delle Missioni (7 controlli); opzione bloccata delle Impostazioni al 70 % (4,2:1 scuro, 3,1:1 chiaro); spiegazione della spunta disattivata dei Dati a 3,3:1 | maiuscoletto 15 px dalla stessa etichetta condensata (parole scritte come sono: «Campagna»); anello interno; opzione bloccata tratteggiata e leggibile; spiegazione nel secondario                                 | Kanka per i gruppi, resi come le etichette di D&D Beyond; slot tratteggiato di Foundry dnd5e per ciò che non si può cambiare |
| Preparazione, quattro gruppi                                                    | D&D Beyond (schede) + Kanka                                               | sì                                                                                                         | anello tagliato sui gruppi (4 controlli); su telefono il menu «Altro» di un materiale si apriva dal bordo sinistro di «Altro» (x 201) e finiva a 431 px su uno schermo di 390                                                                                                                                 | anello interno; il menu pende dalla riga dei comandi: 33–269 px                                                                                                                                                    | il menu delle righe di scena della Preparazione (riconciliazione 27/09), cioè il menu di base che resta nello schermo        |
| Tavolo, esplorazione                                                            | Owlbear Rodeo 2 (attrezzi, anelli), Foundry v13                           | sì                                                                                                         | telefono, DM: il messaggio della mappa (in alto a 62 px) copriva la seconda fila di chip, cioè carta X, Rallenta e Gruppo; tema chiaro: anello di selezione marrone scuro (`--accent-strong`) su una mappa che resta scura                                                                                    | il messaggio parte sotto le due file (in alto 377 px contro 367 del fondo dei chip); anello nell'oro chiaro della mappa (`--map-gold-bright`) in entrambi i temi                                                   | Owlbear: gli avvisi non coprono gli attrezzi e la selezione resta nei colori della mappa                                     |
| Tavolo, combattimento                                                           | BG3 (ritratti, hotbar, Fine turno) + Solasta                              | sì                                                                                                         | a 1366 e 1440 «Tocca a te» si posava 12 px sotto il bordo della mappa, sopra la fila dei chip di sicurezza (carta X coperta); nel dialogo Avvia combattimento le righe escluse al 60 % (3,8:1 scuro, 2,7:1 chiaro)                                                                                            | la chiamata parte sotto la fila (in alto 331 px contro 321 del fondo dei chip, nessuna sovrapposizione); righe escluse tratteggiate, senza fondo, leggibili nel secondario                                         | BG3: la chiamata del turno non copre i comandi; slot vuoto tratteggiato di Foundry dnd5e                                     |
| Colonna del Tavolo e «Tutti i pannelli»                                         | Foundry v13 (colonna di icone) + D&D Beyond (filtri)                      | sì                                                                                                         | intestazioni dei gruppi del dialogo in maiuscolo trasformato (13 px); anello sulle icone della colonna e sulle sotto-schede: misurato solo dopo (i Tab non ci arrivano)                                                                                                                                       | etichetta del sistema (maiuscoletto condensato 15 px, parole invariate); anello interno, 0 px tagliati su colonna, sotto-schede e categorie della scheda                                                           | le intestazioni delle cartelle nella barra di Foundry                                                                        |
| Menu della pedina                                                               | Owlbear (menu contestuale) + Foundry                                      | sì                                                                                                         | «Indietro» sulla lastra al passaggio: 4,46:1 nel chiaro                                                                                                                                                                                                                                                       | accento forte al passaggio (sopra 4,5:1 in entrambi i temi)                                                                                                                                                        | i collegamenti nel colore del tema di D&D Beyond, più scuri al passaggio                                                     |
| Pannello Sessione (DM)                                                          | —                                                                         | **no**: «Avvia sessione» era rosso (token di pericolo), dichiarato «senza un prodotto di riferimento»      | bottone rosso per un'azione non distruttiva                                                                                                                                                                                                                                                                   | primario oro (`#dfbd78` su scuro, `#7a4f0e` su chiaro), la regola sovrascritta è tolta                                                                                                                             | il controllo principale pieno nel colore del tema di D&D Beyond (DESIGN.md §4)                                               |
| Avventure (ricostruzione)                                                       | «Foundry Rebuild Adventure» (dichiarato)                                  | **no** per la forma: la striscia laterale di 4 px non viene da nessun prodotto (e il craft floor la vieta) | righe aggiunte / tolte / cambiate con una barra colorata a sinistra                                                                                                                                                                                                                                           | filo intero nel colore dello stato su fondo tinto                                                                                                                                                                  | le notifiche di Foundry v13 e gli altri avvisi di stato di questo blueprint                                                  |
| Dadi 3D, dialoghi, avvisi                                                       | BG3, D&D Beyond / Dice So Nice, Owlbear (MUI)                             | sì                                                                                                         | nessun difetto misurato; all'apertura il fuoco va sulla X con l'anello (comportamento nativo del dialogo, lasciato)                                                                                                                                                                                           | invariati                                                                                                                                                                                                          | —                                                                                                                            |
| Biblioteca, Compendio, Le mie creazioni                                         | D&D Beyond (elenchi) + Compendium Browser di dnd5e                        | sì                                                                                                         | conteggi delle categorie («Creature 32») a 4,1:1 nel chiaro (opacità 80 %); su telefono le otto schede vanno a capo in quattro righe (scelta dichiarata dell'area)                                                                                                                                            | conteggi nel secondario pieno; schede invariate (Consegne, 4)                                                                                                                                                      | i conteggi dei filtri di D&D Beyond                                                                                          |
| Intestazione dell'app, 721–1100 px (fuori dalla matrice, trovata con una sonda) | D&D Beyond (intestazione del sito)                                        | sì, ma non ci stava                                                                                        | ogni pagina tranne il Tavolo scorreva di lato: 49 px a 1024, 103 px a 768 (quattro collegamenti con icona più sette bottoni di servizio); a 768 i cinque comandi della scheda uscivano di altri 20 px                                                                                                         | sotto 1100 px via le icone dei collegamenti, sotto 880 px i collegamenti vanno su una riga loro; i comandi della scheda vanno a capo a destra fra 721 e 1000 px: 0 px a 768, 900, 1024, 1180, 1280 su sette pagine | la testata del telefono di questa app (collegamenti sulla loro riga), che segue già l'intestazione di D&D Beyond             |
| Servizi (ricerca, notifiche, preferenze, account, appunti, aiuto)               | Foundry/Kanka (palette), Owlbear (snackbar, righe di menu), BG3 (opzioni) | sì                                                                                                         | 22 pillole di categoria nelle Preferenze: un muro di scelte                                                                                                                                                                                                                                                   | invariato (Consegne, 5)                                                                                                                                                                                            | —                                                                                                                            |

### Scelte senza un prodotto di riferimento

- Corrette in questo lotto: «Avvia sessione» rosso; striscia laterale delle righe di differenza
  delle avventure.
- Restano dichiarate: anello del fuoco (eccezione WCAG, ora anche nella variante interna per le
  strisce che scorrono); marchio d20 (proprio, fino alla fase di branding); colori per tipo di
  difesa (area «table»); tinta oro della riga attiva del tracker (area «table»: da campionare
  sulla riga attiva del Combat Tracker di Foundry); presenza nella bozza condivisa (Figma, fuori
  dall'elenco dell'owner).

### Correzioni (un lotto)

- `styles.css`: anello interno (`outline-offset: -3px` e filo `--bg` di 2 px) per i controlli di
  `.tabs`, `.home-tabs`, `.character-tabs`, `.character-subtabs`, `.shp-mode`, `.prep-sections`,
  `.campaign-sections`, `.table-tabs`, `.table-subtabs`; `.campaign-group-name` in maiuscoletto
  15 px e via `text-transform` da `.campaign-group-toggle` (consegna 2 dell'area «campaign»);
  `.table-panels-group-head h3` con l'etichetta del sistema; `.selection-ring` su
  `--map-gold-bright` (consegna 2 dell'area «table»); su telefono `#map-message` a 104 px quando
  il DM ha due file di chip (`:has(.session-view-hud-bar > :nth-child(6))`, nel blocco telefono già
  esistente, nessun nuovo `@media (max-width: 720px)`).
- `characters.css`: `.character-vitals` in griglia da 1001 px (PF su due righe, altri alla stessa
  altezza; più stretti, tre riquadri di 110–125 px andrebbero a capo parola per parola, quindi fino
  a 1000 px resta il gruppo di prima); `.character-heading .toolbar` va a capo fra 721 e 1000 px.
- `styles.css` (intestazione): sotto 1100 px via le icone dei collegamenti e spaziature strette,
  sotto 880 px i collegamenti su una riga loro (due blocchi prima di quello a 1000 px; nessun
  nuovo `@media (max-width: 720px)`).
- `character-builder.css`: `.builder-form > .button` alla propria larghezza da 721 px.
- `handouts.css`: su telefono il menu «Altro» ha come riferimento `.handouts-card-actions`.
- `campaign-settings.css`, `campaign-data.css`, `combat-tracker.css`, `sheet-plus.css`,
  `compendium.css`: via le opacità che portavano testo leggibile sotto AA; al loro posto bordo
  tratteggiato e colore secondario.
- `combat-tracker.css`: `.ct-alert` da 721 px scende di 48 px (96 px sotto le due file del DM),
  sotto i chip di sicurezza; la posizione calcolata dal codice resta.
- `token-menu.css`: `.token-menu-back:hover` in `--accent-strong`.
- `session-view.css`: tolta la regola rossa di `.session-view-start` (resta `.button.primary`).
- `adventures.css`: `.adv-diff` con filo intero e tinta dello stato.

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2558/2558** dopo il lotto (il
  conteggio 2543 del compito è più vecchio, come già notato sopra).
- **Audit in pagina, 396 viste prima e 396 dopo**: nessun errore di pagina, nessun passo saltato,
  nessuno scorrimento orizzontale in entrambi i giri. Testo attivo sotto AA: **17 casi prima, 0
  dopo**. Restano 11 segnalazioni, tutte spiegate: 10 iniziali nascoste dietro un ritratto (il
  colore della lettera è quello del fondo di proposito; falso positivo) e il glifo ● della risorsa
  Azione nel chiaro a 4,48:1 (è un simbolo grafico: basta 3:1). «Oltre il bordo»: il menu chiuso
  di «Altro» misura ancora 201–431 px perché un `<details>` chiuso non è disegnato (falso
  positivo); aperto misura 33–269 px (prima: dal bordo di «Altro» a x 201, largo 230, fino a 431).
- **Fuoco**: anelli tagliati da una striscia 14 per tema prima (1 Inizio, 2 Gioco/Modifica, 4
  gruppi della Preparazione, 7 schede delle Missioni), **0 dopo**; colonna del Tavolo, sotto-schede,
  categorie della scheda e Gioco/Modifica con fuoco diretto: 0 px tagliati, anello leggibile anche
  sulla scheda piena d'oro (filo scuro interno). Le pedine e le trappole sulla mappa usano il loro
  anello tratteggiato o il tratto (TV-27, PR-29), non un contorno: invariato.
- **Misure delle correzioni** (sonda `scripts/fix-checks.js`, scuro e chiaro): messaggio della
  mappa su telefono 377 px contro 367 del fondo dei chip, 0 chip coperti; «Tocca a te» a 1366 e
  1440 in alto a 331 px contro 321, 0 chip coperti; menu «Altro» aperto 33–269 px su 390; fascia
  della scheda: bordo destro 1392 = bordo della riga, altezze 437/139/139/139; bottoni della
  creazione 138 e 170 px; anello di selezione `rgb(241 215 151)` in entrambi i temi; gruppi
  della campagna `innerText` «Campagna», `all-small-caps`, 15 px; intestazioni di «Tutti i
  pannelli» «Creatura: Livia», `text-transform: none`; opzione bloccata «Consentito» opacità 1,
  tratteggiata; «Avvia sessione» con le classi del pannello: fondo `rgb(223 189 120)` su scuro,
  `rgb(122 79 14)` su chiaro.
- **Rilevatore**: 11 → 10 (tolta la striscia di `adventures.css`); i 10 restanti sono riferimenti
  dichiarati (barra della riga scelta del Compendium Browser di dnd5e, barra degli embed di
  Discord, filo del colore di una macro di Roll20), triangoli BG3 disegnati con i bordi (falso
  positivo) e la transizione di larghezza del misuratore degli incontri.
- **Tavolo**: in combattimento a 1440×900 e 1366×768, DM e giocatore, scuro e chiaro: nessuno
  scorrimento della pagina, hotbar di 115 px (limite 120), come prima (`scripts/table-geo.js`).
- **Tablet** (sonda `scripts/tablet-overflow.js`, Inizio, Personaggi, scheda, Campagna,
  Preparazione, Biblioteca, Tavolo): scorrimento orizzontale prima 103/103/123/103/103/103/0 px a
  768 e 49 px su tutte tranne il Tavolo a 1024; dopo 0 ovunque a 768, 900, 1024, 1180, 1280.
- **Prettier** sui dodici CSS cambiati e su questa nota; suite ripetuta dopo le correzioni della
  tablet: 2558/2558.

### Scostamenti e limiti

- Revisione in un solo contesto (niente sotto-agenti): va ripetuta da un'altra sessione sulla SHA
  candidata.
- Chromium su macOS soltanto, dimensione della finestra senza emulazione del tocco: su 390 px il
  suggerimento della mappa è quello del mouse. Nessun dispositivo reale.
- Le due regole con `:has()` (messaggio della mappa sul telefono, chiamata del turno) contano i
  figli della barra dei chip per capire quando va su due file: è un'approssimazione del CSS; la
  soluzione piena è montare avviso e messaggio sotto la barra nel markup (codice, non visivo).
- Il «prima» della colonna del Tavolo e delle sotto-schede non è stato misurato con il fuoco
  diretto (la sonda è stata scritta dopo il lotto); il taglio si deduce dalla regola globale
  (contorno a 3 px + 3 px fuori da una striscia che scorre) ed è misurato a 0 dopo.

### Consegne (fuori da questo passaggio)

1. `DESIGN.md` §4 «Anello del fuoco»: aggiungere la variante interna per le strisce che scorrono
   (file non riservato a questo passaggio).
2. Elenco dei personaggi e materiali della Preparazione: un bottone oro per card o per riga
   («Apri scheda», «Mostra…»); D&D Beyond mette i comandi della card come collegamenti a piè di
   card. Scelta da confermare prima di cambiarla.
3. Scheda: CA e velocità compaiono due volte (fascia vitale del core e fascia di `sheet-plus`):
   duplicazione di informazione, non di stile.
4. Biblioteca su telefono: le otto schede vanno a capo in quattro righe, mentre le altre strisce
   scorrono di lato; se si passa allo scorrimento serve `scrollIntoStrip` sulla scheda aperta.
5. Preferenze: 22 categorie in pillole; il menu opzioni di BG3 usa un elenco verticale.
6. Tavolo del DM a 1366: due file di chip fluttuanti sopra la mappa (sessione e sicurezza);
   Owlbear ne tiene una sola; raccogliere i comandi di sessione in un menu è una scelta di IA.
7. Bersagli piccoli sulla mappa (punti di viaggio 16–18 px, porte, trappole trovate): le pedine
   hanno un'area di 44 px sul telefono, questi segni no.
8. Etichette in maiuscolo trasformato nelle aree (`chat.css`, `dice-3d.css`, `combat.css`,
   `sheet-plus.css`, `conditions-ui.css`…): alcuni percorsi leggono il testo maiuscolo
   («NARRAZIONE», «SUCCESSO»); per passarle al maiuscoletto vanno aggiornati prima i percorsi.
9. `--res-action` nel chiaro (`#2e7d4f`) su `--surface-2`: 4,48:1; basta per il simbolo, non se
   diventasse testo.

## Critica 2 — dopo il passaggio visivo 2 (30/09/2026)

30/09/2026 · stesso worktree (`codex/interview-01`, lavoro non committato) · un solo scrittore
(Claude Code, Opus 5.5) · compito: critica visiva e di UX indipendente delle superfici rifatte dal
passaggio visivo 2 (Tavolo, scheda, pagine), confronto affiancato con i prodotti citati, un solo
lotto di correzioni e un giro di conferma. File cambiati (tutti in `design/blueprint/`):
`table.mjs` (solo `fitHud`), `combat-tracker.mjs` (solo la posizione di «Tocca a te» sul
telefono), `styles.css`, `session-view.css`, `combat-tracker.css`, `characters.css`,
`library.css`; `DESIGN.md` (nuova sottosezione «Critica 2» in coda al §4, 10 righe); in questa
nota solo questa sezione. Nessun `data-*`, ruolo, nome accessibile, id o collocazione del registro
cambiato; nessun percorso del browser né test modificato.

### Metodo

- Skill impeccable: `context.mjs --target design/blueprint/table.mjs` (autorità DESIGN.md, nessun
  PRODUCT.md: rifinitura consentita sull'esistente), playbook `critique` e `audit`.
  **⚠️ Esecuzione ridotta a un solo contesto**: in questo flusso non c'è uno strumento per
  sotto-agenti, quindi la revisione di progetto (A) è stata fatta prima e le prove automatiche (B:
  rilevatore, audit in pagina, sonde) dopo, nello stesso thread; va ripetuta da un'altra
  sessione. Domande all'owner saltate (il compito chiede un lotto di correzioni); istantanea
  `.impeccable/critique/` non scritta (percorso non riservato).
- Riferimenti affiancati alle catture: `bg3-hotbar.jpg`, `bg3-hotbar-2.jpg`,
  `bg3-tabs-endturn.jpg`, `bg3-turn-order.jpg` (HUD di BG3), `owlbear-rings-initiative.jpg`
  (attrezzi e fila di Owlbear), `foundry-v13-ui.jpg`, `ddb-sheet-desktop.jpg`,
  `ddb-underdark-mobile.jpg`, `kanka.jpg`, `solasta-panels.jpg` (copiati in `references/`); il
  menu opzioni di BG3 non ha un'immagine ufficiale (come nel passaggio delle pagine).
- Browser: `playwright-cli`, sessioni `d20-visual2-critique` (catture), `d20-visual2-critique-j`
  (percorsi), `d20-visual2-critique-p` (sonde), server `127.0.0.1:8879`, Chromium su macOS, dati
  di esempio azzerati a ogni giro. Tre dimensioni (1440×900, 1366×768, 390×844) × scuro e chiaro ×
  tre percorsi: **p** giocatore (Inizio, Personaggi, scheda in alto e quattro pagine, Panoramica,
  Missioni, Biblioteca, Preferenze), **d** DM (Inizio, Personaggi, scheda di un PNG, cinque
  sezioni della campagna, Preparazione, Preferenze), **t** Tavolo (esplorazione giocatore e DM,
  menu «Sessione», tre schede della barra, menu della pedina, Avvia combattimento,
  combattimento DM e giocatore, scheda Creatura, Barra rapida, anteprima di un'azione, scheda sopra
  il Tavolo). **35 viste × 6 varianti = 210 immagini prima e 210 dopo**, ognuna con l'audit in
  pagina della critica del 29/09 (scorrimento, contrasto calcolato, testo tagliato, bersagli,
  elementi oltre il bordo) più una sonda delle sovrapposizioni fra i comandi fluttuanti del Tavolo.
- Sonde mirate (`scripts/probe-*.js`): targa ↔ fila dei comandi a 8 larghezze × 2 ruoli; le 22
  schede e sotto-schede della barra laterale del DM (scorrimento della pagina); hotbar stretta
  (una creatura del DM); fascia della scheda; «Tocca a te» sopra la scheda e sul telefono; fuoco da
  tastiera sui comandi nuovi; stato «in pausa»; «Cerca» della Biblioteca.
- Rilevatore impeccable (`detect.mjs --json design/blueprint`, ridotto a espressioni regolari):
  10 risultati prima e dopo, tutti riferimenti già dichiarati.
- Evidenze (fuori dal repository): `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual2/critique/`
  — `before/` e `after/` (una cartella per variante; in `after/` anche fuoco, pausa e scheda
  sopra il Tavolo), `compare/` (54 prima | dopo delle viste toccate), `references/`, `scripts/`
  (modello di cattura, esecutori, aggregatore, sonde, percorsi), `logs/` (JSON di ogni giro,
  `aggregate-before.txt`, `aggregate-after.txt`, rilevatore, suite, percorsi), `journeys/`.

### Punteggio

| #   | Euristica (Nielsen)        | Prima     | Dopo      | Nota                                                                                                                                            |
| --- | -------------------------- | --------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Stato del sistema          | 3         | 3         | ordine di turno, risorse, pausa scritta sul menu acceso                                                                                         |
| 2   | Linguaggio del mondo reale | 3         | 3         | termini dell'SRD, simboli BG3                                                                                                                   |
| 3   | Controllo e libertà        | 3         | 3         | Esc, Annulla, «Ho capito»                                                                                                                       |
| 4   | Coerenza e standard        | 2         | 3         | la fila dei comandi della mappa era coperta dalla targa a 1024–1366 px; restano «Entra al Tavolo» due volte e le sotto-schede a capo (Consegne) |
| 5   | Prevenzione degli errori   | 3         | 3         | anteprime e conferme                                                                                                                            |
| 6   | Riconoscere, non ricordare | 3         | 3         | «Sessione» a riposo è un'icona: nome nel suggerimento e nel nome accessibile, come le altre icone della fila                                    |
| 7   | Flessibilità ed efficienza | 3         | 3         | scorciatoie, barra rapida                                                                                                                       |
| 8   | Estetica e minimalismo     | 2         | 3         | riquadri della fascia stirati, pagina del Tavolo che scorreva sotto l'HUD, dadi sul bordo della hotbar                                          |
| 9   | Riconoscere e correggere   | 3         | 3         | rifiuti con motivo                                                                                                                              |
| 10  | Aiuto e documentazione     | 3         | 3         | aiuto per pagina, suggerimento della mappa per tocco o mouse                                                                                    |
|     | **Totale**                 | **28/40** | **30/40** | **Buono**                                                                                                                                       |

Audit tecnico dopo il lotto: accessibilità 3 (nessun testo attivo sotto AA; restano i falsi
positivi delle iniziali dietro i ritratti), reattività 3 (nessuno scorrimento orizzontale nelle
420 catture; la pagina del Tavolo non scorre più a 1366 e 1440), temi 3, integrità 3.
**12/16, buono.**

### Confronto affiancato con i prodotti citati

- **Tavolo ↔ HUD di BG3**: ordine di turno in alto al centro, ritratti del gruppo in colonna,
  hotbar centrale con la fila delle risorse sopra e Fine turno tondo: coincide. Scarti: le pagine
  della hotbar stanno a sinistra in verticale (in BG3 sono pillole sotto gli slot) e Fine turno sta
  al piede della barra laterale invece che attaccato alla hotbar: entrambi già dichiarati dal
  passaggio del Tavolo. Difetti trovati: dadi che scendevano sul bordo della hotbar con una sola
  riga di azioni; «Tocca a te» sopra la scheda aperta; nomi dei ritratti illeggibili nel chiaro.
- **Attrezzi della mappa ↔ Owlbear Rodeo 2**: colonna arrotondata a sinistra, zoom in basso a
  destra, una fila di icone in alto a destra: coincide, tranne «Sessione» che era un bottone con
  parola (Owlbear: solo icone) e che a 1024–1366 px la targa della scena copriva.
- **Scheda ↔ D&D Beyond**: fascia, colonne sinistre, striscia, schede di sezione, filtri: coincide.
  Scarto rimasto: la fascia è alta 165 px (D&D Beyond circa 80) perché il riquadro dei PF ha tre
  bersagli da 40 px; i riquadri delle caratteristiche ora distribuiscono etichetta, modificatore e
  punteggio come D&D Beyond invece di lasciare una cornice vuota.
- **Campagna ↔ Kanka**: barra laterale a gruppi, intestazione della campagna, card piatte:
  coincide. Duplicazione rimasta: nome della campagna e «Entra al Tavolo» sia nella barra laterale
  sia nella Panoramica (Consegne, 1).
- **Preferenze ↔ opzioni di BG3 / Foundry**: elenco verticale delle categorie a sinistra,
  impostazione con valore a destra, «Ripristina» in basso a sinistra: coincide. Ridondanza
  minore: il chip dell'ambito («Questo dispositivo») ripetuto su ogni categoria sotto
  l'intestazione del gruppo che lo dice già (Consegne, 4).

### Esito per superficie (prima → dopo, che cosa copia)

| Superficie                                    | Riferimento citato                      | Prima (difetto osservato o misurato)                                                                                                                                            | Dopo                                                                                                                                 | Che cosa copia la correzione                                                      |
| --------------------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Tavolo, fila dei comandi della mappa (DM)     | Owlbear Rodeo 2 + Foundry v13           | la targa della scena copriva «Sessione»: bordo destro della targa 639 contro 613 della fila a 1366, 568/527 a 1280, 388/347 a 1100, 312/271 a 1024                              | 0 sovrapposizioni a 1920, 1600, 1440, 1366, 1280, 1100, 1024, 800; a 1366 «Sessione» è icona e freccia (50 px) e resta 49 px di luce | fila di sole icone di Owlbear; targa che si ferma prima dei comandi (Foundry v13) |
| Tavolo, fila dei comandi (giocatore, 1024 px) | Owlbear Rodeo 2                         | la targa (16–310) copriva la **carta X** della sicurezza (fila da 275)                                                                                                          | targa 16–263 con i comandi a capo (96 px di altezza), fila da 275: nulla coperto                                                     | Foundry v13 (la navigazione delle scene non sale sui comandi)                     |
| Tavolo, stato «in pausa»                      | —                                       | (non misurato prima)                                                                                                                                                            | «Sessione · in pausa» scritto sul bottone oro; la targa va a capo: 0 sovrapposizioni a 1440, 1366, 1024                              | lo stato resta a parole quando conta                                              |
| Tavolo, ritratti del gruppo nel chiaro        | etichette delle pedine (Owlbear + BG3)  | nome `#fff2d3` sulla pergamena `#f4efe4`: **1,03:1** (28 catture)                                                                                                               | targhetta `--token-label-halo` sotto il nome in entrambi i temi: 0 segnalazioni                                                      | la targhetta di stato sotto le pedine («Illeso»)                                  |
| Tavolo, pagina                                | Foundry v13 (barra laterale che scorre) | con «Aggiungi creature», i comandi della sessione o il Riferimento la pagina scorreva di **1255, 2201 e 669 px** (etichette nascoste posizionate fuori dal riquadro che scorre) | 0 px su tutte le 22 schede e sotto-schede del DM a 1440                                                                              | il contenuto della barra di Foundry scorre nella barra                            |
| Tavolo, dadi sopra la hotbar                  | BG3 (una fila sopra la hotbar)          | con una sola riga di azioni (Sentinella del DM) la lastra dei dadi finiva a 802 px, 17 px dentro la hotbar (bordo a 785)                                                        | fondo a 778, alla quota della riga delle risorse, 6 px sopra la hotbar, con qualunque numero di azioni                               | la fila unica di BG3 sopra la hotbar                                              |
| Tavolo, scheda sopra la mappa                 | BG3 (il pannello del personaggio)       | «Tocca a te» (z 60) sopra la scheda (z 40): «Ho capito» sul riquadro dell'Ispirazione                                                                                           | nascosto mentre la scheda è aperta, di nuovo visibile alla chiusura (242–802 × 264–334)                                              | il pannello del personaggio di BG3 prende il posto dell'HUD                       |
| Tavolo, «Tocca a te» sul telefono             | Owlbear (snackbar MUI)                  | fisso a 64 px dall'alto: copriva la barra della prova, l'intestazione e il nome della scena (e il nome e la CA nella scheda Creatura)                                           | 8 px sopra la hotbar fissata (510–619 contro 627); i tocchi passano alla mappa, i bottoni no                                         | la snackbar in basso di Owlbear (DESIGN §4 «Avviso»)                              |
| Scheda, fascia in alto                        | D&D Beyond                              | 172 px; caratteristiche 97×172 con 70 px di contenuto al centro; Competenza, Movimento e Ispirazione idem                                                                       | 165 px; etichetta sul bordo alto, modificatore al centro, punteggio in basso; «Temporanei, massimo e registro…» sotto Cura e Danno   | il riquadro STRENGTH e il riquadro HIT POINTS di D&D Beyond                       |
| Biblioteca, ricerca                           | Foundry v13 + DESIGN §3                 | «Cerca» largo 585 px sotto il campo, come un campo                                                                                                                              | 120 px (telefono invariato, a tutta larghezza)                                                                                       | i bottoni dei moduli di Foundry                                                   |
| Panoramica della campagna                     | Kanka                                   | nome della campagna e «Entra al Tavolo» due volte (barra laterale e pagina), sul telefono nella stessa schermata                                                                | **invariato**: tolto e rimesso, `visual2-pages.test.mjs` (riga 67) fissa il bottone nell'intestazione (Consegne, 1)                  | —                                                                                 |
| Barra laterale, sotto-schede                  | D&D Beyond (filtri) + Foundry dnd5e     | il gruppo Scena del DM mette cinque pillole su tre righe (130 px)                                                                                                               | invariato: «a capo invece di scorrere» è una decisione B62 (Consegne, 2)                                                             | —                                                                                 |
| Inizio, Personaggi, Missioni, Preparazione    | Roll20/DDB, DDB «My Characters», Kanka  | nessun difetto nuovo misurato; «Il tuo personaggio» stirato all'altezza della riga (Consegne, 5)                                                                                | invariati                                                                                                                            | —                                                                                 |

### Correzioni (un lotto)

- `table.mjs` `fitHud`: misura i figli della fila dei comandi della mappa
  (`.session-view-hud-bar > *`); se la targa li raggiungerebbe, le dà `max-width` fino a 12 px
  prima della fila (minimo 160 px) e la targa manda a capo i suoi comandi; il resto di `fitHud`
  (attrezzi e ordine di turno sotto la targa) ne legge poi l'altezza.
- `session-view.css`: il bottone del menu «Sessione» senza stato acceso mostra icona e freccia
  (la parola resta nel `aria-label` e nel `title`); acceso scrive lo stato come prima.
- `styles.css`: `.table-party-name` su targhetta `--token-label-halo`; `.table-sidebar-panel > *`
  con `position: relative` (le etichette nascoste scorrono dentro il pannello); la lastra dei dadi
  ancorata a `.hotbar-center` (`.combat-bar` statica, `grid-area: auto`, `bottom: calc(100% + 6px)`).
- `combat-tracker.css`: `body:has(> .sheet-overlay) .ct-alert { visibility: hidden }`; sul
  telefono la chiamata lascia passare i tocchi tranne i suoi bottoni.
- `combat-tracker.mjs` `showAlert`: sul telefono, con la hotbar fissata nella metà bassa dello
  schermo, `bottom` = 8 px sopra la hotbar.
- `characters.css`: nella fascia i riquadri partono dall'alto e il numero (o la stella) prende lo
  spazio centrale; nel riquadro PF la colonna sinistra tiene quantità, Cura/Danno e il
  collegamento di gestione, i numeri chiudono la colonna destra.
- `library.css`: da 721 px `.library-filters > .button` alla sua misura (minimo 120 px).
- Provata e tolta: «Entra al Tavolo» fuori dall'intestazione della Panoramica (`party.mjs`), per
  il test citato sopra.

### Verifiche

- **Suite**: `node --test design/blueprint/tests/*.test.mjs` → **2580/2580** (il numero 2562 del
  compito è più vecchio; nel primo giro 2579/2580 per la modifica della Panoramica, poi tolta).
- **Audit in pagina, 210 viste prima e 210 dopo**: nessun errore di pagina né passo saltato;
  nessuno scorrimento orizzontale; testo attivo sotto AA: 1 caso (28 catture) prima, **0 dopo**
  (restano i falsi positivi noti: iniziali dietro i ritratti). La sonda delle sovrapposizioni
  conta la scatola intera di `.session-view-hud-bar` (larga quanto la mappa): la misura vera è
  quella per figli della sonda `probe-row.js` riportata sopra.
- **Percorsi del browser** (copie con la sola cartella d'uscita spostata, uno per comando,
  `alarm 200`, sessioni `d20-visual2-critique-j`, `d20-visual2-critique` e `-p`; log in
  `logs/journeys-1.log`, `logs/journeys-2.log`, `journeys/<nome>/run.log`): **27 su 27 verdi** —
  `session-view`, `b61-review-fixes`, `b62-ia`, `b62-review-fixes`, `combat-tracker`,
  `combat-tracker-review`, `r5-initiative`, `p10-governance`, `r7-governance`, `residuals-a`,
  `preferences`, `safety`, `quickbar`, `w2b1-shell`, `sheet-plus`, `p3-hp`, `conditions-fixes`,
  `damage-tray`, `inventory-plus`, `library`, `library-mobile`, `party`, `campaign-mobile`,
  `home`, `combat-mobile`, `forms`, `gestures-and-views`. Nessun percorso modificato.
- **Fuoco da tastiera** (1366, scuro e chiaro): «Sessione» raggiunto con Tab, anello di 3 px
  (`#f1d797` scuro, `#1f5fbf` chiaro), 50×40 px, nome «Sessione · comandi della sessione», Invio
  apre il menu; ritratto del gruppo con anello di 3 px e nome «Livia, 18 punti ferita su 22».
- **Rilevatore**: 10 → 10 (nessun nuovo avviso nei file cambiati).
- **Prettier** sui file cambiati, su `DESIGN.md` e su questa nota.

### Scostamenti e limiti

- Revisione in un solo contesto (niente sotto-agenti): da ripetere in un'altra sessione sulla SHA
  candidata.
- Solo Chromium su macOS, finestre senza emulazione del tocco nelle catture (a 390 px il
  suggerimento della mappa è quello del mouse; `idleHint` ha già la versione per il tocco).
- `fitHud` legge la fila dei comandi di un'altra area (`session-view`): senza quell'area la targa
  resta com'era.
- «Tocca a te» sul telefono si posa rispetto alla hotbar al momento in cui compare; una rotazione
  dello schermo con la chiamata aperta la lascia dov'era fino al prossimo disegno.
- La fascia della scheda resta alta 165 px (Consegne, 3).

### Consegne (fuori da questo passaggio)

1. **Panoramica**: nome della campagna e «Entra al Tavolo» due volte (barra laterale e
   intestazione); `visual2-pages.test.mjs` riga 67 richiede un `data-campaign-route`
   nell'intestazione. Kanka tiene i comandi della campagna nella barra laterale: toglierlo richiede
   di aggiornare quel test (autore del passaggio delle pagine).
2. **Sotto-schede della barra del Tavolo** a capo su tre righe nel gruppo Scena del DM (decisione
   B62 «a capo, così ogni pannello resta in vista»); i filtri di D&D Beyond stanno su una riga:
   scelta di IA per l'owner.
3. **Fascia della scheda** a 165 px: per l'altezza di D&D Beyond il riquadro PF dovrebbe aprire la
   gestione dal numero (come D&D Beyond) invece di un collegamento a parte (`hp-widget.mjs`,
   `damage.mjs`/`damage.css`).
4. **Preferenze**: il chip dell'ambito su ogni categoria ripete l'intestazione del gruppo;
   `preferences-journey` legge quei chip.
5. **Inizio**: «Il tuo personaggio» stirato all'altezza di «Dove eravamo rimasti» (70 px di
   contenuto in 225); il pannello senza immagine della campagna è 363 px di gradiente e icona.
6. La lastra dei dadi tocca la riga di stato della mappa (0–1 px, come prima con la hotbar larga):
   la riga di stato potrebbe salire di 8 px (`bottom: 164px` nel blocco HUD).
7. Dalla critica del 29/09 restano aperte le consegne 1 (anello interno in DESIGN §4), 7 (bersagli
   piccoli sulla mappa), 8 (maiuscolo trasformato nelle aree) e 9 (`--res-action` nel chiaro); le
   2, 3, 4, 5 e 6 sono state risolte dai passaggi della scheda, delle pagine e del Tavolo.
