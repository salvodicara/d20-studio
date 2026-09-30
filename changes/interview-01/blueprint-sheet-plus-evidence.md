# B37 — Scheda: valori derivati, override motivati e comodità — evidenze

24/09/2026 (cartella delle immagini assegnata: `2026-09-25/B37`). Area `sheet-plus`, caricata dal
registro (`extensions.mjs` la elencava già). Dati sintetici; nessun servizio reale.

## Dove si trova (regola di posizionamento B61, struttura della scheda D&D Beyond)

Nessuna scheda nuova tra le 11 già presenti e nessun pulsante nuovo nelle intestazioni.

- **Barra della scheda** sotto i riquadri PF/CA/Movimento, uguale in ogni scheda della scheda
  (la riga sempre visibile di D&D Beyond e la barra laterale dnd5e): interruttore **Gioco /
  Modifica** (dnd5e FVT-008), livello e PE con «Gestisci PE» (DDB-024), valori derivati come
  pulsanti con suggerimento ricco (CA, Iniziativa, Competenza, Percezione passiva, Velocità,
  Difese; FVT-010) e, in Modifica, l'ingranaggio di Roll20 (R20-024); interruttori degli effetti
  sui tiri (Beyond20 VTL-013); striscia dei **preferiti** (dnd5e FVT-009); avvisi (livello
  disponibile, proposta del DM, valore da riallineare, scelta da rivedere dopo un riposo);
  «Annulla ultima modifica» dell'app con l'etichetta della modifica.
- **Azioni**: pannello «Tiri salvezza, sensi e abilità» (colonne di D&D Beyond: TS, sensi e
  passive, velocità, difese; abilità con preferite in alto e «Abilità aggiuntive», DDB-028–031)
  e pannello **Azioni** con i chip Tutte / Attacco / Azione / Azione bonus / Reazione / Altro /
  Usi limitati e le azioni generiche 2024 (DDB-039).
- **Storia**: sezione **Note** con chip Organizzazioni / Alleati / Nemici / Retroscena / Altro e
  «+ Aggiungi» per sezione (DDB-056).
- **Capacità**: «Scelte da rivedere dopo un riposo» (Shard VTL-017).
- **Tavolo**: nella scheda Creatura, riquadro «Velocità ed effetti» della creatura selezionata
  (velocità da usare, effetti attivi con il loro dado, difese, iniziativa e percezione passiva).
- Centro notifiche (B24): «Doran: rivedi Padronanza delle armi» dopo il riposo lungo.
  Palette (B23): «Scheda: passa da Gioco a Modifica». Preferenze: impostazione di dispositivo
  «Modalità della scheda».

Clic: Inizio → Personaggi → Apri scheda (2) per barra, valori e azioni; + Storia (3) per le note;
+ Capacità (3) per le scelte; Vai al Tavolo (1 dalla scheda) per il riquadro della creatura.

## File

Nuovi (solo miei): `design/blueprint/sheet-plus.mjs` (ingresso e interfaccia),
`design/blueprint/sheet-plus-domain.mjs` (dominio puro: regole, fonti, ordine di cumulo),
`design/blueprint/sheet-plus.css` (prefisso `shp-`: il prefisso `sp-` era già di sessions-plus),
`design/blueprint/tests/sheet-plus.test.mjs`,
`changes/interview-01/blueprint-checks/sheet-plus-journey.js`, questo rapporto.

Modifiche **aggiuntive** a file condivisi (firme ed esiti esistenti invariati; senza l'area il
markup e i valori sono identici):

1. `design/blueprint/characters.mjs`, `renderCharacters`: dopo `renderVitals` le `sheet-section`
   con la pseudo-scheda `"summary"` si rendono sotto i riquadri in ogni scheda (stesso schema
   della pseudo-scheda `"vitals"` di B33); il bind esistente le collega già.
