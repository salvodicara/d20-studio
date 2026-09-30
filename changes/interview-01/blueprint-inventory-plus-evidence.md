# B36 — Inventario profondo: prove

24/09/2026 (cartella prove datata 2026-09-25 come da incarico). Worktree
`d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non committato. Area costruita
tramite il registro (B11): il modulo d'ingresso `inventory-plus.mjs` era già elencato in
`extensions.mjs`. Tre ritocchi **additivi** a file condivisi, elencati sotto.

## File

Nuovi (tutti di B36):

- `design/blueprint/inventory-plus.mjs` — modulo d'ingresso `register(registry)`: sezioni di
  stato `inventory-plus` (Undo a istantanea: valute della campagna, offerte, munizioni usate
  per scontro, usi delle attività, tiri applicati, movimenti) e `inventory-plus-rolls` (facce
  accettate, `undo: "preserve"`); **sostituisce la scheda core «Inventario»** della scheda
  personaggio (`sheet-tab` `inventory`, `replaces: true`) conservandone ogni comando
  (Dettagli, Bevi, Registra raccolto, Aggiungi oggetto, Cerca nella Biblioteca, Origine e
  revisioni, tiro della pozione in attesa, Ultima cura); riquadro «Armi e munizioni» nella
  scheda Creatura del Tavolo (`table-panel` `inspector`); notifiche della campana (B24);
  fornitore di azioni per il combattimento; regolatore della velocità per l'ingombro.
- `design/blueprint/inventory-plus-domain.mjs` — dominio puro (nessun DOM, nessun registro).
- `design/blueprint/inventory-plus.css` — stili `.invp-*` collegati con `registerStyles`.
- `design/blueprint/tests/inventory-plus.test.mjs` — 16 test (store e registro reali, area
  B26 caricata, stesso gestore dei controlli, ganci di combattimento e velocità).
- `changes/interview-01/blueprint-checks/inventory-plus-journey.js` — percorso nel browser.

Ritocchi additivi a file condivisi (firme ed esiti esistenti invariati; senza fornitori il
comportamento è identico, suite completa verde):

1. `combat.mjs` — `registerActionProvider({list, preview, commit})` e tre cicli: azioni
   aggiunte in coda a `listActions`, motivi di rifiuto in `previewAction`, consumo dentro
   `beginAttempt` subito dopo il costo dell'azione. B40 (special-moves) usa ora lo stesso
   gancio per armi da mischia e da lancio; B36 fornisce solo le armi con Munizioni.
2. `forms-companions.mjs` — `registerSpeedAdjuster(fn)` e `speedAdjustments(actor)`;
   `getEffectiveSpeed` applica i regolatori alla velocità base prima delle condizioni.
3. `characters.mjs` — import di `speedAdjustments` e, in `effectiveSpeedHint`, la dicitura
   «per ingombro» / «per ingombro e condizioni» quando la velocità cambia per il carico
   (prima diceva sempre «per condizioni»).

Dati coerenti con lo stato esistente: il seme aggiunge, solo se assenti, righe sintetiche a
**Livia** (Borsa conservante, Zaino con 4 Razioni SRD, acciarino e taccuino; Mappe del cielo e
Amuleto della salute nella borsa; Cassa di lenti da 20 kg; Arco corto; 20 Frecce; Bacchetta
di dardi incantati 3/7; Bastone del fuoco 10/10 in sintonia; Mantello della protezione
indossato e in sintonia; Anello di protezione **non identificato** tramite il record segreto
di B26 «Anello d'argento inciso»), il set d'armi Bastone/Arco corto, 30 mo 45 ma 120 mr e 12
«Scaglie di Bruma»; a **Doran** Spada lunga e Scudo equipaggiati e Arco lungo nel set a
distanza. Valuta di campagna «Scaglia di Bruma» (5 = 1 mo, 0,01 kg). Le razioni contano nelle
Provviste di B-viaggio, le monete sono la borsa `actor.currency` di B26, l'identificazione è
`identifyItem` di B26 (il suo riquadro DM «Oggetti non identificati» funziona sulla stessa
riga), il tempo è `state.restTime.clocks.lanterns` del core con l'ora iniziale del
calendario B42.

## Dove si trova (≤ 2–3 clic)

| Contesto                                 | Percorso                                                                                   | Chi                                                                            |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Scheda → **Inventario**                  | Personaggi → Apri scheda → Inventario (3 clic); `#characters?id=livia&tab=inventory`       | chi vede la scheda; comandi a chi la controlla; Copia e identità segreta al DM |
| Tavolo → scheda **Creatura** (ispettore) | Tavolo → seleziona la tua pedina: «Armi e munizioni» (Cambia set, faretra, Recupera)       | chi controlla la creatura selezionata                                          |
| Barra delle azioni del Tavolo            | l'arco equipaggiato compare come azione («Arco corto») con i dadi fisici o digitali        | chi controlla la creatura di turno                                             |
| Campana (B24)                            | offerta ricevuta, ricarica all'alba da tirare, munizioni da recuperare → apre l'Inventario | controllore del destinatario / proprietario della scheda                       |
| Valute della campagna                    | Inventario → Gestisci monete → Valute della campagna…                                      | solo DM                                                                        |

