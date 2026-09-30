# B48 — Editor homebrew profondo: prove

25/09/2026 (sessione del 24/09 sera). Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B48.
Area caricata dal registro (B11) come `homebrew-editor`; «Cosa è pronto» la mostra
«attiva · 10 contributi». Dati sintetici; nessun servizio reale.

## File

Nuovi (proprietà di B48):

- `design/blueprint/homebrew-editor.mjs` — `register(registry)`, interfaccia e un solo
  dispatcher `handleAction` usato dai controlli e dai test.
- `design/blueprint/homebrew-editor-domain.mjs` — regole pure (schema strutturato,
  prerequisiti, ordine di cumulo, attività, avanzamento, forgia, import, modalità sicura,
  ricerca del colpevole, pubblicazione). File di dominio separato come per B19.
- `design/blueprint/homebrew-editor.css` — classi `.hbe-*`, solo token esistenti.
- `design/blueprint/tests/homebrew-editor.test.mjs` — 9 test Node.
- `changes/interview-01/blueprint-checks/homebrew-editor-journey.js` — percorso browser.

Modifica additiva a un file condiviso (prevista dalla scheda: «homebrew.mjs, schema
aggiuntivo»): in `design/blueprint/homebrew.mjs`, `validateDefinition` accetta il campo
facoltativo `structured` (deve essere un oggetto) e il confronto di revisione lo include
tra i percorsi del diff. Firme ed esiti esistenti invariati (54/54 test homebrew,
integrazione e UI della Biblioteca verdi subito dopo). Nessun altro file condiviso toccato.

Il comportamento strutturato viaggia quindi nella revisione immutabile della Biblioteca
(`revision.data.structured`): bozze private, revisioni, condivisione, abilitazione in
campagna, copie sulle schede ed esportazione restano quelle di `homebrew.mjs`.

## Dove sta (regola B61)

| Punto                                                  | Collocazione                                                                                   | Clic dal contesto naturale                             |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `library-section` «Le mie creazioni»                   | Biblioteca, accanto a Disponibili/La mia/Campagna                                              | Biblioteca → Le mie creazioni (1) → Crea «Talento» (2) |
| `route` `#homebrew-editor` (senza voce di navigazione) | editor, dettaglio, Forgia, Importa, Catalogo, con briciole Biblioteca › Le mie creazioni       | dal pannello (1–2)                                     |
| `campaign-section` «Homebrew»                          | barra laterale della campagna                                                                  | Campagna → Homebrew (1)                                |
| `sheet-section` tab Capacità                           | riquadro «Homebrew strutturato» (scelte, ordine di cumulo, sottoclasse e avanzamento, Annulla) | Scheda → Capacità (1)                                  |
| `sheet-section` tab Azioni                             | «Attività homebrew» con Usa e TS in attesa                                                     | Scheda (0–1)                                           |
| `table-panel` `inspector`                              | scheda Creatura del Tavolo: attività, TS in attesa, blocco del mostro (solo DM)                | seleziona pedina (1)                                   |
| `notifications`                                        | campana: TS da tirare, nuova versione pubblicata                                               | 1                                                      |
| `search`, `command`, `draft-guard`                     | ricerca globale, palette, protezione della bozza                                               | —                                                      |

Nessuna riga nuova di pulsanti in un'intestazione.

## Capacità → percorso → prova