2. `design/blueprint/characters.mjs`, `renderVitals`: il riquadro Movimento, quando la creatura si
   muove con un'altra velocità, dice «Velocità in uso · a piedi 9 m» invece di «Velocità base».
3. `design/blueprint/forms-companions.mjs`, `getEffectiveActor`: con `actor.movementMode`
   (`fly`, `swim`, `climb`, `burrow`) e una velocità finita in `speeds` (dell'attore o della
   forma), `speed` effettiva = quella velocità. Senza `movementMode` nulla cambia. Si compone con
   l'ingombro di B36 (`registerSpeedAdjuster`) e con le condizioni, che si applicano alla
   velocità in uso.

Nota: ho eseguito una volta Prettier anche su `characters.mjs` (solo formattazione; il file è
modificato in parallelo da altre aree).

## Dati e coerenza

- Sezione `state.ext["sheet-plus"]` (Undo a istantanea): per attore `mods` (modifiche motivate per
  valore), `applied` (base conservata per la scrittura), `defenses`, `speedDisplay`, `senses`,
  `customSkills`, `favorites`, `notes`, `effects`, `advancement`, `reselect`, `results`.
  Seme coerente: Doran, Guerriero 3, conserva le tre armi di **Padronanza delle armi** (Spada
  lunga, Ascia, Giavellotto) e può cambiarne una dopo ogni riposo lungo.
- Sezione `state.ext["sheet-plus-rolls"]` (Undo `preserve`): i tiri accettati sono prove
  immutabili; Annulla ritira il risultato e un nuovo tiro digitale identico riusa le facce una
  volta (I-229, come B54). La voce del registro porta il tiro e l'area emette `roll-accepted`
  (i dadi animati B56 lo mostrano).
- **Scritture sui campi canonici** che gli altri moduli leggono: `actor.ac` (combattimento),
  `actor.savingThrows[k]` (TS di area e concentrazione in `combat.mjs`, B34), `actor.skillModifiers`,
  `actor.damageDefenses.{resistances,immunities,vulnerabilities}` (stessa forma dei PNG di B19;
  il riquadro PF di B33 mostra «Resistenze: Fuoco, Freddo»), `actor.conditionImmunities` (il
  pannello condizioni rifiuta una condizione a cui si è immuni), `actor.speeds` e
  `actor.movementMode` (movimento del Tavolo), `actor.xp` (stesso campo di Bottino/Inizio: +300
  PE fa comparire anche la scheda «Sali di livello» di B30). Quando un altro comando cambia il
  campo dopo le modifiche (es. «Correggi valori»), la scheda lo dice e chiede **Riallinea**
  invece di sovrascrivere.
- Privacy: una scheda privata (Iria) scrive in locale (`{local, visibility: "private"}`) e i suoi
  tiri sono privati; il DM non la legge. Le note «Solo io» restano all'autore, DM compreso.
  Controllo per ruolo con `ctx.canControl` (rispetta la politica «Il DM può modificare questa
  scheda» di B20). Senza rete le modifiche condivise sono rifiutate come nel resto dell'app.
- Modalità Gioco/Modifica: impostazione di **dispositivo** (`localStorage`
  `d20-studio-setting:sheet-plus.mode`), mai nello stato di gioco.

## Capacità → prove