Nessuna nuova scheda della barra laterale del Tavolo, nessun pulsante nell'intestazione.

## Capacità → prove

Regole: SRD 5.2.1 (2024), copie locali immutabili EN/IT (SHA256 in `SOURCES`), pagine
stampate. Pattern: righe `docs/interview/CAPABILITY_CENSUS.md` e
`changes/interview-01/market-census/*.md`.

| Capacità (census)                                 | Percorso nell'app                                                                                                                                                         | Comandi ed esito                                                                                                                                                                                                                                                              | Regola / fonte                                                                                                                                                  | Pattern adottato                                                                                              | Prova                                                                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| PG-64 ricerca, filtri, raggruppamenti             | Inventario: campo «Cerca», filtri a pillola (Tutti, Equipaggiati, Sintonia, Consumabili e cariche, Munizioni, Magici, Contenitori), «Rarità», «Raggruppa per contenitore» | «frecce» digitato → 1 risultato con la collocazione («addosso»); Sintonia + raro → solo l'Amuleto; l'anello nascosto non risponde a «protezione» né alla rarità                                                                                                               | —                                                                                                                                                               | dnd5e ricerca/filtri/gruppi FVT-023; BG3 filtro rarità CRP-025; DDB filtri per contenitore e Sintonia DDB-045 | test «search and filters…»; percorso passo 11; `b36-01`                                                       |
| PG-65 contenitori annidati, peso escluso          | righe raggruppate per contenitore con capacità, barra e «Capacità superata»; «Sposta…» o trascinamento sull'intestazione                                                  | Zaino nella Borsa conservante: 38,82 → 31,32 kg, «Peso escluso: pesa sempre 2,5 kg»; Cassa trascinata nello Zaino: 25/15 kg «Capacità superata»; Undo e di nuovo; cicli, oltre 5 livelli e borsa in spazio extradimensionale rifiutati con motivo                             | Zaino EN 96 / IT 113; Borsa conservante EN 212 / IT 252 (peso fisso, sovraccarico e spazi extradimensionali)                                                    | dnd5e contenitori a 5 livelli FVT-024; DDB contenitori DDB-047; Shard «senza peso aggiuntivo» VTL-019         | test «containers…»; percorso passo 1; `b36-03`                                                                |
| PG-66 monete: conversione, contenitore, passaggio | Inventario → Gestisci monete: Converti, Monete nel contenitore, Passa o offri                                                                                             | 120 mr → 12 ma con anteprima; 57 ma → 5 mo + resto 7 ma; 12 sb → 2 mo + 4 ma; 10 mo nello Zaino (sulla sua riga e nel suo peso); 5 mo offerte a Doran, accettate dal DM                                                                                                       | monete EN 89 / IT 101 (cambi, 50 monete = 0,5 kg)                                                                                                               | dnd5e dialogo di trasferimento FVT-025; DDB monete nei contenitori DDB-048; Roll20 convertitore R20-030       | test «coins…»; percorso passi 2 e 2/3; `b36-05`, `b36-04`, `b36-09`                                           |
| PG-67 dividere, spostare vs copiare               | riga → Altro → Dividi la pila / Sposta, passa o copia; trascinamento con Ctrl/Alt = copia                                                                                 | 20 frecce → 12 + 8; al giocatore «Copia» è disattivata con il motivo e lo spostamento a Doran diventa un'offerta; verso Mira (stesso controllore) passaggio diretto; il DM copia 2 frecce a Doran (Livia resta 12)                                                            | —                                                                                                                                                               | dnd5e dividi FVT-026; Shift sposta / Ctrl copia con permessi FVT-027; offerte INV-07/08 (moduli Foundry)      | test «split…», «an offer is revalidated…», «persistence…»; percorso passi 3, 2/3, 8                           |
| PG-68 sintonia, tre posti                         | «Gestisci sintonia» o filtro Sintonia: tre posti DDB e «Richiedono sintonia»; dialogo con riposo breve completato o registrazione con motivo                              | Amuleto in sintonia (3/3); l'Anello, identificato, è rifiutato nel dialogo «Il tentativo fallisce: sei già in sintonia con 3 oggetti…»; terminata la sintonia col Mantello l'Anello entra; requisito di classe (Doran e Bastone del fuoco) rifiutato                          | Sintonia EN 102 / IT 116: riposo breve dedicato, massimo tre, un solo esemplare, fine volontaria con un altro riposo breve                                      | DDB tre posti DDB-049; Solasta menu di sintonia CRP-027                                                       | test «attunement…», «attunement linked to a completed short rest…»; percorso passi 4a, 4b; `b36-06`, `b36-12` |
| PG-35 cariche ricaricate all'alba                 | riga con «Cariche n/max»; dopo l'alba del calendario «Ricarica all'alba (1d6 + 1)»; campana                                                                               | DM «Tempo» +22 h (08:00 → 06:00): la bacchetta chiede la ricarica; dado fisico 5 → 6: 3 → 7/7; con dado digitale Undo e nuovo tiro riusa la stessa faccia; ultima carica → d20, con 1 distrutta                                                                               | Bacchetta EN 251 / IT 247; Bastone del fuoco EN 245 / IT 249; alba alle 06:00: convenzione del prototipo (`authored-demo`)                                      | dnd5e recupero all'alba dal calendario FVT-061; cariche sull'oggetto DDB-050                                  | test «dawn recharge…», «activities…»; percorso passi 5a, 5; `b36-11`                                          |
| PG-69 munizioni collegate all'attacco             | Tavolo: azione «Arco corto»; ispettore «Munizioni · Arco corto» (faretra); Inventario «Munizioni dopo lo scontro»                                                         | due attacchi con dadi digitali: frecce 12 → 11 → 10 (+4 al colpire: Des +2, armi semplici del Mago +2; 1d6 + 2); senza frecce l'anteprima spiega «Nessuna munizione»; dopo lo scontro «usate 2 → recuperi 1, perse 1», «Recupera» una sola volta                              | Munizioni EN 89 / IT 102 (una per attacco, metà per difetto dopo 1 minuto); Arco corto EN 91 / IT 103; Mago EN 77 / IT 59                                       | dnd5e munizione consumata dall'attacco FVT-140; Solasta faretra che sceglie la munizione CRP-024              | test «a bow attack…»; percorso passi 6a, 6b; `b36-13`, `b36-14`                                               |
| PG-70 ingombro facoltativo con varianti           | riquadro «Peso trasportato»: select Disattivato / Standard (SRD 2024) / Variante (regola della casa), «Ignora il peso delle monete», «Capacità e regola»                  | Variante: 38,82 kg > For × 2,5 kg → Ingombrato, Velocità 9 → 6 m con motivo; il Movimento della scheda dice «ora 6 m per ingombro» e il Tavolo usa 6 m; Cassa nella borsa → 9 m; Standard oltre la capacità → 1,5 m                                                           | Capacità di trasporto EN 178 / IT 205 (For × 7,5 kg; trascinare For × 15 kg; oltre, Velocità ≤ 1,5 m). La variante **non è SRD**: fonte `house-rule` dichiarata | DDB off/standard/variante con spinta e sollevamento DDB-051; dnd5e variante FVT-029                           | test «variant encumbrance…»; percorso passo 7; `b36-02`                                                       |
| PG-71 non identificati e identificazione          | il giocatore vede «Anello d'argento inciso · Non identificato»; il DM «(in realtà: Anello di protezione)», Altro → «Identifica (DM)» o «Rendi non identificato (DM)»      | l'identità, la sintonia, la rarità e le cariche restano nel record DM di B26 finché il DM identifica; poi l'anello mostra «Richiede sintonia» ed è sintonizzabile                                                                                                             | Identificare un oggetto magico EN 102 / IT 115                                                                                                                  | Shard «Hidden» → Identify VTL-020; dnd5e nome non identificato FVT-028; Solasta/DOS2 CRP-028                  | test «seed…», «attunement…», «customise…»; percorso passo 8; `b36-10`                                         |
| PG-73 restrizioni di equipaggiamento              | «Equipaggia» sulla riga                                                                                                                                                   | Arco corto rifiutato: «richiede due mani quando attacchi: hai già in mano Bastone. Usa «Cambia set» o riponi prima Bastone»; una sola armatura, un solo scudo                                                                                                                 | Due mani EN 90 / IT 102; Una alla volta EN 92 / IT 105                                                                                                          | BG3 rifiuto con messaggio CRP-021; Solasta avviso CRP-022                                                     | test «equip restriction…»; percorso passo 9; `b36-07`                                                         |
| PG-74 set d'armi con cambio rapido                | riquadro «Set d'armi» e ispettore del Tavolo: «Cambia set»; Altro → «Imposta nel set…»                                                                                    | Bastone → Arco corto in mano (l'azione del Tavolo cambia di conseguenza); Doran: «Arco lungo richiede due mani … Scudo» finché lo scudo non è riposto                                                                                                                         | equipaggiare/riporre un'arma come parte dell'attacco EN 177 / IT 204 (il tempo lo decide il tavolo)                                                             | BG3 cambio mischia/distanza CRP-023                                                                           | test «equip restriction…»; percorso passi 9, 2/3; `b36-13`                                                    |
| PG-75 valute personalizzate con cambio            | Gestisci monete (DM) → Valute della campagna: nome IT/EN, sigla, quante per 1 mo, peso                                                                                    | «Scaglia di Bruma» 5 = 1 mo; conversione esatta verso l'oro; il giocatore non può crearle; eliminazione rifiutata se qualcuno le possiede                                                                                                                                     | valuta scritta dal DM (`campaign-rule`), non una moneta SRD                                                                                                     | Shard valute con cambio VTL-021                                                                               | test «coins…», «Table inspector… currency editor»                                                             |
| PG-76 personalizzazione                           | Altro → Personalizza…                                                                                                                                                     | nome mostrato, note, peso, costo, materiale (argento/adamantio descrittivo); l'originale resta nel dialogo; il peso personalizzato entra nei totali                                                                                                                           | armi argentate non presenti nello SRD 5.2.1; Armatura di adamantio EN 209 / IT 243 è un oggetto magico: nessun effetto automatico                               | DDB Customize DDB-050                                                                                         | test «customise…»                                                                                             |
| TV-70 oggetto con più attività e dialogo d'uso    | «Usa» sul Bastone del fuoco o sulla Bacchetta; Maiusc+clic = attività principale                                                                                          | 3 attività (Mani brucianti 1, Palla di fuoco 3, Muro di fuoco 4 cariche) con consumo 10 → 7, livello, danni 8d6 fuoco, TS Destrezza CD 13; «Consuma le cariche» (senza consumo resta scritto nel registro); dadi fisici o digitali; tiro nel registro e annunciato ai dadi 3D | Bastone del fuoco EN 245 / IT 249; incantesimi dal catalogo SRD (Palla di fuoco EN 131 / IT 171 …)                                                              | dnd5e Activities e Shift+clic FVT-017; dialogo d'uso con consumo e livello FVT-018                            | test «activities…»; percorso passo 10; `b36-08`                                                               |

Altri controlli: correzione della quantità con motivo (INV-03) nei «Movimenti
dell'inventario»; offerte rivalidate all'accettazione («15 offerti, 10 disponibili»),
ritirate o rifiutate, nulla riservato prima (INV-08); le schede private (Iria) non sono
destinatarie, cambiano solo in locale e anche senza rete; le modifiche condivise offline sono
rifiutate con «Sei senza rete»; il DM non vede la scheda privata.

## Comandi eseguiti e risultati

```sh
node --test design/blueprint/tests/inventory-plus.test.mjs          # 16/16
node --test design/blueprint/tests/*.test.mjs                        # vedi sotto
# 24/09: 1887/1887 (con i primi 15 test B36); ultima esecuzione 1919/1923: i 4 errori sono
# tutti in tests/generators.test.mjs (area B-generatori in costruzione in parallelo: muri
# nella bozza di Preparazione), nessuno tocca B36 o i ganci additivi.
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36
playwright-cli -s=d20-b36 open http://127.0.0.1:8879/
playwright-cli -s=d20-b36 --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/inventory-plus-journey.js
# {"passed":[18 voci], "errors":[]}   (risultato salvato in journey-result.json)
```

Il percorso (Chromium, 1440×900 IT e contesto separato 390×844 EN tattile) usa solo clic,
tasti, trascinamento e tocchi reali; legge `localStorage` solo per verificare le conseguenze.
Gruppi: giocatore IT (ricerca, variante, contenitori con menu, trascinamento e Undo, divisione
e offerta, monete, sintonia, rifiuto BG3 e cambio set, dialogo d'uso con Maiusc+clic,
ricarica della pagina); DM (offerte accettate su Doran, scudo che blocca l'arco lungo, copia
DM, identificazione, orologio +22 h); giocatore (ricarica all'alba con dado fisico, quarta
sintonia rifiutata, fine sintonia e nuova sintonia); combattimento vero al Tavolo (due tiri
d'arco, fine incontro, recupero); telefono EN (etichette, nessun trabocco orizzontale,
bersagli ≥ 40 px, filtro Munizioni, divisione al tocco, rifiuto offline).

Schermate (1440×900 salvo il telefono) in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36/`:
`b36-01-inventory-it-1440.png`, `b36-02-variant-encumbrance.png`,
`b36-03-backpack-in-bag-capacity.png`, `b36-04-offers-pending.png`,
`b36-05-coins-convert-dialog.png`, `b36-06-attunement-slots.png`,
`b36-07-weapon-set-swapped.png`, `b36-08-staff-usage-dialog.png`,
`b36-09-dm-offers-on-doran.png`, `b36-10-dm-ring-secret.png`,
`b36-11-dawn-recharge-physical.png`, `b36-12-fourth-attunement-refused.png`,
`b36-13-table-inspector-bow.png`, `b36-14-ammo-recovery.png`, `b36-15-phone-en-390.png`.
Ispezionate: nessuna sovrapposizione dopo aver spento i suggerimenti (B30) sulla scheda; i
campi delle facce fisiche restano nascosti finché non si sceglie «Fisici».

## Limiti onesti

- **Effetti degli oggetti**: +1 CA/TS dell'Anello e del Mantello, Costituzione 19
  dell'Amuleto, resistenza al fuoco del Bastone non sono applicati: si registrano con
  «Correggi valori» o con le aree effetti (B37).
- **Attività**: consumo, livello, CD e tiro dei danni sono reali; bersagli, area e tiri
  salvezza non passano ancora dal motore del Tavolo (Mani brucianti dal bastone non spende
  uno slot ma non disegna il cono): il DM applica i danni con «Danni, cure e condizioni».
- **Munizioni**: la munizione si sceglie con la faretra (scheda e ispettore, Solasta CRP-024),
  non dentro l'anteprima d'attacco (FVT-140 la mette nel dialogo): l'anteprima del Tavolo
  ne mostra nome e quantità. Gittata normale e lunga (24/96 m per l'arco corto, svantaggio
  oltre la normale) dalla revisione B36-rf, sotto. Il recupero è di chi ha tirato, una volta,
  fino all'inizio di un altro scontro; il minuto non avanza l'orologio condiviso (è del DM).
- **Ingombro**: un cambio di carico a metà turno cambia la velocità effettiva subito, ma il
  movimento residuo del turno non viene ricalcolato fino al turno successivo. La variante è
  per personaggio (come D&D Beyond), non un'impostazione di campagna. In inglese le unità
  sono convertite in lb/ft dalle preferenze esistenti.
- **Set d'armi**: un'arma principale per set (niente mano secondaria di BG3); il cambio in
  combattimento è registrato come fatto, senza contare le interazioni del turno.
- **Offerte**: niente «Modifica offerta» (si ritira e se ne fa un'altra); niente
  controproposte o accettazioni parziali; le monete si offrono dalla borsa, non da un
  contenitore.
- **Trascinamento** solo con mouse dentro la stessa scheda (HTML5); tra creature e al tocco si
  usa il menu «Altro». Copia solo per il DM e solo oggetti singoli identificati.
- **Scorta B26**: depositare un contenitore nella scorta del gruppo sposta la sola riga del
  contenitore; il contenuto resta al personaggio e diventa «addosso» (riferimento orfano
  gestito, non perso).
- **Sintonia**: il collegamento a un riposo breve usa i riposi già completati di
  `restTime`; la regola «non lo stesso riposo usato per conoscerne le proprietà» e
  l'interruzione non sono verificate; la registrazione con motivo resta la via ordinaria.
- **Alba**: le 06:00 del calendario sono una convenzione del prototipo; più albe passate
  generano una ricarica per alba finché l'oggetto è pieno.
- Nessun backend: permessi e visibilità sono proiezioni locali a due identità, come nel resto
  del prototipo.

## Review and fixes (B36-rf, 24/09/2026)

Revisione indipendente (non ho costruito B36) contro la scheda del census, nello stesso
worktree `codex/interview-01`, lavoro non committato. Sessione playwright-cli `d20-b36-rf`,
prove in `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36-rf/`.
Le correzioni stanno solo nei file di B36; nessun file condiviso toccato in questa revisione.

### Cosa ho verificato prima di correggere

- Percorso del costruttore rieseguito nella mia sessione: 18/18, nessun errore di pagina.
- Esplorazione a mano (1440 IT, 390 IT/EN): comandi del core nella scheda sostituita (Bevi,
  Aggiungi oggetto, Dettagli) funzionano; menu «Altro» da tastiera con focus sul dialogo e
  ritorno sul pulsante con Esc; ispettore del Tavolo nella scheda Creatura, azione «Arco
  corto» nella barra in basso dopo «Cambia set», nessun pulsante nell'intestazione né nuova
  scheda della barra laterale (B61 rispettato); CSS tutto con prefisso `.invp`; nessuna
  stringa italiana nella resa EN (scansione di scheda e 12 dialoghi); telefono 390 senza
  trabocco.
- Sonde nel dominio (script a parte, stesso store e registro dei test) sui casi limite:
  offerte di contenitori, DM verso schede dei giocatori, contenitori nascosti, ultima carica.
- Pagine SRD ricontrollate sulle copie locali (SHA256 uguali a `SOURCES`): Pesante EN 89 /
  IT 102, Gittata EN 90 / IT 101, scudo con azione Utilizzo EN 92 / IT 105, equipaggiare
  un'arma per attacco EN 177 / IT 204, interagire con un oggetto EN 13 / IT 15.

### Findings

| #   | Sev.           | Riproduzione                                                                                                                                                                                                                                                                                                                                      | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| --- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2             | Livia offre lo Zaino a Doran, poi toglie le Razioni: l'offerta resta accettabile e Doran riceve uno zaino diverso; il destinatario legge solo «Zaino ×1». INV-08 chiede di rivalidare «contenuto della borsa».                                                                                                                                    | **Corretto.** L'offerta registra il contenuto (righe annidate e monete) di ogni contenitore; `offerProblems` lo confronta: «Il contenuto di Zaino è cambiato dopo l'offerta», Accetta disattivato, accettazione rifiutata. Il destinatario, la campana e il registro leggono «Zaino ×1 (Razioni ×4, …)». Test «review: an offered container…», percorso passo 2 e 5, `rf-11`, `rf-12`, `rf-14`.                                                                                                             |
| 2   | P2             | DM sulla scheda di Doran → Arco lungo → Sposta: «Livia · passaggio diretto»; il DM poteva anche accettare al posto del giocatore un'offerta per Livia e riceveva la sua campana. I-071: diretto solo se chi agisce è l'**unico** controllore del destinatario («non si deduce una deroga per tutti i comproprietari»); I-070: accetta chi riceve. | **Corretto.** `isDirectTransfer` (diretto solo verso una scheda giocata soltanto da chi agisce), `canAnswerOffer` (accetta o rifiuta chi gioca il destinatario), `canWithdrawOffer` (ritira chi ha fatto l'offerta o gioca il mittente). Il DM che dà a Livia fa un'offerta; la campana arriva al giocatore, che accetta; il DM non accetta né ritira per lui («Solo chi gioca Livia…»). Diretti invariati: giocatore Livia → Mira, DM verso Doran. Test «review: direct only…», percorso passo 1, `rf-10`. |
| 3   | P2             | Arco corto al Tavolo: bersaglio oltre 24 m rifiutato «fuori portata», ma la proprietà Gittata 2024 permette l'attacco fino a 96 m con svantaggio. Il limite era dichiarato; ora il motore lo supporta (`longRangeMeters`, aggiunto da B40).                                                                                                       | **Corretto.** Le armi con Munizioni dichiarano `longRangeMeters` (96 m arco corto, 180 m arco lungo); il motore applica lo svantaggio oltre la normale e rifiuta oltre la lunga; l'anteprima dice «Gittata 24/96 m, svantaggio oltre la normale». Test «review: the bow reaches its long range…», percorso passo 4, `rf-13`.                                                                                                                                                                                |
| 4   | P3             | Pesante (EN 89 / IT 102): arco lungo con Destrezza sotto 13 senza svantaggio. Nessun personaggio d'esempio colpito (Doran Des 14).                                                                                                                                                                                                                | **Corretto.** `heavyRollReasons` registrato con `provideRollReasons` (gancio B40 esistente): motivo «Pesante: … Destrezza 12 (meno di 13)» con fonte. Stesso test del n. 3.                                                                                                                                                                                                                                                                                                                                 |
| 5   | P3             | Bacchetta a 0 cariche con il d20 dell'ultima carica da tirare: dopo l'alba il pulsante principale era «Ricarica all'alba» e la ricarica si poteva tirare prima di sapere se la bacchetta esiste ancora.                                                                                                                                           | **Corretto.** Prima il d20 (pulsante e rifiuto «Tira prima il d20 dell'ultima carica»), poi la ricarica. Test «review: the last-charge d20…».                                                                                                                                                                                                                                                                                                                                                               |
| 6   | P3             | DM → «Rendi non identificato» sulla Borsa conservante piena: da non identificata smette di essere un contenitore, il contenuto finisce «addosso» e il peso cambia.                                                                                                                                                                                | **Corretto.** Rifiuto con motivo «Togli prima il contenuto di Borsa conservante…»; un contenitore vuoto si nasconde come prima. Stesso test del n. 5.                                                                                                                                                                                                                                                                                                                                                       |
| 7   | P3             | Tastiera: dopo un dialogo aperto da «Altro» (Dividi, Sposta, Personalizza…) il focus finiva sul `body` (la resa sostituisce il pulsante e il dialogo nativo restituisce il focus al vecchio nodo). Stesso effetto per «Cambia set» nell'ispettore del Tavolo.                                                                                     | **Corretto.** Il comando ricorda il controllo che l'ha avviato e, chiuso il dialogo, rimette il focus sul nuovo «Altro» della stessa riga (sulla ricerca se la riga è sparita); nell'ispettore il focus resta su «Cambia set»/munizioni. Un «Cambia set» rifiutato non lascia più un focus in sospeso. Percorso passi 3 e 4.                                                                                                                                                                                |
| 8   | P3             | Il core diceva, per «Equipaggia», che in combattimento si registra un fatto e non un cambio gratuito; il toggle istantaneo di B36 (DDB/BG3) lo aveva perso.                                                                                                                                                                                       | **Corretto.** In uno scontro attivo, equipaggia/riponi e «Cambia set» mostrano la regola 2024 registrata: scudo con azione Utilizzo, armatura in minuti, un'arma per attacco (con pagine). Il dialogo «Usa» ricorda che bacchetta e bastone si usano impugnati (interazione con un oggetto). Test «review: in a fight…».                                                                                                                                                                                    |
| 9   | P3             | FVT-140 mette la scelta della munizione nel dialogo d'attacco; qui sta nella faretra (Solasta CRP-024) nella stessa scheda Creatura e nella scheda.                                                                                                                                                                                               | **Non corretto, dichiarato.** Serve un campo di selezione nell'anteprima di `combat-ui.mjs` e il passaggio in `selectionCopy` di `combat.mjs`: due file condivisi. Resta il limite già scritto sopra.                                                                                                                                                                                                                                                                                                       |
| 10  | P3             | «Modifica offerta» (INV-08) e colonne configurabili dell'elenco (PG-64 «colonne», dnd5e) mancano.                                                                                                                                                                                                                                                 | **Non corretto.** Fuori dai criteri d'accettazione della scheda B36; limite dichiarato (si ritira e si rifà l'offerta; la riga mostra quantità, peso, cariche e collocazione).                                                                                                                                                                                                                                                                                                                              |
| 11  | P3, altra area | Dopo «Cambia set» la casella 3 della barra rapida (B quickbar) mostra l'id grezzo «quarterstaff» barrato invece di «Bastone ferrato»: `slotName` ricade su `actionId` quando l'azione non è più elencata.                                                                                                                                         | **Segnalato**, non corretto (file di un'altra area).                                                                                                                                                                                                                                                                                                                                                                                                                                                        |

Non difetti, con motivo:

- **Il DM sposta direttamente dalla scheda di Livia a Doran.** Il destinatario è giocato solo
  dal DM; togliere un oggetto a una scheda della campagna resta autorità del DM (registrato
  nei movimenti con «DM»). I-071 lascia il DM tra i confini da approfondire.
- **«Equipaggia» anche su cassa, corda, razioni.** Era già così nel core (tutti i non
  consumabili) e in D&D Beyond ogni oggetto ha il suo interruttore.
- **Bacchetta e bastone si usano senza equipaggiarli.** Lo SRD dice «mentre lo impugni», ma
  estrarlo è l'interazione gratuita del turno; DDB, dnd5e e le bacchette di BG3 non lo
  bloccano. Bloccarlo avrebbe rotto B38 (incantesimi dagli oggetti, che usa lo stesso
  motore) senza un conteggio delle mani coerente: il dialogo ora lo dice.
- **Doran non cambia set con lo scudo imbracciato.** BG3 terrebbe lo scudo nel set da mischia;
  qui un solo oggetto per set (limite dichiarato) e lo scudo richiede l'azione Utilizzo, quindi
  il rifiuto spiegato è la regola 2024, non un'invenzione.
- **Dadi fisici e digitali** nei dialoghi di ricarica, ultima carica e attività usano `rollDie`
  del core e l'evento `roll-accepted` (nessun secondo motore), come la pozione del core.

### File toccati in questa revisione

- `design/blueprint/inventory-plus-domain.mjs` — `containerContents`, confronto del contenuto
  in `offerProblems`, `isDirectTransfer`, `canAnswerOffer`, `canWithdrawOffer`,
  `heavyRollReasons`, `combatEquipNote`, `longRangeMeters`, ordine ultima carica/alba, rifiuto
  di nascondere un contenitore pieno, fonti `heavy` e `range`.
- `design/blueprint/inventory-plus.mjs` — offerte con contenuto, etichette «diretto/offerta»,
  Accetta/Ritira/campana per chi può rispondere, focus dopo i dialoghi e nell'ispettore, nota
  di combattimento, nota «impugnato», registrazione di `provideRollReasons`.
- `design/blueprint/tests/inventory-plus.test.mjs` — 5 test nuovi (21 in tutto).
- `changes/interview-01/blueprint-checks/inventory-plus-review-journey.js` — percorso della
  revisione.

### Comandi e risultati

```sh
node --test design/blueprint/tests/inventory-plus.test.mjs      # 21/21 (4 nuovi falliti prima)
node --test design/blueprint/tests/*.test.mjs                    # 2009/2009
# (una prima esecuzione aveva 3 errori in tests/dice-tray*.test.mjs, area in modifica in
#  parallelo; rieseguita: tutto verde)
cd /Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B36-rf
playwright-cli -s=d20-b36-rf open http://127.0.0.1:8879/
playwright-cli -s=d20-b36-rf --raw run-code \
  --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/inventory-plus-review-journey.js
# 6/6, errors [] (journey-review-result.json)
playwright-cli -s=d20-b36-rf --raw run-code --filename=<copia di inventory-plus-journey.js con
  le immagini in B36-rf/journey/>
# 18/18, errors [] dopo le correzioni (journey-builder-rerun.json)
```

Schermate: `rf-02`/`rf-03` inventario IT 1440, `rf-05`–`rf-07` Tavolo (ispettore, cambio
set, anteprima dell'arco), `rf-08`/`rf-09` telefono IT, `rf-10` il DM attende il giocatore,
`rf-11`/`rf-12` offerta con contenuto e contenuto cambiato, `rf-13` gittata 24/96 m, `rf-14`
telefono EN con l'offerta.
