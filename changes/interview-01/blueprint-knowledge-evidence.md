# B46 — Conoscenza, esame, furtività e copertura: prove

24/09/2026 (cartella delle prove datata 2026-09-25 come indicato dal compito). Worktree
`d20-studio-interview-01`, ramo `codex/interview-01`, lavoro non committato. Area costruita
tramite il registro (B11); **due aggiunte piccole e additive** in file condivisi (sezione
«File condivisi toccati»), senza cambiare firme né comportamenti esistenti.

## File

Nuovi (tutti di B46):

- `design/blueprint/knowledge.mjs` — modulo d'ingresso `register(registry)` e interfaccia:
  sezioni di stato `knowledge` (Undo a istantanea) e `knowledge-rolls` (`undo: "preserve"`,
  prove dei dadi); riquadro «Conoscenza e furtività» nella scheda **Creatura** (inspector);
  sette voci del **menu della pedina** (B12); strumento **Linea di vista** nel gruppo Misura
  della barra a sinistra; due livelli della mappa (aree di vista dei nemici sotto le pedine;
  linee, scudi di copertura, modificatori sotto il bersaglio e segni «nascosta» sopra);
  impostazione di campagna **Conoscenza e probabilità (divulgazione)** (Preferenze, solo DM);
  notifiche (B24); due comandi della palette (B23); proiezione del nome vero per il DM;
  Maiusc tenuto premuto sulla mappa per le aree di vista (BG3).
- `design/blueprint/knowledge-domain.mjs` — dominio puro: bestiario graduato, Studio,
  concessioni e correzioni del DM, identità nascosta, Nascondersi/Cercare, perdite spiegate,
  copertura per il combattimento, probabilità di colpire, borseggio, verifiche condivise.
- `design/blueprint/cover.mjs` — geometria pura della copertura e delle aree di vista.
- `design/blueprint/knowledge.css` — stili `.knowledge-*` collegati con `registerStyles`.
- `design/blueprint/tests/knowledge.test.mjs` (16 test), `tests/cover.test.mjs` (8 test).
- `changes/interview-01/blueprint-checks/knowledge-journey.js` — percorso nel browser.

Differenze rispetto alla scheda: il percorso si chiama `knowledge-journey.js` (nome dato dal
compito) invece di `knowledge-cover-journey.js`; `tests/cover.test.mjs` c'è come previsto;
la copertura non è in `table-spatial.mjs` ma in `cover.mjs` (nuovo) e arriva al combattimento
con un aggancio in `combat.mjs` (sotto): così il calcolo vale sia per l'anteprima sia per la
risoluzione dell'attacco. `extensions.mjs` elencava già `knowledge`.