| Capacità (censimento) | Percorso | Comandi ed esito | Regola / fonte | Pattern adottato | Prova |
| --- | --- | --- | --- | --- | --- |
| PG-24 Gioco vs Modifica | Barra → Gioco / Modifica | Modifica: basi con ingranaggio, «Aggiungi abilità», «Gestisci sensi», rimozione preferiti; Gioco: totali, tiri, preferiti; reload conserva la scelta sul dispositivo | — | dnd5e Play/Edit (FVT-008); cursore Alchemy (VTL-026) | Journey B, `01-edit-mode-it.png`; test «acceptance 1 and 9» |
| PG-25 / PG-26 Valori derivati non scrivibili, override con nota, ordine di cumulo | Modifica → ingranaggio CA (anche Iniziativa, Percezione passiva, TS, abilità) | +1 «Bonus magico: Anello di protezione» → 13; «Imposta la base 13» appare prima della somma (12 → 13 → 14); motivo vuoto rifiutato; Togli → 13; Annulla dalla barra; riquadro CA del core e combattimento leggono 13 | CA senza armatura 10 + Des, SRD EN 22 / IT 25 | Ingranaggio Roll20 (R20-024) e Modifier Builder: base → somma → almeno/al massimo → moltiplica → sostituisci (R20-023); più basi, vale la migliore (FVT-016); componenti CA con nota DDB (DDB-029) | Journey C, `02-ac-chain-dialog-it.png`; test «stacking order», «acceptance 2», «drift» |
| PG-29 Difese con fonti e voci proprie | Barra → Difese (o «Gestisci difese») | Fuoco da «Protezione dall’energia» + Freddo personalizzato con asterisco + Fuoco da «Anello di resistenza» unito («voci unite: 2»); scritto in `damageDefenses`; immunità a condizioni in `conditionImmunities` | Resistenza EN 187 / IT 212, Immunità EN 183 / IT 208, Vulnerabilità EN 191 / IT 219 | Manage Defenses DDB (DDB-031) | Journey E, `04-defenses-dialog-it.png`; test «acceptance 3» |
| PG-30 Sensi e velocità, scelta di quello mostrato | «Gestisci velocità» / «Gestisci sensi»; Tavolo → Creatura → Muoviti | Volare 9 m, mostrata in alto; al Tavolo «Volare» imposta la velocità in uso; portata a 12 m il movimento del Tavolo legge 12 m; il cambio in combattimento sottrae la distanza già percorsa e si rifiuta se non resta movimento | Velocità EN 188 / IT 218; Velocità di volo EN 182 / IT 219 | Finestra velocità e sensi DDB (DDB-030) | Journey J, `09-table-fly-it.png`, `22-phone-table-fly-en.png`; test «acceptance 4» |
| PG-32 Abilità personalizzate e preferite in alto | Modifica → Aggiungi abilità; ☆ sulle righe | «Tecnologia antica» INT competente +5 in «Abilità aggiuntive»; Furtività e Tecnologia antica in cima nell'ordine dei preferiti; abilità ordinate per nome nella lingua | Abilità EN 9 / IT 10; Maestria EN 182 / IT 209 | Additional Skills e pin DDB (DDB-028); I-161 | Journey F, `05-skills-pinned-it.png`; test «acceptance 6 and 10» |
| PG-36 Filtri d'azione e azioni 2024 | Azioni → chip | «Azione bonus» lascia la pozione; «Tutte» mostra le 12 azioni 2024 + Attacco di opportunità con descrizione; Nascondersi apre la regola con pagine | Tabella Azioni EN 9–10 / IT 10–11; glossario per azione | Chip DDB (DDB-039) | Journey H, `07-actions-bonus-filter-it.png`; test «acceptance 5» |
| PG-39 Striscia dei preferiti | ☆ su abilità, attacchi, pozione → barra | Furtività tirata dalla striscia; la pozione apre l'anteprima «Bevi» della scheda (stesso flusso, costo e dadi); ‹ riordina; voce non più disponibile resta segnata | — | Favourites dnd5e (FVT-009); I-159 | Journey G, `06-favourites-strip-it.png`; test «acceptance 6 and 10» |
| PG-40 Tooltip ricchi | Passaggio o fuoco da tastiera sui valori della barra | CA: 10 senza armatura, Des +2, Bonus magico +1 → 13 con pagine; Iniziativa +2, punteggio 12, EN 184 / IT 208; Esc chiude | Iniziativa EN 184 / IT 208; Percezione passiva EN 186 / IT 211 | Tooltip dnd5e (FVT-010); dettaglio fissabile = dialogo del valore (CRP-129) | Journey D, `03-ac-tooltip-it.png`; test «acceptance 1 and 9» |
| PG-43 Note per sezioni | Storia → Note | Alleati «Syl l’erborista», Nemici «Chi ha spento la lanterna», «Solo io» invisibile al DM; chip per sezione; modifica e rimozione | — | Notes DDB (DDB-056) | Journey L, `11-notes-allies-it.png`; test «acceptance 11» |
| PG-47 Effetti che modificano i tiri | Barra → Benedizione / Anatema / + Effetto | Benedizione: +1d4 sui sei TS e in «Tiro per colpire +5 +1d4»; attacco fisico 15 + 5 + 3 = 23, TS Des 12 + 2 + 3 = 17; disattivata sparisce; effetto personalizzato (dado o bonus, attacchi/TS/prove) | Benedizione EN 113 / IT 128; Anatema EN 112 / IT 123 | Interruttori Beyond20 (VTL-013); menu buff AboveVTT (VTL-015) | Journey I, `08-bless-attack-roll-it.png`, `08b-bless-saves-it.png`; test «acceptance 7» |
| PG-17 PE e traguardi | Barra → Gestisci PE | Correzione a 2 400 solo con motivo; +300 (anche con Invio) → 2 700 e «Avanza al livello 4» (apre l'avanzamento del builder); modalità a traguardi: il DM registra «Riaccesa la lanterna della torre» proponendo il livello 4 e il giocatore vede la proposta | Avanzamento del personaggio EN 23 / IT 25–26 | Manage Experience DDB (DDB-024); traguardi I-123 | Journey K, `10-xp-level-proposed-it.png`, `10b-milestone-proposal-it.png`; test «acceptance 8» |
| PG-80 Scelte da riselezionare dopo un riposo | Doran (DM) → Riposa lungo 8 h → avviso in barra, notifica, Capacità | Due cambi rifiutati; Spada lunga → Spadone salvato; l'avviso si chiude; scelte proprie aggiungibili (breve o lungo); la sostituzione di una forma nota di Mira compare nello stesso elenco e apre il pannello delle forme | Padronanza delle armi EN 48 / IT 54; Forme conosciute EN 42 / IT 48 | Dialogo post-riposo Shard (VTL-017) | Journey M, `12-reselect-after-long-rest-it.png`; test «acceptance 12» |
| Telefono EN, tocco | 390 × 844 | Barra e catena CA in inglese, Bless sul TS Des toccato, riquadro del Tavolo con Fly (40 ft = 12 m), nessuno scorrimento orizzontale, controlli ≥ 40 px | — | — | Journey P, `20-phone-bar-en.png`, `21-phone-saves-en.png`, `22-phone-table-fly-en.png` |

## Comandi eseguiti

- `node --test design/blueprint/tests/sheet-plus.test.mjs` → 16/16 (seme, ordine di cumulo,
  accettazioni 1–12, deriva e riallineamento, hook della shell, permessi/offline/privacy).
- `node --test design/blueprint/tests/*.test.mjs` → 1888/1888 (suite completa, 24/09).
- Prettier `--check` sui miei file → conforme.
- Journey: dalla cartella
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B37/`,
  `playwright-cli -s=d20-b37 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/sheet-plus-journey.js`
  → **PASS**, nessun errore di pagina (esito in `journey-result.json` nella stessa cartella).
  IT desktop 1440 × 900 e contesto telefono EN 390 × 844 con tocco; reload; Annulla e ritiro dei
  tiri; DM e giocatore.

## Limiti onesti

- **Sovrapposizione con B34 (dadi)**: B34, costruito in parallelo, aggiunge alla scheda Azioni il
  riquadro «Tiri» con TS e abilità tirabili sul numero. I miei elenchi TS/abilità (DDB-028) e il
  suo si sovrappongono visivamente. I miei tiri usano il servizio di dadi del core (`rollDie` di
  `state.mjs`) con prove immutabili, come B54; B34 non espone ancora un punto del registro per
  tirare con modificatori e dadi aggiuntivi. Da unificare in integrazione (un solo elenco; il tiro
  sul numero di B34 può leggere `statValue` e i dadi degli effetti di quest'area). Il vassoio di B34
  legge già i TS corretti (`actor.savingThrows`) ma non le modifiche alle abilità né le abilità
  personalizzate.
- **Benedizione al Tavolo**: il motore di combattimento non somma il d4 alle richieste di
  attacco/TS. Il riquadro della creatura ricorda l'effetto e tira il dado a parte («Tira 1d4»);
  il DM ne tiene conto. Sulla scheda il d4 entra nel tiro.
- **Tiro per colpire dalla scheda** senza bersaglio (come D&D Beyond); colpo, danni e reazioni
  contro una creatura restano del Tavolo. Formula = caratteristica + competenza, come il motore;
  maestrie, proprietà delle armi e bonus magici delle armi non sono modellati.
- **Economia delle capacità**: nota solo per poche capacità verificate (Recuperare energie,
  Forma selvatica = azione bonus); le altre restano «Altro», mai dedotte dal nome.
- **Deriva**: se un'altra funzione cambia CA/TS dopo le modifiche, la scheda mostra il valore in
  uso e chiede «Riallinea» (nuova base); non distingue da sola una nuova base da un totale già
  comprensivo delle modifiche.
- **Sensi**: quelli della scheda non cambiano la visione della pedina (B35 usa l'impostazione del
  DM o la specie); la scheda mostra entrambi.
- **Traguardi**: la proposta del DM non passa dalla coda «Sali di livello» di Inizio (che legge i
  PE); l'avanzamento resta quello del builder.
- Il riquadro Movimento del core ora nomina la velocità in uso; l'interruttore Gioco/Modifica
  governa i riquadri di quest'area, non i pulsanti di costruzione già nell'intestazione del core
  («Correggi valori», «Avanza di livello», «Rivedi scelte» restano in entrambe le modalità).
- Nessun backend: permessi e privacy sono proiezioni locali a due identità.

## Review and fixes (B37-rf, 24/09/2026)

Revisione indipendente con correzioni (non ho costruito l'area). Sessione browser
`d20-b37-rf`, prove in `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B37-rf/`
(sondaggi `r01`–`r11`, percorso completo in `journey-after/`, esito in `journey-result.json`).
Prima delle correzioni il percorso del costruttore passava (15 passi, `journey-before/`): i
difetti sotto sono fuori da quel percorso. Ogni correzione è partita da un test o da un passo
del percorso che falliva.

### Difetti corretti

| # | Gravità | Riproduzione (prima) | Esito |
| --- | --- | --- | --- |
| 1 | P2 | Mira: «Gestisci velocità» → Nuotare 9 → Extra → Forme → Lupo → Applica → Azioni → «Gestisci velocità» → «Salva velocità»: `actors.mira.speeds` passa da `{swim: 9}` a nulla (i campi bloccati non vengono inviati e il dominio li leggeva come «togli»; `r05`). | In una forma `setSpeeds` conserva le velocità della scheda, cambia solo quella mostrata e rifiuta un cambio esplicito; il dialogo dice «Forma attiva…». Test «review: saving the speeds during Wild Shape…», passo R5, `journey-after/31-form-speeds-dialog-it.png`. |
| 2 | P2 | 22 tiri digitali identici di Furtività senza Annulla: il 22° riusa le facce del 1° (`status: "reused"`) e i primi due risultano «annullati» (l'elenco dei risultati recenti tiene 20 voci e l'uscita dall'elenco sembrava un Annulla). | Un risultato che esce dall'elenco recente è segnato `settled`: resta accettato, non si mostra annullato, non si riusa. Annulla + nuovo tiro uguale riusa ancora le facce una volta. Test «review: an accepted roll that leaves the recent list…». |
| 3 | P2 | Modifica → ingranaggio Iniziativa → +2 «Allerta» → la scheda dice +4 ma il tracker del Tavolo (B32) tira «Tira d20 (+2)»: la modifica non arrivava dove l'Iniziativa si tira. | L'Iniziativa è scritta come CA e TS: `actor.initiativeBonus` (tolta senza traccia quando non restano modifiche). **Modifica additiva condivisa**: `combat-tracker-domain.mjs`, `initiativeBonus` legge prima `actor.initiativeBonus` (una riga; senza il campo nulla cambia). In una forma CA, Iniziativa, TS e abilità non mostrano più una falsa «deriva» e le modifiche aspettano il ritorno (aggiunta, rimozione e riallineamento rifiutati con motivo; il dialogo non le offre). Test «review: an Initiative change reaches the combat tracker's…», passo R3 (modulo reale del tracker sullo stato salvato). |
| 4 | P2 | Tastiera: Invio su un chip del filtro, Spazio su Benedizione, Invio su una stella → il fuoco cade su `BODY` (la scheda si ridisegna) e si riparte dall'inizio della pagina (sondaggio `x6`). | I controlli che ridisegnano sul posto (modalità, chip, stelle, riordino, effetti, velocità in uso, rimozioni, usa, annulla) riportano il fuoco sullo stesso controllo nella stessa sezione dopo un'attivazione da tastiera. Passo R1 (Invio, Spazio, Maiusc+Tab). |
| 5 | P2 | Il giocatore apre Doran (solo consultazione): 24 stelle che rispondono solo «Non puoi modificare questa scheda.», l'invito «Tocca ☆…» e valori come pulsanti disabilitati, «Usa»/«Bevi» disabilitati. Stesso effetto per il DM quando il giocatore toglie «Il DM può modificare questa scheda» (B20). | Nessuna stella né invito («Nessun preferito.»); valori, tiri per colpire e preferiti come testo; nessun pulsante d'uso inerte. Test «review: a view-only sheet…», passo R2; sondaggio con la politica B20: 0 stelle, 24 valori testuali, nota «Scheda» bloccata. |
| 6 | P2 | DM: Biblioteca → Scheletro → «Aggiungi a una scena» → scheda → Difese: «Nessuna» (il Tavolo applica Veleno e Contundente dal blocco SRD). Aggiungendo Fuoco la scheda creava `damageDefenses = {resistances: [fire]}` e il vassoio dei danni (B33) smetteva di usare il blocco: lo Scheletro perdeva immunità e vulnerabilità. | La scheda elenca ciò che il Tavolo applica (`defensesOf` di `damage-domain.mjs`: registrazione del DM, scheda o blocco SRD, con l'origine «blocco SRD Scheletro»); alla prima scrittura parte dal blocco; togliendo l'ultima voce propria il record creato sparisce e torna il blocco. Con una registrazione del DM (B33) il dialogo dice che al Tavolo vale quella. Test «review: a defense added to a compendium creature…», passo R6, `journey-after/32-skeleton-defenses-it.png`. |
| 7 | P3 | «Aggiungi scelta» con opzioni «Città, Citt, ✦, ☾» e scelte «✦, Città»: due opzioni con lo stesso id e la scelta «✦» con un id casuale diverso da quello dell'opzione. | Id unici e stabili per testo (accenti tolti, suffisso in caso di collisione); le scelte usano gli stessi id. Test. |
| 8 | P3 | Promemoria del centro notifiche sempre «Dopo il riposo lungo puoi cambiare una scelta.» anche per una scelta da riposo breve con 2 cambi. | Il testo nomina il riposo e il numero di cambi (IT/EN). Test. |
| 9 | P3 | Benedizione attiva: il dettaglio dell'attacco al Tavolo non la nominava (il motore non somma il d4). | Riga informativa nel dettaglio dell'attacco dal punto d'estensione di `combat.mjs` (B46, righe `info`): «Benedizione +1d4: effetto attivo, tira il dado dal riquadro «Velocità ed effetti»»; per un bonus fisso «il DM lo conta nel totale». Nessun effetto sulla risoluzione. Test, passo R4, `journey-after/30-table-attack-bless-it.png`. |
| 10 | P3 | Telefono: «Modifica»/«Togli» delle note rientrati di 48 px (spazio pensato per la stella delle azioni). | Rientro solo sulle righe d'azione. |

### Controllati, non difetti

- Carta B37: le 12 accettazioni funzionano nel browser (percorso del costruttore rieseguito
  prima e dopo). Posizione conforme a B61: barra sotto i riquadri vitali (nessuna riga nuova
  nell'intestazione), sezioni nelle schede Azioni/Storia/Capacità, riquadro nella scheda
  Creatura del Tavolo, comando della palette e impostazione di dispositivo.
- Senza rete: Benedizione su Livia rifiutata con «Sei senza rete…», nota «Solo io» salvata in
  locale, scheda privata di Iria modificabile (sondaggio `x12`).
- Riordino dei preferiti solo con ‹: basta per qualsiasi ordine (si sposta prima l'altra voce);
  dnd5e usa il trascinamento. Lasciato.
- «Attacchi per azione: 1» e tiro per colpire con Forza per le armi: coerenti con il motore di
  combattimento, che non modella Attacco extra né armi accurate (limite già dichiarato).

### Aperti (fuori dai miei file o da decidere in integrazione)

- **P2 trasversale**: la scheda Azioni ripete gli stessi contenuti di tre aree: TS e abilità
  (B37 e il riquadro «Tiri» di B34) e le azioni generiche 2024 (B37 e «Azioni generiche,
  movimento e maestria» di B40), oltre a «Pronto ad agire» del core e «Azioni personalizzate».
  Serve una scelta del coordinatore: un solo elenco per concetto (D&D Beyond tiene TS/abilità
  nei loro blocchi e le azioni generiche nell'elenco Azioni).
- P3: CA e Movimento compaiono due volte (riquadri del core e pillole della barra); Gioco/Modifica
  non nasconde i pulsanti di costruzione del core. Entrambi richiedono `characters.mjs`.
- P3: con una registrazione delle difese del DM (B33) al Tavolo vale quella e le voci della
  scheda restano in attesa (ora dichiarato nel dialogo); la fusione è una scelta di B33.
- P3: per un PNG con Iniziativa nel blocco SRD una modifica dalla scheda parte dalla Destrezza,
  poi il tracker usa il valore della scheda.

### Modifiche ai file condivisi (revisione)

- `design/blueprint/combat-tracker-domain.mjs`, `initiativeBonus`: una riga additiva che legge
  `actor.initiativeBonus` se intero (firma e comportamento invariati senza il campo).
- Solo importazioni di funzioni pubbliche già esistenti: `defensesOf` da `damage-domain.mjs`,
  `addAttackModifierProvider` da `combat.mjs` (registrato una volta per modulo, come B46).

### Verifiche

- `node --test design/blueprint/tests/sheet-plus.test.mjs` → 24/24 (16 del costruttore + 8 di
  revisione).
- `node --test design/blueprint/tests/*.test.mjs` → 2009/2009 (17:57). Le esecuzioni vicine
  avevano errori solo nei test di B34 (`dice-tray.test.mjs` alle 17:55, `dice-tray-review.test.mjs`
  alle 18:00) mentre la revisione di B34 modificava i suoi file; rieseguiti, passano (ultima
  esecuzione completa: 2010/2011 con quel solo test di B34, poi 9/9 sul suo file).
- Prettier `--check` sui file dell'area e su `combat-tracker-domain.mjs` → conforme.
- Percorso `sheet-plus-journey.js` (sezione R aggiunta: R1–R6), eseguito con
  `playwright-cli -s=d20-b37-rf --raw run-code` da una copia che scrive le immagini in
  `2026-09-25/B37-rf/journey-after/` → **PASS**, 21 passi, nessun errore di pagina.