| Capacità (censimento)                                                     | Percorso nell'app                                                                            | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                          | Regola / fonte                                                                                               | Pattern adottato                                                                                                                                                  | Prova                                  |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| BI-17 Partire da un modello o da zero                                     | Le mie creazioni → Crea → dialogo «Da dove parti?»                                           | Modelli: Da zero; talenti SRD (Lottatore, Difesa, Allerta, ASI); 32 creature SRD; livelli di sottoclasse per classe; incantesimi SRD con TS/attacco/cura; copia di un proprio contenuto. Copia la struttura, non la prosa SRD; la fonte resta registrata                                                                                                                                                                     | Talenti: `character-rules.mjs` (SRD 5.2.1 EN 87–88); creature/incantesimi: `srd-sample.mjs` con pagine EN/IT | D&D Beyond template o zero (DDB-172); preset Tetra-cube (CMP-152)                                                                                                 | Test 1, 3, 4, 8; percorso 1a, 3, 4a, 8 |
| BI-18 Comportamento strutturato                                           | Editor → Prerequisiti / Opzioni / Modificatori (sotto-moduli dopo il salvataggio della base) | Gruppi E di O («For 13+ o Des 13+»), requisiti di livello, classe, testo (manuale); «scegli N di M» con modificatori per alternativa; modificatori su CA, velocità, caratteristiche con ordine imposta base → somma (con massimo) → minimo/massimo → moltiplica → sostituisci                                                                                                                                                | Cumulo come il Modifier Builder; il limite «fino a 20» dell'ASI 2024 non abbassa mai un valore               | DDB-173 (sotto-moduli dopo la base); Roll20 Modifier Builder (R20-023)                                                                                            | Test 1, 8; percorso 1a, 1c             |
| BI-19 Editor di attività                                                  | Editor → Attività: tipo, poi schede Identità / Attivazione / Effetto                         | Tipi TS, attacco, danno, cura, evoca, trasforma, utilità; costo (azione, bonus, reazione, nessuno), portata, bersagli; TS con CD fissa o 8 + competenza + caratteristica                                                                                                                                                                                                                                                     | TS SRD EN 187 / IT 218; formula della CD come in `combat.mjs` (EN 105, pagina IT non verificata)             | dnd5e Activities (FVT-180)                                                                                                                                        | Test 2; percorso 1a, 2a                |
| BI-20 Effetti con durate e ancore di turno                                | Effetto dell'attività: condizione scelta dall'elenco delle 15 SRD + durata da elenco         | «Fino all'inizio del tuo prossimo turno», fine del tuo prossimo turno, fine del tuo turno, inizio/fine del prossimo turno del bersaglio, riposo breve/lungo, manuale → termini di `conditions.mjs`; al Tavolo la scadenza la fa il motore dei turni                                                                                                                                                                          | Spaventato SRD EN 182 / IT 216                                                                               | Ancore FG come scelte (R20-161), durate Foundry 6.0 (FVT-182); nessun linguaggio a codice (R20-162); campi a elenco al posto dell'autocompletamento DAE (FVT-183) | Test 2; percorso 2a, 2b                |
| BI-21 Editor di avanzamenti                                               | Editor → Avanzamento                                                                         | Concessione di privilegi, valore di scala per livello, aumento di caratteristica (punti e massimo), scelta di un privilegio; tabella per livello nell'anteprima                                                                                                                                                                                                                                                              | Livelli di sottoclasse della tabella 2024 della classe                                                       | dnd5e Advancement (FVT-181)                                                                                                                                       | Test 3; percorso 3                     |
| BI-22 Classi e sottoclassi                                                | Crea Sottoclasse (classe collegata) / Crea Classe (Dado Vita, TS, incantesimi)               | Sottoclasse di Mira: scelta dalla scheda, livello 3 applicato; «Correggi valori» a 6 → avanzamento dovuto e applicato; 10 resta futuro                                                                                                                                                                                                                                                                                       | Livelli di sottoclasse 2024 (druido 3/6/10/14)                                                               | Classe personalizzata Roll20 (R20-022); hub DDB (DDB-171, che non ha classi complete)                                                                             | Test 3; percorso 3                     |
| BI-23 Creatore di mostri                                                  | Crea Mostro → preset → Blocco statistiche                                                    | Informazioni generali, tratti, azioni, bonus, reazioni; interruttori per azioni leggendarie e di tana; «Rendi tirabili i dadi»; anteprima con tiri di prova non registrati; dettaglio con tiri veri (dadi digitali o fisici, pubblico) tramite il servizio del compendio; «Aggiungi alla scena attiva» (PNG con CA, PF, velocità, caratteristiche e attacco in mischia per il motore di combattimento)                       | Morte a 0 PF dei mostri SRD EN 17 / IT 19                                                                    | DDB monster creator (DDB-174), blocchi tirabili (DDB-110), preset e sezioni Tetra-cube (CMP-152)                                                                  | Test 4; percorso 4a                    |
| BI-24 Oggetti magici da base + modello                                    | Crea Oggetto magico → Forgia                                                                 | Base SRD (armi e armature) + modello compatibile per tipo (Arma/Armatura +1/+2/+3) → bozza «Spada lunga +1» con bonus, rarità, danni                                                                                                                                                                                                                                                                                         | Arma +1 SRD EN 253 / IT 243; Armatura +1 EN 210 / IT 243                                                     | FG Forge (R20-118); dnd5e Enchant (FVT-036)                                                                                                                       | Test 5; percorso 5                     |
| BI-25 Pubblicazione, moderazione, valutazioni, segnalazioni, etichetta IA | Dettaglio → Pubblicazione; Le mie creazioni → Catalogo pubblico (simulato)                   | Controlli automatici (autore, contenuto originale, diritto di condivisione, niente link, nomi protetti, livelli di sottoclasse); metodo di creazione obbligatorio, «generato in prevalenza da IA» rifiutato; coda di moderazione con esito scelto (simulazione); versione pubblicata bloccata; «Nuova versione» → v2; chi segue sceglie «Passa alla v2» o «Resta sulla v1»; stelle 1–5; segnalazione accolta → torna privato | —                                                                                                            | DDB-175, DDB-176, DDB-177, DDB-178; etichetta IA DMs Guild (SVC-136)                                                                                              | Test 7; percorso 7                     |
| BI-26 Copia modificabile e «ripristina alla fonte»                        | Qualsiasi voce da modello o forgia: pannello «Fonte della copia»                             | Campi modificati marcati (anche per campo, «Ripristina» nell'editor); nel dettaglio «Ripristina alla fonte…» con elenco e conferma crea una nuova revisione; la precedente resta in cronologia                                                                                                                                                                                                                               | —                                                                                                            | FG copy-to-edit e Revert (R20-114)                                                                                                                                | Test 5; percorso 5                     |
| BI-27 Disattivare homebrew per trovare un problema                        | Campagna → Homebrew (DM)                                                                     | «Disattiva tutto l'homebrew»: le revisioni abilitate non sono più scelte di campagna, effetti e attività sospesi sulle schede della campagna; «Riattiva» ripristina le stesse revisioni; interruttore per voce; «Trova il colpevole» dimezza le voci attive fino a una                                                                                                                                                       | —                                                                                                            | Foundry safe mode e Find the Culprit (FVT-198)                                                                                                                    | Test 1, 2, 6; percorso 6               |
| BI-28 Livello di automazione dichiarato                                   | Badge in Le mie creazioni, editor, dettaglio, catalogo; tabella in Campagna → Homebrew       | Completa / parziale / solo testo con l'elenco di ciò che l'app esegue e ciò che resta manuale; salvato nella revisione                                                                                                                                                                                                                                                                                                       | —                                                                                                            | Roll20 libri con dati aggiornati (R20-185)                                                                                                                        | Test 1, 8; percorso 1a, 6              |
| BI-43 Import di mostri da CSV/JSON con esempio                            | Le mie creazioni → Importa mostri                                                            | «Scarica l'esempio CSV» e «Inserisci l'esempio» (3 mostri), file .csv/.json o testo; controllo riga per riga con colonna e motivo; importa solo le righe valide come mostri privati; le righe errate restano da correggere                                                                                                                                                                                                   | Colonne proprie (unità: metri per `speed_m`)                                                                 | Importer Kobold+ (CMP-112); JSON come Clash! (VTL-083)                                                                                                            | Test 4; percorso 4b                    |

## Criteri di accettazione della scheda

| #   | Criterio                                                                                                                                      | Dove è provato                                                                                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Talento da modello con «For 13 o Des 13», «scegli 1 di 2», +1 CA con ordine di cumulo; prova su scheda di prova; abilitazione della revisione | Test 1; percorso 1a–1c (prova senza scrivere nel registro; condivisione al DM, abilitazione DM, applicazione a Livia: CA 12→13, Des 14→15; Annulla; ricarica)                                             |
| 2   | Attività con TS e «fino all'inizio del tuo prossimo turno» dall'elenco; al Tavolo scade al momento giusto                                     | Test 2; percorso 2a–2b (dado fisico 5+1 = 6 contro CD 13; Spaventata dopo i turni di Sentinella, Doran, Esploratore; sparisce all'inizio del turno di Livia; Annulla e riapplicazione con lo stesso tiro) |
| 3   | Sottoclasse con privilegi ai livelli 3/6/10 applicata dall'avanzamento di Mira                                                                | Test 3; percorso 3                                                                                                                                                                                        |
| 4   | Mostro con sezioni leggendarie e tana e blocchi tirabili; import CSV di tre mostri con errori per riga                                        | Test 4; percorso 4a–4b                                                                                                                                                                                    |
| 5   | «Spada lunga» + modello «+1»; ripristina alla fonte                                                                                           | Test 5; percorso 5                                                                                                                                                                                        |
| 6   | Homebrew disattivato per la campagna e riattivato                                                                                             | Test 1, 6; percorso 6                                                                                                                                                                                     |
| 7   | Pubblicazione simulata, versione immutabile, nuova versione scelta dagli utenti                                                               | Test 7; percorso 7                                                                                                                                                                                        |
| 8   | Livello di automazione dichiarato per ogni voce                                                                                               | Test 1, 8; percorso 1a, 6, 8                                                                                                                                                                              |

Trasversali: dadi digitali e fisici con pubblico (tiri del blocco e TS tramite
`recordRoll` del compendio, un solo motore di dadi); bozze private mai visibili all'altra
identità (test 8); Annulla con evidenza del tiro conservata (slice
`homebrew-editor-rolls` con `undo: "preserve"`); correzione del DM ai prerequisiti con
motivo registrato (test 1); fuori rete le bozze private si salvano e i cambi condivisi
sono rifiutati (test 9); IT predefinito, EN completo (test 8, percorso 8); tastiera: il
fuoco torna al controllo dopo ogni ridisegno e il testo si riseleziona come dopo un Tab;
bersagli ≥ 40 px e nessun trabocco a 390 px (percorso 8).

## Comandi ed esiti

```sh
cd design/blueprint
node --test tests/homebrew-editor.test.mjs          # 9/9
node --test tests/homebrew.test.mjs tests/homebrew-integration.test.mjs tests/library-ui.test.mjs   # 54/54 dopo la modifica additiva
node --test tests/*.test.mjs                        # 1575/1575 (un test B51 in corso ha fallito una volta ed è passato alla ripetizione)
```

Browser (Chromium via playwright-cli, sessione `d20-b48`, cwd
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B48/`, server
`http://127.0.0.1:8879/`):

```sh
playwright-cli -s=d20-b48 open http://127.0.0.1:8879/
playwright-cli -s=d20-b48 --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/homebrew-editor-journey.js
```

Esito dell'ultima esecuzione: 12 gruppi di controlli superati, nessun errore di pagina
(IT 1440 desktop e contesto EN 390 con tocco). Il percorso azzera lo stato dimostrativo
del browser. Il file non ha punto e virgola iniziale o finale (vedi README dei controlli).

Schermate (1440×900 salvo le tre da telefono), in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B48/`, controllate
una per una: `b48-01-feat-activity-test-sheet.png` (pagina intera), `b48-02-feat-detail-shared.png`,
`b48-03-livia-sheet-stacking.png`, `b48-04-table-use-activity.png`,
`b48-05-table-save-frightened.png`, `b48-06-subclass-advancement-editor.png`,
`b48-07-mira-subclass-advancement.png`, `b48-08-monster-statblock-editor.png`,
`b48-09-table-homebrew-monster.png`, `b48-10-csv-import-row-errors.png`, `b48-11-forge.png`,
`b48-12-forge-reverted.png`, `b48-13-campaign-homebrew.png`, `b48-14-find-the-culprit.png`,
`b48-15-catalog-new-version.png`, `b48-16-phone-en-hub.png`, `b48-17-phone-en-editor.png`,
`b48-18-phone-en-table.png`. Correzioni fatte dopo la revisione visiva: elenco dei campi
modificati per riga, testo del cumulo senza ripetizioni, etichette localizzate di rarità e
tipo di danno, intestazione del mostro non duplicata, ancora della durata con il nome della
creatura nei messaggi letti da altri, striscia delle sezioni che mostra quella aperta sul
telefono, nessun ridisegno del modulo mentre si scrive (solo anteprima e prova).

## Limiti onesti

- Automazione reale solo dove dichiarata: le attività di tipo TS chiedono il tiro, ne
  registrano l'esito e applicano la condizione con la sua durata; i danni di un TS, gli
  attacchi, i danni e le cure si tirano con il servizio comune ma si applicano a mano
  (Condizioni e stato); evoca, trasforma e utilità registrano uso e costo.
- I modificatori automatici toccano CA, velocità e caratteristiche; iniziativa, TS,
  attacchi, danni, PF massimi e percezione passiva restano dichiarati manuali, come i
  modificatori con una condizione scritta. Una correzione manuale di un valore già
  modificato sposta la base (la correzione resta, il modificatore resta sopra).
- Il bonus di un'arma forgiata non entra nel motore di combattimento del Tavolo (solo il
  bastone e i profili in mischia configurati sono attacchi strutturati).
- Specie, background e classi complete si creano, versionano, condividono, pubblicano e
  provano sulla scheda di prova, ma il costruttore dei personaggi non le legge ancora e non
  si applicano a una scheda esistente; il loro avanzamento è dichiarato «registrato».
  La sottoclasse homebrew si sceglie dal riquadro della scheda, non dal selettore di
  sottoclasse del costruttore. Scendere di livello non toglie da solo i privilegi concessi.
- Un contenuto strutturato aperto dal dettaglio della Biblioteca di base mostra solo nome,
  testo e fonte: il dettaglio strutturato è in «Le mie creazioni» (servirebbe un punto di
  estensione nel dettaglio di `library.mjs`, non aggiunto). Sulla pagina `#homebrew-editor`
  la voce «Biblioteca» della navigazione principale non risulta evidenziata (la
  evidenzia `app.mjs` per pagina); le briciole indicano il contesto.
- Catalogo, moderazione, valutazioni e segnalazioni sono una simulazione tra le due
  identità locali: nessuna rete, nessun moderatore reale; l'elenco dei nomi protetti è un
  campione.
- La sintassi dei blocchi tirabili `[rollable]mostra|dadi|tipo|danno[/rollable]` segue
  il modello D&D Beyond ma non è compatibile byte per byte; le colonne CSV sono nostre.
- La modalità sicura e la ricerca del colpevole valgono per la campagna (le schede
  personali fuori campagna non cambiano) e dimezzano voci homebrew, non aree dell'app.
- La scheda di prova non simula effetti situazionali né tiri; il riuso del tiro dopo
  Annulla vale per i TS delle attività (i tiri del blocco sono prove del compendio con le
  sue correzioni e ritiri).
- Verificato solo in Chromium; nessuna prova con persone reali.

## Revisione e correzioni (revisione indipendente, 24/09/2026)

Revisore-correttore distinto dal costruttore · stesso worktree, nessun commit · sessione
browser `d20-b48-rf`, cwd e prove in
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B48-rf/` (fuori dal
checkout; le prove del costruttore in `B48/` non sono state toccate) · server
`http://127.0.0.1:8879/` senza cache · solo dati sintetici.

### Come è stata fatta

- Letti la scheda B48 del censimento, questo rapporto, `homebrew-editor.mjs`,
  `homebrew-editor-domain.mjs` (le parti di scheda, attività, TS, avanzamento, modalità
  sicura, mostri, import) e i 9 test del costruttore.
- Rieseguiti test e percorso del costruttore (12/12 gruppi) su una copia che scrive le
  schermate in `B48-rf/`.
- Sonde proprie: script Node sul vero registro e sul vero store (in una cartella temporanea
  fuori dal checkout) per i casi dubbi; nel browser nove pagine B48 a 390 px (hub, dettaglio
  talento, dettaglio mostro, catalogo, forgia, import, Campagna → Homebrew, Capacità di Mira,
  Azioni di Livia): nessun trabocco orizzontale e nessun controllo sotto 40 px; percorso da
  tastiera nell'editor; cambio di identità con testo non salvato; aggiornamento della copia
  sulla scheda dal flusso della Biblioteca.

### Risultati

| #   | Gravità | Riproduzione                                                                                                                                                                                                                                                                                                                                                                                                               | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | P2      | Talento con attività di attacco (+5, 1d8+3) su Livia, in combattimento nel suo turno: «Usa» → tiro per colpire. Per tirare i danni bisognava usare di nuovo l'attività, che rifiutava con «Azione già usata in questo turno»: i danni di un attacco non si potevano tirare in combattimento. I danni di un'attività TS («2d6 fuoco») non avevano alcun comando di tiro. Gli usi non TS non controllavano nemmeno il turno. | **Corretto.** Come la scheda dell'attività di dnd5e (FVT-180): l'uso paga il costo una volta ed è registrato con i suoi tiri; la riga dell'attività (scheda → Azioni e Tavolo → Creatura) mostra «Ultimo uso» con un pulsante per ogni tiro (per colpire, danni, cura), dadi digitali o fisici, senza ripagare il costo. Stesse regole di turno e costo per tutti i tipi (`recordActivityUse`). Il TS con danni li offre al lanciatore sulla stessa riga; il pannello «Cosa fa l'app» lo dice. Annulla toglie l'uso e restituisce il costo; i tiri accettati restano nello storico. |
| 2   | P2      | Editor con testo non salvato («Scintilla»), poi «Visita come» → DM: nessuna domanda, il testo spariva (la guardia della bozza confrontava solo pagina e id, non l'identità).                                                                                                                                                                                                                                               | **Corretto.** Il cambio d'identità è una partenza dalla bozza: compare «Conservare la bozza?» con Resta / Salva e continua / Scarta, come per la navigazione.                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 3   | P2      | Talento v1 (+1 CA) su Livia; v2 (+2 CA) condivisa e abilitata; dalla riga della scheda «Origine e revisioni» → v2 → «Rivedi aggiornamento di questa copia» → Applica: la riga diceva v2, ma CA restava 13 con gli effetti della v1, senza avviso.                                                                                                                                                                          | **Corretto.** Il riquadro «Homebrew strutturato» segnala la voce («i suoi effetti sono ancora quelli della precedente») con «Aggiorna gli effetti»: le scelte fatte restano se la nuova revisione le offre ancora (altrimenti si sceglie di nuovo), modificatori e attività seguono la v2 (CA 14). Annulla del riquadro torna alla v1. Mai in silenzio, come le voci orfane.                                                                                                                                                                                                        |
| 4   | P3      | Il TS di un'attività leggeva la creatura grezza; il motore di combattimento legge quella effettiva (Forma Selvatica: Des della forma).                                                                                                                                                                                                                                                                                     | **Corretto** con `getEffectiveActor` (stesso calcolo del motore).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 5   | P3      | Dopo un aumento di livello l'avanzamento dovuto della sottoclasse compariva solo aprendo Capacità (in dnd5e l'avanzamento parte con il livello).                                                                                                                                                                                                                                                                           | **Corretto:** promemoria nella campana («Avanzamento da applicare: Mira (livello 3)», categoria Promemoria) per il proprietario della scheda, che apre Capacità.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 6   | P3      | Una sottoclasse homebrew scelta non si poteva togliere né cambiare, se non con un Annulla immediato.                                                                                                                                                                                                                                                                                                                       | **Corretto:** «Rimuovi sottoclasse» toglie la voce e i privilegi concessi (come cambiare sottoclasse nel costruttore di D&D Beyond); la scelta torna disponibile.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 7   | P3      | Con v1 e v2 entrambe abilitate, «Aggiungi homebrew…» applicava la v1.                                                                                                                                                                                                                                                                                                                                                      | **Corretto:** usa la revisione abilitata più recente.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 8   | P3      | Tastiera: Invio su una sezione dell'editor («Attività») ridisegnava dopo il cambio di indirizzo e il fuoco finiva sul `body`; le schede Identità/Attivazione/Effetto (`role="tab"`) non rispondevano alle frecce.                                                                                                                                                                                                          | **Corretto:** il fuoco torna al controllo al primo ridisegno successivo; frecce, Home e Fine sulle schede dell'attività, come nel compendio.                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 8b  | P3      | Scrivendo il nome nell'editor, il titolo della pagina restava «Senza nome» fino al salvataggio (il modulo non si ridisegna mentre si scrive).                                                                                                                                                                                                                                                                              | **Corretto:** il titolo segue il nome mentre si scrive.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 9   | P3      | Collocazione B61: le attività homebrew stanno nella scheda Creatura del Tavolo, non nella barra delle azioni in basso (barra rapida di BG3).                                                                                                                                                                                                                                                                               | **Non corretto, rimandato.** Il registro non ha un punto per la barra delle azioni: è del core e l'area B53 `quickbar` avrà «un punto proprio, ancora da definire» (prove B61). Aggiungerlo ora vorrebbe dire modificare `table.mjs`, file condiviso; la funzione resta raggiungibile con 1 clic dalla pedina.                                                                                                                                                                                                                                                                      |
| 10  | P3      | La sottoclasse homebrew si sceglie dal riquadro della scheda, non dal selettore di sottoclasse del costruttore (pattern D&D Beyond).                                                                                                                                                                                                                                                                                       | **Non corretto:** richiede che `character-builder.mjs` (condiviso, non di B48) legga le sottoclassi homebrew. Già tra i limiti del costruttore.                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 11  | —       | Il bonus di un'arma forgiata non entra nel motore di combattimento.                                                                                                                                                                                                                                                                                                                                                        | **Non difetto di B48:** il core esegue solo i profili di attacco configurati; l'automazione della voce lo dichiara manuale.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 12  | —       | Moderazione simulata: l'autore può approvare la propria versione; Invio su un `select` del dialogo non invia; dopo il cambio d'identità una bozza del giocatore appare «Contenuto non disponibile» al DM; a 390 px in inglese la portata appare in piedi.                                                                                                                                                                  | **Non difetti:** simulazione dichiarata tra le due identità locali; comportamento nativo del modulo; riservatezza corretta; conversione delle unità di un'altra area (preferenze).                                                                                                                                                                                                                                                                                                                                                                                                  |

Verificato senza rilievi: controlli senza gestore (nessuno: ogni `data-hbe` ha il suo caso),
ruoli (solo il DM cambia la campagna, abilita e mette mostri; il blocco del mostro al Tavolo
è solo del DM; il TS lo tira chi controlla il bersaglio), fuori rete (bozze private sì,
cambi condivisi rifiutati), modifica additiva a `homebrew.mjs` (suite completa verde),
collocazione nei punti del registro (sezione della Biblioteca, pagina, sezione della
campagna, riquadri delle schede Capacità e Azioni, scheda Creatura, campana, ricerca,
palette, guardia della bozza), testi IT/EN delle aggiunte.

### File

Solo file di B48 (nessuna modifica a file condivisi):

- `design/blueprint/homebrew-editor-domain.mjs`: `activityRolls`, `recordActivityUse`,
  `lastUseOf`, `useRoll`, costo e turno comuni (`payActivation`), `staleEntries`,
  `refreshEntry`, rimozione della sottoclasse, TS sull'attore effettivo.
- `design/blueprint/homebrew-editor.mjs`: riga «Ultimo uso» con i tiri, azioni `roll-use` e
  `refresh-entry`, avvisi e «Rimuovi sottoclasse» nel riquadro, revisione abilitata più
  recente, guardia della bozza sull'identità, promemoria dell'avanzamento, fuoco e frecce.
- `design/blueprint/homebrew-editor.css`: riga dell'uso e intestazione della sottoclasse.
- `design/blueprint/tests/homebrew-editor.test.mjs`: 4 test nuovi (9 → 13), scritti prima
  delle correzioni e falliti per i motivi attesi.
- `changes/interview-01/blueprint-checks/homebrew-editor-review-journey.js` (nuovo).

### Comandi ed esiti

```sh
cd design/blueprint
node --test tests/homebrew-editor.test.mjs   # 13/13
node --test tests/*.test.mjs                 # 1680/1686: i 6 falliti sono tutti in
                                             # tests/combat-tracker.test.mjs, modificato dal
                                             # suo costruttore durante l'esecuzione (non importa
                                             # B48); senza quel file 1660/1660
```

Durante la revisione anche `builder-plus` e `integrations` hanno fallito per qualche minuto
mentre i loro costruttori li modificavano; alla ripetizione erano verdi.

Browser (sessione `d20-b48-rf`, cwd `.../2026-09-25/B48-rf/`):

```sh
playwright-cli -s=d20-b48-rf open http://127.0.0.1:8879/
playwright-cli -s=d20-b48-rf --raw run-code --filename=/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01/changes/interview-01/blueprint-checks/homebrew-editor-review-journey.js
# e il percorso del costruttore, con le schermate dirette in B48-rf/
```

Percorso di revisione: 5 gruppi superati, nessun errore di pagina — R1 attacco al Tavolo
(uso una volta, per colpire fisico 14+5 = 19, danni dalla riga dell'uso fisico 6+3 = 9 senza
seconda azione, secondo uso rifiutato; tastiera su sezioni e schede), R2 aggiornamento della
Biblioteca → avviso → «Aggiorna gli effetti» (CA 13 → 14, Annulla → 13), R3 titolo che segue il nome e cambio
d'identità con bozza non salvata, R4 campana dell'avanzamento e rimozione della
sottoclasse, R5 telefono EN 390 con tocco. Percorso del costruttore dopo le correzioni:
12/12, nessun errore di pagina. Schermate controllate: `rf-01-table-attack-card.png`,
`rf-02-sheet-stale-entry.png`, `rf-03-role-change-guard.png`, `rf-04-bell-advancement.png`,
`rf-05-phone-en-use-card.png`, `rf-phone-*.png` (le nove pagine a 390 px).

### Limiti che restano

Quelli del costruttore, più i punti 9 e 10 qui sopra. La riga «Ultimo uso» mostra l'uso
più recente di ogni attività (come l'ultima scheda in chat di Foundry), non uno storico.