Moduli esistenti importati in sola lettura (funzioni pure): `spatial.mjs` (muri, porte,
linea di vista), `fog-vision-domain.mjs` e `fog-vision.mjs` (`model`: luce, scurovisione e
nebbia di B35), `conditions.mjs` (`applyConditionEvent` per Invisibile), `travel-domain.mjs`
(`checkProfile`, `passiveScore`: bonus delle prove e Percezione passiva, come B45),
`party-stash.mjs` (`giveItemToActor`/`takeItemFromActor`: righe d'inventario del Bottino B26),
`srd-sample.mjs` (blocchi SRD, etichette, fonti), `combat.mjs` (`listActions`, l'aggancio),
`combat-ui.mjs` (`hasCombatPreview`), `character-access.mjs`, `character-rules.mjs`,
`forms-companions.mjs`, `state.mjs` (`rollDie`, lo stesso generatore dei dadi digitali).

## File condivisi toccati (aggiunte)

1. `design/blueprint/combat.mjs` — **aggancio `addAttackModifierProvider(provider)`**
   (blocco nuovo dopo `provideRollReasons` di B40) e due chiamate:
   - `previewAction`, nel blocco dell'attacco a un bersaglio: le righe dei fornitori si
     aggiungono a `result.rollReasons` (modi nuovi `target-ac` e `info`, che non toccano il
     calcolo del vantaggio: `rollModeFor` legge `rollReasonsFor`, non `result.rollReasons`);
     una riga con `blocksTargeting` (copertura totale) aggiunge il motivo `total-cover`.
   - `makeTarget`, per gli attacchi: somma gli `acBonus` dei fornitori a `targetAC` (misurati
     sulla geometria completa del DM) e li conserva in `acModifiers`.
     Senza fornitori registrati (ogni test di altre aree) nulla cambia: `targetAC = target.ac`.
     Serviva perché «+2 CA nel dettaglio dell'attacco» deve valere anche quando il tiro si
     risolve: mostrarlo solo in un pannello avrebbe dato un +2 finto.
2. `design/blueprint/combat-ui.mjs` — `rollReasonRows`: le righe `target-ac` si leggono
   «CA del bersaglio +2: Mezza copertura · SRD 5.2.1 p. 16», le righe `info` senza prefisso;
   Vantaggio/Svantaggio restano identici.

Seam nuovo nel mio dominio (non condiviso): `addVisibilityFilter` in `knowledge-domain.mjs`,
usato da `knowledge.mjs` per rispettare la nebbia e la visione di B35 (un giocatore non
riceve nulla su una creatura che non vede).

## Dove si trova (≤ 2–3 clic)

| Contesto                                                           | Percorso                                                                                                                                                                                                                            | Chi                                                                                                     |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Menu della pedina (B12) su una creatura del DM                     | clic destro / pressione lunga › **Esamina**                                                                                                                                                                                         | tutti (creature visibili)                                                                               |
| Menu della pedina                                                  | **Nascondi identità…** / **Rivela identità**                                                                                                                                                                                        | DM                                                                                                      |
| Menu della pedina su una propria creatura                          | **Nasconditi…**, **Smetti di nasconderti**, **Cerca…**                                                                                                                                                                              | chi la controlla                                                                                        |
| Menu della pedina su una creatura accanto a un proprio personaggio | **Borseggia…**                                                                                                                                                                                                                      | giocatore (o DM con Doran)                                                                              |
| Scheda **Creatura** della barra destra, propria creatura           | blocco **Furtività**: stato, oscurità, chi ti vede, Nasconditi, Cerca, Chi può vedere                                                                                                                                               | chi la controlla; DM con «Percezione passiva · la nota», «Trovata da…», «Termina», «Mantieni nascosta…» |
| Scheda Creatura, creatura del DM                                   | blocco **Conoscenza** (livello, Esamina, Studia; DM: identità) e **Modificatori contro questo bersaglio** (Da…, Verifica la linea di vista, Borseggia)                                                                              | tutti; DM                                                                                               |
| Scheda Creatura (DM)                                               | blocco **Borseggi**: Decidi…, Se ne accorge / Non se ne accorge, Annulla con motivo…                                                                                                                                                | DM                                                                                                      |
| Barra a sinistra › gruppo **Misura**                               | strumento **Linea di vista**: trascina da una pedina o un punto al bersaglio                                                                                                                                                        | tutti                                                                                                   |
| Mappa                                                              | Maiusc tenuto premuto: aree di vista dei nemici; trascinando una propria pedina (o in Pianifica): scudo di copertura sotto il puntatore; passando su un bersaglio con la propria creatura selezionata: modificatori sotto la pedina | tutti                                                                                                   |
| Barra delle azioni › un attacco › passa sul bersaglio              | dettaglio dell'attacco: «CA del bersaglio +2…», «Probabilità di colpire: N%» se la politica lo consente                                                                                                                             | chi attacca                                                                                             |
| Intestazione › Preferenze                                          | **Conoscenza e probabilità (divulgazione)**: bestiario graduato/tutto sbloccato; % mai / se la CA è nota / sempre                                                                                                                   | DM                                                                                                      |
| Campanella (B24)                                                   | «Livia vuole borseggiare Sentinella», «Il DM consente…», «… non è più nascosta»                                                                                                                                                     | per ruolo                                                                                               |

Nessuna scheda nuova nella barra laterale, nessun pulsante nell'intestazione.

## Tabella delle capacità

| Capacità (censimento)                                            | Percorso nell'app                                                                                                | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Regola / fonte                                                                                                                                                                | Modello adottato                                                                                              | Prova                                                                   |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| **TV-140** Conoscenza graduata ed Esamina                        | Menu della pedina › Esamina; Scheda Creatura › Conoscenza                                                        | Livello 1/4 alla prima vista (nome, taglia, tipo); i livelli 2–4 sono «Da scoprire: …» senza valori; **Studia** (prova di Intelligenza con l'abilità del tipo: Arcano per i Folletti) contro CD 10 + GS: successo → +1 per tutto il gruppo; fallimento → quel personaggio non ritenta allo stesso livello finché il DM non lo consente; il DM concede qualsiasi livello, lo abbassa solo con un motivo (correzione visibile ai giocatori); opzione di campagna «tutto sbloccato». In combattimento Studio è l'azione del turno. Undo toglie il livello, il dado resta tra le prove; un ritiro digitale riusa le facce annullate (I-229).                                                                                                                                                                                                                                             | SRD 5.2.1 «Study [Action]» EN 189 / IT 216 (Areas of Knowledge); CD 10 + GS e livelli 1–4 sono regole dell'app con propria fonte (`b46-lore-dc-v1`, `b46-knowledge-tiers-v1`) | Solasta bestiario a livelli (CRP-135), Pathfinder WotR conoscenza del gruppo (CRP-136), BG3 Examine (CRP-134) | test (1)×4; percorso 1a, 1b; `b46-01`, `b46-02`, `b46-13`               |
| **TV-141** Identità nascosta dei PNG                             | Menu della pedina › Nascondi identità… (DM)                                                                      | Il nome condiviso diventa «Figura incappucciata» (predefinito, modificabile, unico): mappa, registro e chat (provati nel browser) e ordine d'iniziativa (stesso nome condiviso, provato solo nel test) lo usano per tutti; al DM la proiezione aggiunge «· Esploratore» fuori dalla mappa; l'Esame del giocatore dice «Identità sconosciuta» e non rivela il profilo; Studio rifiutato; **Rivela identità** ripristina il nome; Undo lo rimette. Rifiutato se il nome è già nascosto dal menu (B12).                                                                                                                                                                                                                                                                                                                                                                                 | Nessuna regola SRD: strumento del DM (fonte `manual` nel registro)                                                                                                            | Fantasy Grounds ID/non-ID name (R20-155), Foundry Anonymous (FVT-126), Beyond20 (VTL-223)                     | test (2); percorso 2, 2b; `b46-03`, `b46-04`                            |
| **TV-139** Furtività: nascondersi e chi ti vede                  | Scheda Creatura › Furtività; menu › Nasconditi…                                                                  | Idoneità: area pesantemente oscurata (Oscurità da B35) **oppure** copertura ¾/totale da ogni nemico, **e** nessun nemico che ti vede (luce, scurovisione, muri di B35). Il giocatore vede solo i nemici che vede; il DM tutti, con «Percezione passiva N · la nota / non la nota» contro il totale e «Trovata da …». Prova DC 15 → condizione Invisibile (tramite `conditions.mjs`), totale = CD per trovarla. Perdita **spiegata** nel riquadro, nel registro e nella campanella: tiro per colpire, incantesimo con componente V, dialogo non sussurrato in chat, trovata (Cercare o DM), scelta, Invisibile rimossa. Il DM può consentire comunque (motivo) e **Mantieni nascosta…** (correzione con motivo). Cercare: Percezione contro il totale, non oltre copertura totale. Una creatura del DM si nasconde in segreto (tiro e Invisibile privati; nessun segno ai giocatori). | SRD «Hide [Action]» EN 183 / IT 210, «Invisible» EN 184 / IT 209, «Heavily Obscured» EN 11, 182 / IT 12, 211, «Search» EN 187 / IT 212, «Passive Perception» EN 186 / IT 211  | BG3 coni di vista e perdita spiegata (CRP-144), stati di oscurità (CRP-145)                                   | test (3)×3 e «in initiative…»; percorso 3; `b46-05`, `b46-06`, `b46-14` |
| **TV-43** Copertura alla destinazione                            | Trascinando una propria pedina (o in Pianifica)                                                                  | Sotto il puntatore «Copertura qui» con una riga per nemico visibile: ¾, ■, ½ o «scoperta». Dopo il rilascio la scheda Creatura elenca la copertura contro ogni nemico.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | SRD «Cover» EN 15 / IT 16; misura a nove punti dichiarata (`b46-cover-nine-points-v1`)                                                                                        | XCOM 2 scudi alla destinazione (CRP-116), adattato a ½, ¾ e totale                                            | test (5), cover.test; percorso 4a; `b46-07`                             |
| **TV-43/TV-75** +2 CA nel dettaglio dell'attacco                 | Barra delle azioni › Dardo di fuoco › passa su Esploratore                                                       | «CA del bersaglio +2: Mezza copertura · SRD 5.2.1 p. 16»; la risoluzione usa CA 12 + 2 = 14; copertura totale → «Copertura totale: il bersaglio non può essere preso di mira direttamente» e l'attacco non parte.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SRD «Cover» EN 15 / IT 16 (un'altra creatura dà al massimo mezza copertura)                                                                                                   | BG3 modificatori sotto il bersaglio (CRP-119)                                                                 | test (4); percorso 4b; `b46-08`                                         |
| **TV-75** Modificatori sotto il bersaglio                        | Propria creatura selezionata, puntatore su un'altra                                                              | Etichetta sotto la pedina: copertura con CA, «Non ti vede · vantaggio», «Non lo vedi · svantaggio»; stesse righe nel blocco «Modificatori contro questo bersaglio» (con «Da…» per scegliere la propria creatura).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | SRD «Unseen Attackers and Targets» EN 14 / IT 16; «Cover»                                                                                                                     | BG3 (CRP-119)                                                                                                 | test (6); percorso 4b; `b46-08`, `b46-09`                               |
| **TV-76** Probabilità di colpire solo se la politica lo consente | Preferenze › Conoscenza e probabilità (DM)                                                                       | Predefinito «Mai (rivelerebbe la CA)»; «Solo se il gruppo conosce la CA (livello 2/4)»; «Sempre (come BG3)». Il DM la vede sempre. La % considera vantaggio/svantaggio, 20 naturale sempre a segno, 1 sempre mancato, la copertura.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Scelta di censimento C9; SRD per i tiri per colpire                                                                                                                           | BG3 % al passaggio (CRP-126), XCOM anteprima (CRP-128), Solasta (CRP-127)                                     | test (6); percorso 4b/6; `b46-09`                                       |
| **TV-44** Linea di vista privata o pubblica                      | Barra a sinistra › Misura › Linea di vista; oppure «Verifica la linea di vista» nella scheda Creatura (tastiera) | Linee dal miglior angolo di chi guarda ai nove punti del bersaglio: bianche libere, gialle attraverso creature, rosse bloccate; risultato «Mezza copertura · 9 linee: 9 attraverso creature». Privata: solo in questa vista (cambio di ruolo la cancella). **Mostra a tutti**: condivisa sulla mappa e nella scheda Creatura di tutti (se vedono entrambi gli estremi), tolta dall'autore o dal DM. Esc cancella. Le pareti segrete non contano per il giocatore.                                                                                                                                                                                                                                                                                                                                                                                                                    | SRD «Cover» EN 15 / IT 16                                                                                                                                                     | Owlbear Peekaboo (VTL-138)                                                                                    | test (5), cover.test; percorso 5; `b46-10`, `b46-11`                    |
| **TV-142** Borseggio con decisione del DM                        | Menu › Borseggia… (personaggio adiacente, anche in diagonale)                                                    | Richiesta (prendere «la chiave» o infilare un proprio oggetto) → campanella del DM → **Decidi…**: CD (proposta: Percezione passiva del bersaglio), che cosa è a portata (un suo oggetto, un oggetto descritto, «niente del genere» senza tiro) o rifiuto con motivo → il giocatore tira Destrezza (Rapidità di Mano) fisico/digitale senza conoscere la CD → successo: l'oggetto passa nell'inventario (scheda); fallimento: il DM decide se se ne accorge; **Annulla con motivo…** rimette l'oggetto.                                                                                                                                                                                                                                                                                                                                                                               | SRD Rapidità di Mano EN 9 / IT 10; flusso dell'app (`b46-pickpocket-v1`)                                                                                                      | BG3 borseggio e borseggio inverso (CRP-151)                                                                   | test (7), UI pickpocket; percorso 7; `b46-12`                           |

## Comandi eseguiti e risultati

```sh
node --test design/blueprint/tests/knowledge.test.mjs design/blueprint/tests/cover.test.mjs
# 24 test, 24 superati
node --test design/blueprint/tests/*.test.mjs
# 1952 test: 1946 superati, 6 falliti in regions.test.mjs e damage-tray.test.mjs
# (test «review …» di aree in lavorazione parallela, non legati a questa area: ogni file
# gira nel proprio processo e senza il fornitore di B46 l'aggancio di combat.mjs non cambia
# nulla). Un giro precedente aveva invece 2 fallimenti in relations-graph.test.mjs: i file in
# errore cambiano tra i giri.
node .../prettier.cjs --write <file di B46>
```

Browser (Chromium, `playwright-cli -s=d20-b46`, cartella
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B46/`):

```sh
playwright-cli -s=d20-b46 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/knowledge-journey.js
# {"passed":[10 passi], "errors":[]} — eseguito tre volte di fila con lo stesso esito
```

Passi provati con clic, tasti, trascinamenti e tocchi veri (gruppo 1 IT desktop 1440 con
giocatore e DM; gruppo 2 contesto isolato EN telefono 390 con tocco):

1. **1a** Esamina 1/4 senza valori bloccati nel DOM; Studia fisico 9 + 3 = 12 → 2/4; Annulla
   ultima modifica toglie il livello e lascia il dado; nuovo Studio dalla scheda Creatura;
   dopo il ricaricamento Esploratore mostra 2/4 con la sua CA 12; Invio apre, Esc chiude.
2. **1b** DM: badge per livello, CD proposta, concede 4/4, abbassare senza motivo rifiutato
   nella finestra, con motivo registrato come correzione; il giocatore legge il livello 3 e il
   motivo, mai la CD.
3. **2** Identità nascosta, il DM parla come «Figura incappucciata» in chat e legge «· Esploratore»;
   il testo di tutta la pagina del giocatore non contiene «Esploratore».
4. **3** Torre della lanterna: nebbia di B35 rispettata, Nasconditi 17, Invisibile, persistenza al
   ricaricamento, consapevolezza solo al DM, dialogo in chat → perdita spiegata con fonte SRD,
   «Mantieni nascosta…» con motivo.
5. **4a** Porta aperta dal DM; trascinamento con scudo «¾» sotto il puntatore; dopo il rilascio
   «Copertura dei tre quarti».
6. **4b/6** Mezza copertura da Sentinella: «CA del bersaglio +2…» nel dettaglio e sotto il
   bersaglio, nessuna % con la politica «Mai»; «Sempre» → «Probabilità di colpire: 60%».
7. **5** Linea di vista privata (il DM non la vede), poi «Mostra a tutti», vista e tolta dal DM.
8. **7** Borseggio completo fino alla chiave nell'inventario e alla correzione del DM.
9. **2b** Rivela identità.
10. **Telefono EN 390**: pressione lunga › Examine, Study 2/4 con persistenza, blocco Stealth con
    «Hide…» disattivato e motivi, pulsanti ≥ 40 px, nessuno scorrimento orizzontale.

Schermate 1440×900 (tutte controllate a vista): `b46-01-examine-level1-player-it-1440.png`,
`b46-02-examine-level2-pooled-it-1440.png`, `b46-03-identity-dm-log-it-1440.png`,
`b46-04-identity-player-examine-it-1440.png`, `b46-05-hidden-dm-awareness-it-1440.png`,
`b46-06-loss-explained-player-it-1440.png`, `b46-07-cover-destination-drag-dm-it-1440.png`,
`b46-08-attack-detail-cover-player-it-1440.png`, `b46-09-hit-chance-policy-always-it-1440.png`,
`b46-10-los-private-player-it-1440.png`, `b46-11-los-public-dm-it-1440.png`,
`b46-12-pickpocket-inventory-player-it-1440.png`; telefono: `b46-13-examine-phone-en-390.png`,
`b46-14-stealth-phone-en-390.png`.

## Coerenza con il resto dell'app

- Stessi attori e dati: i goblin «Sentinella» ed «Esploratore» sono collegati al blocco SRD
  Goblin guerriero (EN 290 / IT 340) solo per tipo, tratti e azioni; CA, caratteristiche,
  velocità e Percezione passiva vengono dalla loro scheda viva (CA 13 e 12), le stesse che
  usa il combattimento. «Figura incappucciata» è l'Esploratore (le figure incappucciate
  dell'incontro «Chi ha riacceso la lanterna»); la chiave rubata è la «Chiave di ottone della
  torre» del tesoro di quell'incontro.
- La condizione Invisibile passa da `conditions.mjs`: il combattimento dà già vantaggio a chi
  è nascosto e svantaggio a chi lo attacca; il badge della pedina la conta.
- Le perdite si registrano dopo il comando che le causa (un microtask), in un commit proprio:
  l'attacco che rompe il nascondersi è ancora tirato da Invisibile, come vuole la regola.
- I tiri stanno nel registro della voce che li accetta e sono annunciati con `roll-accepted`
  (dadi animati B56, chat B17), come le altre aree con dadi propri.

## Limiti onesti

- La misura della copertura (nove punti, miglior angolo) è un adattamento dichiarato: l'SRD
  2024 non dà una procedura su griglia. Le creature danno mezza copertura se il loro spazio
  taglia la linea tra i centri. Il DM resta arbitro ma non c'è un comando per imporre un
  grado diverso a un singolo attacco.
- La copertura entra nel combattimento solo per i **tiri per colpire** (CA). Il +2/+5 ai tiri
  salvezza su Destrezza (Mani brucianti) non è collegato. Per un attacco con avvicinamento la
  copertura della risoluzione si misura dalla posizione di partenza.
- Le aree di vista (Maiusc / «Chi può vedere») seguono solo i muri; luce e scurovisione sono
  valutate sul punto della propria creatura nel blocco Furtività, non disegnate sull'area.
- La probabilità di colpire replica la formula del bonus d'attacco di `initializeAttack`; un
  test la confronta con il modificatore reale della richiesta, ma un'arma di un'area futura
  con regole diverse potrebbe richiedere un aggiornamento.
- Il testo «Coperture parziali … devono ancora essere collegati» nella finestra «Regola e
  calcolo» di `combat-ui.mjs` resta: non l'ho riscritto (file condiviso); con B46 caricata la
  copertura per i tiri per colpire è collegata.
- Tenere premuto Maiusc mostra le aree anche durante Maiusc+clic della selezione multipla
  (come in BG3). La proiezione del nome vero per il DM non tocca la mappa (come B12).
- Il nome non identificato è un testo del DM (non ha traduzione automatica); il registro già
  scritto prima di nascondere l'identità conserva ciò che diceva allora.
- Una creatura del DM nascosta resta visibile come pedina finché il DM non la nasconde dal
  menu della pedina (il blocco Furtività lo ricorda).
- Nessuna sicurezza reale: identità e segreti sono proiezioni locali della dimostrazione a
  due ruoli nello stesso browser.

## Review and fixes — revisione indipendente (B46-rf, 24/09/2026)

Revisore-correttore diverso dal costruttore. Stesso worktree e ramo, lavoro non committato.
Sessione del browser `playwright-cli -s=d20-b46-rf`, cartella
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B46-rf/`.
Ho controllato la scheda B46 del censimento (TV-43, TV-44, TV-75, TV-76, TV-139…TV-142),
il funzionamento nell'app, i modelli di mercato citati, i ruoli, l'offline, l'Undo, IT/EN,
il telefono a 390 px, i test e la collocazione B61. Ogni correzione è partita da un test che
falliva (rosso visto prima della modifica).

### Difetti trovati e corretti

| #   | Gravità | Riproduzione (prima della correzione)                                                                                                                                                                                                                                  | Correzione                                                                                                                                                                                                                                                          | Prova                                      |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| F1  | P2      | Cortile in luce intensa; il DM nasconde ai giocatori le due pedine dei goblin (menu della pedina «Nascondi ai giocatori»). Livia › «Nasconditi…» 20 → nascosta con Invisibile, benché Sentinella la veda: l'SRD chiede di essere fuori dalla vista di **ogni** nemico. | `hide()` decide sulla vista completa del DM; al giocatore il rifiuto non nomina nessuno: «Qui non puoi nasconderti: secondo il DM non sei fuori dalla vista di ogni nemico.» Nessun dado speso. Il DM può ancora consentire con un motivo.                          | test `review: a player cannot hide…`; R1   |
| F2  | P2      | Il DM usa «Nascondi il nome ai giocatori» (B12, «Creatura sconosciuta 1»). L'Esame del giocatore mostrava «Creatura: Goblin guerriero · Folletto (goblinoide)», Studio consentito, % con la politica «se la CA è nota»: l'identità nascosta trapelava.                 | `unknownIdentity` vale anche per il nome nascosto da B12: «Identità sconosciuta», niente profilo, niente Studio, niente %. Al DM l'Esame dice «Nome nascosto dal menu della pedina: mostralo da lì» e il menu non offre un secondo «Nascondi identità…».            | test `review: a name hidden…`; R3          |
| F3  | P2      | Livia nascosta; si toglie Invisibile (o attacca). «Annulla ultima modifica» annullava solo la perdita: tornava «Nascosta» **senza** Invisibile (o con l'attacco ancora registrato) e la modifica successiva, anche estranea, la faceva perdere di nuovo.               | La perdita è la conseguenza del comando che la causa, non un passo di Undo proprio (`undoable: false`): un solo Undo annulla causa e perdita insieme; la riga spiegata resta nello storico del registro.                                                            | test `review: one Undo…`; R6               |
| F4  | P2      | Il DM nasconde l'Esploratore in segreto (tiro e Invisibile privati) e poi «Termina (motivo)…» o la creatura attacca: «Non più nascosta: Esploratore…» finiva nel registro condiviso, così i giocatori scoprivano che si era nascosta.                                  | Perdita automatica, «Termina», «Smetti di nasconderti», «Ho fatto rumore» e «Mantieni nascosta…» di una creatura nascosta in segreto vanno nel registro privato del DM. «Trovata da <personaggio>» e un Cercare riuscito restano condivisi: il gruppo l'ha trovata. | test `review: a DM creature's secret…`; R5 |
| F5  | P3      | Sentinella Prona: l'Esame mostrava «Piccola · prone» (id grezzo) in IT e in EN; lo stesso per le immunità alle condizioni del livello 4.                                                                                                                               | Nomi delle condizioni dal catalogo di `conditions.mjs`, nella lingua di chi guarda: «Piccola · Prono», «Small · Prone».                                                                                                                                             | test `review: Examine names…`; R2, R8      |
| F6  | P3      | Il livello 3/4 promette «tiri salvezza» ma non li mostrava.                                                                                                                                                                                                            | Riga «Tiri salvezza» dalla scheda viva (`checkProfile` di B45, come le prove): per Sentinella «Des +2». I giocatori al livello 1 non la ricevono.                                                                                                                   | test `review: Examine names…`              |
| F7  | P3      | Borseggio «Gli infilo un mio oggetto» con Livia e Mira accanto al bersaglio: l'elenco mostrava sempre gli oggetti del primo ladro; scegliendo Mira, un oggetto di Livia veniva rifiutato. Un ladro senza oggetti poteva scegliere «infilare».                          | Cambiare «Chi borseggia» riapre la finestra con gli oggetti di quel personaggio (come «Chi studia» dello Studio); «infilare» è disattivato con «nessun oggetto da infilare».                                                                                        | test `review: the pickpocket…`; R4         |
| F8  | P3      | Dopo uno Studio fallito, «Studia (Arcano)…» apriva una finestra con «Tira e studia» che poteva solo fallire (pulsante finto).                                                                                                                                          | Se le regole lo vietano, la finestra mostra il motivo e «Chiudi», senza dadi; «Chi studia» resta per far provare un altro personaggio.                                                                                                                              | test `review: Study shows…`; R7            |
| F9  | P3      | «Cerca…»: l'esclusione di chi sta dietro copertura totale era scritta accanto alla citazione SRD, ma è una regola dell'app (mai inventare una citazione SRD).                                                                                                          | Frase SRD separata; sotto «Regola dell'app: chi è dietro copertura totale non si trova con Cercare; il DM può comunque segnarlo «Trovata da…»» (EN «App rule: …»).                                                                                                  | test `review: Study shows…`; R7, R8        |

In più un test sull'offline (`review: offline…`): pulsante del pannello → avviso «Sei senza
rete»; finestra → errore nella finestra; controllo automatico delle perdite → attende la
rete; nessuna modifica dello stato.

### Rilievi aperti (non corretti qui, con il motivo)

- **O1 (P3, collocazione).** Nascondersi, Cercare e Studiare sono azioni SRD ma stanno nel menu
  della pedina e nella scheda Creatura, non nella barra delle azioni in basso dove BG3 e Solasta
  mettono Nascondersi. Il contratto B61 (§5.1 del piano del registro) dice che le aree non
  aggiungono pulsanti alla barra in basso finché la barra rapida non ha un proprio punto; il
  percorso esistente (`registerActionProvider` + `resolveAttemptKind` di `combat.mjs`) chiede un
  tipo di tentativo nuovo per ciascuna azione. Decisione del coordinatore.
- **O2 (P3, tra aree).** Nel menu della pedina ci sono due comandi per lo stesso modello TV-141:
  «Nascondi il nome ai giocatori» (B12, nome automatico) e «Nascondi identità…» (B46, nome
  scelto). Ora B46 rispetta il nome nascosto da B12 (F2) e non offre il proprio comando sopra;
  B12 invece offre ancora il suo sopra un nome di B46 (per il DM «Creatura sconosciuta 1 · Figura
  incappucciata»). Proposta: un solo comando come l'ID di Fantasy Grounds, con nome
  personalizzabile, in `token-menu.mjs` (file di B12).
- **O3 (P3, tra aree).** Due «Cerca»: quello di B46 (creature nascoste) e quello delle trappole e
  degli oggetti («Cerca trappole», riga «Saggezza (Percezione) entro 4,5 m» nella scheda
  Creatura). L'azione SRD Search è una sola per entrambi; serve un'unione coordinata.
- **O4 (P3, testo condiviso).** `combat-ui.mjs` riga 512, finestra «Regola e calcolo»: «Coperture
  parziali … devono ancora essere collegati» non è più vero per i tiri per colpire. Testo del
  proprietario del combattimento.
- **O5 (limiti già dichiarati dal costruttore, confermati).** La copertura non entra nei tiri
  salvezza su Destrezza; un attacco con avvicinamento misura la copertura dalla partenza; le
  aree di vista seguono solo i muri. **Non difetto:** il titolo di TV-43 cita anche il
  fiancheggiamento, che non è nell'SRD 5.2.1 (regola facoltativa della Guida del DM); il criterio
  (4) chiede solo la copertura.

### Verificato senza difetti

- Collocazione B61: nessuna scheda nuova nella barra laterale, nessun pulsante nell'intestazione;
  «Linea di vista» nel gruppo Misura; blocchi nella scheda Creatura; comandi sulla pedina nel menu
  della pedina; politica di divulgazione tra le impostazioni di campagna del registro (Preferenze,
  come le impostazioni di mondo di Foundry); richieste nella campanella.
- Modelli: bestiario a livelli di Solasta, conoscenza condivisa di WotR (con l'azione Studio del
  2024 al posto del controllo automatico), Esame, Maiusc per le aree di vista, modificatori e % di
  BG3, ID di Fantasy Grounds/Anonymous, scudi di XCOM, linee e verifica pubblica di Peekaboo,
  borseggio di BG3 deciso dal DM: corrispondono alle fonti citate.
- Aggiunte condivise del costruttore (`combat.mjs` `addAttackModifierProvider` e CA in
  `makeTarget`, `combat-ui.mjs` `rollReasonRows`): additive, senza fornitori nulla cambia; suite
  completa verde.
- Nessun accumulo di ascoltatori: la mappa SVG è ricreata a ogni render (verificato nel browser).
- Proiezioni del giocatore senza CD, valori bloccati o Percezione passiva (test esistenti).

### File toccati dalla revisione

- `design/blueprint/knowledge-domain.mjs`: F1, F2 (`unknownIdentity`, importa in sola lettura
  `hiddenName` da `token-menu.mjs`), F4 (`hiddenInSecret`, `lossInSecret`), F5, F6.
- `design/blueprint/knowledge.mjs`: F2 (UI del DM e menu), F3 e F4 (`runLossCheck`, opzioni
  private), F5, F7, F8, F9.
- `design/blueprint/tests/knowledge.test.mjs`: 8 test nuovi (ora 24; `cover.test.mjs` 8).
- Nuovo `changes/interview-01/blueprint-checks/knowledge-review-journey.js` (senza punto e
  virgola finale, come chiede il README dei controlli).
- Nessun file condiviso modificato. `cover.mjs` e `knowledge.css` invariati.

### Comandi e risultati

```sh
node --test design/blueprint/tests/knowledge.test.mjs design/blueprint/tests/cover.test.mjs
# 32 test, 32 superati (i 9 difetti sopra: rossi prima della correzione, verdi dopo)
node --test design/blueprint/tests/*.test.mjs
# 2021 test, 2021 superati (un giro intermedio aveva 1 fallimento transitorio in
# dice-tray-review.test.mjs, area in revisione in parallelo: superato al giro successivo)
node .../prettier.cjs --check <file di B46>   # tutti formattati
playwright-cli -s=d20-b46-rf --raw run-code --filename=.../knowledge-journey.js
# copia che scrive le immagini in B46-rf/journey/: 10 passi superati, nessun errore di pagina,
# prima e dopo le correzioni (nessuna regressione)
playwright-cli -s=d20-b46-rf --raw run-code --filename=.../knowledge-review-journey.js
# {"passed": [R1…R8], "errors": []}
```

Passi del percorso di revisione (clic, tasti, trascinamenti e tocchi veri; IT 1440 giocatore e
DM; R8 contesto isolato EN telefono 390 con tocco): R1 rifiuto senza nomi con le pedine nascoste
dal DM, il DM legge «Sentinella · ti vede»; R2 «Piccola · Prono»; R3 nome nascosto da B12 →
«Identità sconosciuta», nessun «Goblin»; R4 elenco degli oggetti di Mira dopo il cambio di
ladro; R5 fine di un nascondersi segreto assente dal Registro del giocatore; R6 un solo Undo
riporta Invisibile e «Nascosta · CD per trovarla 20», nessuna perdita tardiva dopo uno
spostamento; R7 Studio bloccato senza dadi, «Regola dell'app» in Cercare; R8 «Small · Prone» e
«App rule: …» sul telefono, pulsanti ≥ 40 px, nessuno scorrimento orizzontale.

Schermate (controllate a vista): `rf-10-hide-refused-unseen-watcher-player-it-1440.png`,
`rf-11-examine-condition-name-player-it-1440.png`,
`rf-12-examine-b12-hidden-name-player-it-1440.png`,
`rf-13-pickpocket-thief-items-player-it-1440.png`,
`rf-14-undo-cause-and-loss-player-it-1440.png`, `rf-15-study-blocked-no-roll-player-it-1440.png`,
`rf-16-examine-condition-phone-en-390.png`, `rf-17-search-app-rule-phone-en-390.png`.
