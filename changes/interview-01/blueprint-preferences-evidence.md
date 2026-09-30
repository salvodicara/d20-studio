# B22 — Preferenze, accessibilità e unità: prove

24/09/2026 · worktree `d20-studio-interview-01` (branch `codex/interview-01`) · sessione browser
`d20-b22` · cartella delle prove `~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B22/`.

Scheda: `docs/interview/CAPABILITY_CENSUS.md` § B22 (SV-10…SV-16, SV-19…SV-22, SV-24, TV-145).
Righe di mercato: `market-census/foundry.md` (FVT-188, FVT-189, FVT-190, FVT-192),
`roll20-fgu.md` (R20-196, R20-201, R20-202), `community-services.md` (SVC-124, SVC-158…SVC-171,
SVC-173), `crpg.md` (CRP-180, CRP-181, CRP-184), `dndbeyond.md` (DDB-059, DDB-069),
`vtt-light.md` (VTL-212, VTL-224, VTL-242, VTL-243).

## In breve, per il proprietario

- Le preferenze restano nell'unico dialogo **Preferenze** (ingranaggio in alto, 1 clic da ogni
  pagina, Tavolo compreso), come la finestra "Configure Settings" di Foundry. Ogni sezione dice
  dove vale: **Questo dispositivo**, **Il mio account**, **Questa campagna**. Il giocatore vede
  la preferenza della campagna bloccata con il motivo.
- Tutto si vede subito mentre si sceglie (come l'anteprima dal vivo di BG3); «Salva preferenze»
  conferma, «Annulla» o Esc tornano a prima.
- Tema scuro (predefinito, l'aspetto di oggi), chiaro o come il sistema; testo 100–150 %; scala
  dell'interfaccia 90–125 %; carattere ad alta leggibilità; contrasto elevato; colori per
  protanopia, deuteranopia, tritanopia; parole «Ostile/Alleato/Neutrale» sulla mappa; movimento
  ridotto (anche quando lo chiede il sistema) e modalità fotosensibile; metri o piedi; modalità
  solo scheda al Tavolo; schermo sempre acceso con scheda o Tavolo aperti; volume dei dadi e
  dell'interfaccia con pulsante di prova.
- Il DM può **proporre** preferenze a un giocatore: il giocatore le trova nella campanella e in
  Preferenze, le accetta o le rifiuta, e se accetta può tornare indietro. Il DM non vede mai le
  preferenze attuali del giocatore.
- «Ripristina predefiniti…» chiede conferma elencando cosa cambia e offre «Annulla ripristino».

## File

Nuovi (tutti dell'area):

- `design/blueprint/preferences.mjs` — modulo d'ingresso `register(registry)`: 7 sezioni di
  impostazioni, sezione di stato `preferences` (`undo: "preserve"`, solo le proposte del DM),
  applicazione alla radice del documento, adattatore delle distanze, dimensione del testo,
  blocco dello schermo, suoni, arricchimento del dialogo, pannello «Solo scheda» del Tavolo,
  livello «Parole sulla mappa», notifiche, comando della palette. API per le altre aree:
  `isReducedMotion(ctx)`, `isPhotosensitive(ctx)`, `formatDistance(ctx, metri)`,
  `effectivePreferences(ctx)`, `KEYS`.
- `design/blueprint/preferences-domain.mjs` — modello puro: sezioni e ambiti, precedenza delle
  unità, preferenze effettive, tavolozze, conversione delle distanze, proposte.
- `design/blueprint/preferences.css` — solo regole legate ad attributi della radice
  (`data-pref-*`, `data-motion`) e classi `.pref-*`.
- `design/blueprint/tests/preferences.test.mjs` — 17 test.
- `changes/interview-01/blueprint-checks/preferences-journey.js` — percorso nel browser.

File condivisi modificati: **uno**, con una sola aggiunta.

- `design/blueprint/app.mjs`, `service("preferences")`, dopo l'apertura del dialogo:
  `registry.emit("preferences:dialog", { form })` (3 righe con il commento). Serve perché
  l'area arricchisca il dialogo esistente senza sostituirlo: campi, nomi, «Salva preferenze»,
  lingua e simulazione offline restano quelli del core (decine di percorsi degli altri li
  usano). Nessuna firma o comportamento cambiato.
- `styles.css`, `index.html`, `extensions.mjs` e i moduli delle altre aree: **non toccati**
  (`extensions.mjs` elencava già `preferences`).

## Dove si trova

| Superficie                                                          | Percorso                                          | Distanza                                     |
| ------------------------------------------------------------------- | ------------------------------------------------- | -------------------------------------------- |
| Preferenze (ingranaggio) con le sezioni B22 nei tre gruppi d'ambito | servizio `preferences` del core, arricchito       | 1 clic da qualsiasi pagina, anche dal Tavolo |
| «Aiuta un giocatore» (DM) · «Proposte del DM» (giocatore)           | in cima al dialogo Preferenze                     | 1 clic; per il giocatore anche la campanella |
| Tavolo › pannello «Solo scheda» (elenco, bersagli, Mostra la mappa) | ispettore del Tavolo, quando la modalità è attiva | 0 clic: sostituisce la mappa                 |
| Parole sulla mappa                                                  | livello `preferences-map-words` sopra le pedine   | con la preferenza attiva                     |
| Palette (B23): «Attiva o disattiva la modalità solo scheda»         | comando `preferences.sheet-only`                  | quando la palette esiste                     |

## Capacità → percorso → prova

| Capacità (censimento)                                       | Percorso e comandi                                                                                                                                                              | Esito verificato                                                                                                                                                                                                                                               | Regola / fonte                                                                                               | Pattern adottato (prodotto, ID)                                                                                                       | Prova                                                                                              |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| SV-10 Preferenze con ambito dichiarato                      | Ingranaggio → gruppi «Su questo dispositivo / Personali / Campagna»; ogni sezione B22 ha il distintivo «Questo dispositivo / Il mio account / Questa campagna» (forma + parola) | Giocatore: «Unità per il gruppo» disabilitata, nota «Bloccata: solo il DM la cambia perché vale per tutto il gruppo…» collegata con `aria-describedby`; DM la cambia; offline la campagna è rifiutata, le personali si salvano                                 | Registro B11: `device` (localStorage), `personal` (per identità, commit locale), `campaign` (solo DM)        | Foundry Client/User/World (FVT-188, SVC-163); FG opzioni GM visibili ma bloccate (R20-201)                                            | percorso §1, §6; test «scopes…»; `prefs-scopes-1440.png`                                           |
| SV-11 Tema chiaro, scuro, di sistema                        | Aspetto › Tema                                                                                                                                                                  | Anteprima dal vivo, salvataggio, reload; «Come il sistema» segue il sistema emulato chiaro ↔ scuro; audit di contrasto (< 3:1) su 30+ viste in tema chiaro: 0 casi dopo le correzioni                                                                          | —                                                                                                            | Foundry V13 tema dal sistema (FVT-189, SVC-159); Roll20 modalità colore, scuro predefinito (SVC-158, R20-196); DDB (DDB-059)          | §3; `light-text125-home-1440.png`                                                                  |
| SV-12 Testo e scala dell'interfaccia                        | Aspetto › Dimensione del testo (100/112/125/150 %), Scala dell'interfaccia (90–125 %)                                                                                           | Testo della navigazione 15 → 18,75 px a 125 %; nessun overflow a 390 px con 125 % e 150 % di testo e 125 % di scala su 17 pagine × 2 ruoli; reload conserva                                                                                                    | WCAG 1.4.4 / 1.4.10 (ridimensionamento e reflow)                                                             | Foundry font e UI scale (FVT-189, SVC-160); FG `/scaleui` (R20-202); BG3 dimensione del testo con anteprima (CRP-181, SVC-170)        | §3, §12; audit a 390 px                                                                            |
| SV-13 Movimento ridotto e fotosensibile                     | Movimento ed effetti › Movimento ridotto («Come il sistema» / «Sempre attivo»), Modalità fotosensibile                                                                          | Sistema «reduce» → `data-motion="reduced"`, animazioni CSS spente ovunque, dadi animati B56 con `data-reduced="true"`; «Sempre attivo» senza richiesta di sistema → uguale; fotosensibile → uguale + segnale per le aree                                       | —                                                                                                            | Owlbear rispetta Reduce Motion (SVC-167); Alchemy "Disable visual motion effects" (SVC-166, VTL-212); Foundry fotosensibile (SVC-161) | §4; test «apply…», «B56…»                                                                          |
| SV-14 Mai solo colore; daltonismo                           | Lettura e colori › Colori adatti a; Parole sulla mappa                                                                                                                          | Pedine ostili con anello tratteggiato, alleate continuo (sempre); aree con contorno tratteggiato; deuteranopia → ostile `rgb(122,74,0)` (anello `rgb(230,159,0)` sul ritratto) vs alleato `rgb(29,79,122)`, `--danger` adattato; parole «Ostile/Alleato»       | Simulazione Machado 2009: ΔE alleato/ostile e pericolo/positivo ≥ 40 e migliore dello standard per ogni modo | BG3 protanopia/deuteranopia/tritanopia (CRP-180); Owlbear Ranges e Battle Board (VTL-243); bordi delle pedine (SVC-171, modulo)       | §5; test «palette…»; `colour-vision-words-table-1440.png`                                          |
| SV-15 Carattere per dislessia e contrasto elevato           | Lettura e colori › Carattere, Contrasto                                                                                                                                         | Proposti dal DM e accettati nel percorso: `data-pref-font="legible"`, `data-pref-contrast="high"`, conservati al reload                                                                                                                                        | Nessun file di font scaricato: Verdana/Tahoma di sistema con spaziatura                                      | Roll20 font per la dislessia (SVC-165) e alto contrasto (R20-196)                                                                     | §9, §10                                                                                            |
| SV-16 Metri o piedi coerenti con la lingua                  | Unità di misura › Distanze («Come il tavolo» / Metri / Piedi); Unità del tavolo (DM)                                                                                            | IT «9 m», «1,5 m / casella», Dardo di fuoco 36 m, misura 3,7 m; EN «30 ft», «5 ft / cell», 120 ft, misura 12,3 ft (anche nel nome accessibile); EN + Metri → «9 m», 36 m, 3,7 m; «Metri per tutti» del DM vale per il giocatore EN, con fonte                  | SRD IT 5.2.1: 5 ft = 1,5 m (stessa regola di `srd-sample.mjs`); dati canonici in metri                       | BG3 unità scelte dall'utente (CRP-184)                                                                                                | §6; test «distances…», «units…»; `en-feet-table-1440.png`                                          |
| SV-19 Modalità solo scheda                                  | Tavolo e schermo › Modalità solo scheda; al Tavolo «Mostra la mappa»                                                                                                            | Mappa non disegnata, ispettore + barra delle azioni restano; «Dardo di fuoco» trasforma l'elenco in bersagli (senza l'incantatore); la scelta segue la stessa regola della mappa («Prepara l'iniziativa prima di eseguire.»); DM vede anche le pedine nascoste | —                                                                                                            | Foundry "Disable Game Canvas" (FVT-190, SVC-164); indicazioni Roll20 per il dispositivo più debole (SVC-173)                          | §7, §12; test «sheet-only…»; `sheet-only-target-table-1440.png`                                    |
| SV-20 Schermo acceso con la scheda aperta                   | Tavolo e schermo › Tieni lo schermo acceso                                                                                                                                      | Screen Wake Lock acquisito sulla scheda di Livia (nota «Attivo ora…»), rilasciato tornando a Inizio                                                                                                                                                            | API Screen Wake Lock del browser                                                                             | D&D Beyond app (DDB-069)                                                                                                              | §11                                                                                                |
| SV-21 Il DM aiuta a configurare un giocatore                | DM: Preferenze › «Proponi preferenze a un giocatore…»; giocatore: campanella + «Proposte del DM» › Accetta/Rifiuta; risultato › «Annulla e torna ai valori precedenti»          | Invio condiviso (rifiutato offline); il giocatore accetta (offline: errore e nessun cambio), torna indietro, rifiuta un'altra proposta, ne accetta una terza; il DM vede solo gli stati; le sue preferenze non cambiano                                        | Scritture condivise solo online; valori del giocatore mai mostrati al DM                                     | Monk's Player Settings (FVT-192, modulo); AboveVTT impostazioni suggerite dalla campagna (VTL-224)                                    | §9; test «the DM proposes…», «decline…»; `dm-proposal-dialog-1440.png`, `player-proposal-1440.png` |
| SV-22 Ritardo dei tooltip e opacità dei pannelli (parziale) | Lettura e colori › Sfondo dei nomi sulla mappa (Contorno/Pieno)                                                                                                                 | Targhetta piena dietro i nomi delle pedine                                                                                                                                                                                                                     | —                                                                                                            | BG3 sfondo del testo (CRP-181)                                                                                                        | `explore/words-map.png`                                                                            |
| SV-24 Prove AFB (menu a frecce, caselle etichettate)        | Tastiera nel dialogo                                                                                                                                                            | Frecce ←/→ scorrono i menu a tendina (anche su macOS), frecce sui cursori ±5 con valore letto; ogni input/select del dialogo ha un'etichetta; caselle trovate per nome                                                                                         | Rapporto AFB 2026 come test d'accettazione                                                                   | FG frecce che scorrono i valori (R20-201); AccessWorld/AFB (SVC-169)                                                                  | §2                                                                                                 |
| TV-145 Volume per categoria                                 | Suoni › Volume dei dadi digitali, Volume dell'interfaccia; «Prova il suono…»                                                                                                    | Cursore 50 → 80 da tastiera, prova «Suono riprodotto al 80%»; interfaccia a 0 «silenzio»; a 40 % suona; dadi a 0 → un tiro digitale non suona; i dadi fisici non suonano mai                                                                                   | Suoni sintetizzati (Web Audio), nessun file                                                                  | Foundry cursori per categoria (SVC-124)                                                                                               | §8; test «sounds…»                                                                                 |

## Accettazione della scheda

| #   | Criterio                                                       | Dove è provato                                                                               |
| --- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 1   | Ambito per ogni voce; campagna bloccata con motivo             | percorso §1 (giocatore) e §6 (DM che cambia l'unità del tavolo)                              |
| 2   | Chiaro/scuro/sistema; testo 125 % e scala senza overflow a 390 | §3, §12 e audit a 390 px (125/100, 150/100, 100/125; 17 pagine × giocatore e DM): 0 overflow |
| 3   | Movimento ridotto anche se lo chiede il sistema                | §4: dadi animati B56 e animazioni CSS spente, dal sistema e dalla scelta esplicita           |
| 4   | Stati e raggi con forma o parola oltre al colore               | §5: anello tratteggiato, contorno tratteggiato delle aree, parole; test sulla tavolozza      |
| 5   | EN piedi, IT metri; metri forzati in EN                        | §6: movimento, scala, gittata del Dardo di fuoco, misura delle distanze                      |
| 6   | Solo scheda: elenco e azioni senza mappa                       | §7 (desktop) e §12 (telefono, tocco)                                                         |
| 7   | Volume dei dadi e dell'interfaccia                             | §8                                                                                           |
| 8   | Il DM propone, il giocatore accetta                            | §9 (anche rifiuto, annullamento, offline)                                                    |
| 9   | Predefiniti con conferma                                       | §10: conferma con elenco, Annulla, Ripristina, «Annulla ripristino», reload                  |
| 10  | Menu a frecce e caselle etichettate (AFB)                      | §2                                                                                           |

## Comandi eseguiti e risultati

- `node --test design/blueprint/tests/preferences.test.mjs`: **17/17**.
- `node --test design/blueprint/tests/{registry,registry-shell,table,preferences,dice-3d}.test.mjs`:
  **65/65** (l'aggiunta in `app.mjs` e l'area non cambiano il markup del core né B56).
- Suite completa `node --test design/blueprint/tests/*.test.mjs` (ultima esecuzione): 1093 test,
  1077 superati, 16 falliti, tutti in `account.test.mjs` e `notifications.test.mjs`, che non
  importano moduli B22: l'errore è in `account.mjs` in lavorazione («Confirm your identity…» di
  `requestDeletion`, avatar assenti) e le prove B24 lo richiamano. Eseguita due volte con esito
  simile; non corretta perché appartiene ad altre aree.
- Percorso nel browser, dalla cartella delle prove:
  `playwright-cli -s=d20-b22 --raw run-code --filename=…/blueprint-checks/preferences-journey.js`
  → **12/12 gruppi**, `errors: []` (nessun `pageerror`), in contesti nuovi (IT 1440 e EN 390 con
  tocco). Suoni e blocco dello schermo sono osservati avvolgendo le API del browser nella pagina
  di prova (`addInitScript`), senza toccare l'app.
- Audit ripetibili (script nella scratchpad, non nel checkout): contrasto in tema chiaro su pagine,
  cassetti del Tavolo, menu della pedina, campagna, notifiche, Biblioteca, account (giocatore e
  DM): 0 testi sotto 3:1 dopo le correzioni; overflow a 390 px con testo/scala ingranditi: 0.

Immagini (1440×900 salvo il telefono), controllate a vista: `prefs-scopes-1440.png`,
`light-text125-home-1440.png`, `colour-vision-words-table-1440.png`, `en-feet-table-1440.png`,
`sheet-only-target-table-1440.png`, `dm-proposal-dialog-1440.png`, `player-proposal-1440.png`,
`reset-confirm-1440.png`, `prefs-default-home-1440.png`, `phone-en-prefs-390.png`,
`phone-en-sheet-only-390.png`; esplorazione in `explore/`. Le immagini illustrano percorsi già
verificati da asserzioni, non sono la prova da sole.

## Scelte adottate dall'agente

1. **Un solo dialogo, arricchito.** Il servizio del core resta (lingua, offline, impostazioni di
   tutte le aree, «Salva preferenze»); l'area aggiunge distintivi, anteprima, note, cursori,
   proposte e ripristino tramite l'hook `preferences:dialog`.
2. **Tema scuro predefinito**: nessun cambiamento visivo per chi non sceglie; il tema chiaro
   ridefinisce i token e le superfici a colore fisso del core e delle aree (in `preferences.css`).
3. **Testo e scala distinti**: la dimensione del testo moltiplica le dimensioni in px di tutti i
   fogli di stile dello stesso sito (anche caricati dopo) per `--pref-text-scale`, solo quando
   diversa da 100 %; la scala dell'interfaccia usa `zoom` sul `body`.
4. **Distanze**: i dati restano in metri; un adattatore di presentazione converte il testo e i
   nomi accessibili resi nella pagina (fuori da campi modificabili e `[data-units="raw"]`) con la
   regola dell'SRD italiano. Le aree nuove possono usare `formatDistance(ctx, metri)`.
5. **Precedenza delle unità**: scelta personale → scelta del DM per il tavolo → lingua.
6. **Proposte**: il DM propone solo preferenze del dispositivo e dell'account (non i volumi,
   non la campagna); rispondere è una scrittura condivisa (offline rifiutata prima di cambiare
   qualcosa); l'annullamento vale nella stessa sessione, come l'Undo del core.
7. **Forma sempre attiva** (anello tratteggiato delle ostili, contorno delle aree); le parole
   sulla mappa sono una scelta perché aggiungono testo.

## Limiti onesti

- **Distanze**: l'adattatore lavora sul testo reso. I campi di inserimento restano in metri con
  l'etichetta «(metri)» (es. Velocità nella scheda); un testo scritto dagli utenti con «9 m»
  viene mostrato convertito; una frase come «9 → 6 m» converte solo il numero con l'unità; i
  separatori delle migliaia («1.000 m») non sono interpretati. Nessun percorso esistente in EN
  verificava distanze in metri (controllo con grep), ma un percorso futuro in inglese le vedrà
  in piedi per impostazione.
- **Lingua**: resta del core e non è conservata al reload (comportamento esistente).
- **Tema chiaro**: la mappa, i ritratti e le sovrapposizioni dei dadi mantengono i loro colori;
  l'audit copre solo elementi con testo diretto (non icone, immagini o sfumature).
- **Testo 150 %**: può allungare pagine e dialoghi; non è stato verificato il ritaglio di ogni
  contenitore ad altezza fissa delle altre aree.
- **SV-22**: il ritardo dei tooltip non è offerto, perché l'app usa i tooltip nativi (`title`)
  il cui ritardo dipende dal browser; è stata fatta solo la parte «sfondo del testo».
- **Solo scheda**: il movimento delle pedine richiede la mappa (come in Foundry con il canvas
  disattivato); aree e bersagli si scelgono dall'elenco, centrati sulla pedina scelta.
- **Suoni**: sintetizzati e brevi; solo tiri digitali visibili a chi guarda e cambi fatti da sé;
  nessuna musica o ambiente (fuori perimetro, F-030).
- **Schermo acceso**: dipende dal browser (il percorso lo ha ottenuto in Chromium); il dialogo
  dice «non supportato» o «non permesso» quando serve.
- **Lettore di schermo**: provati etichette, nomi accessibili e tastiera; nessuna prova con un
  lettore di schermo reale.
- **Due identità nello stesso browser**: le preferenze del dispositivo sono comuni a DM e
  giocatore della dimostrazione; nessuna sincronizzazione tra dispositivi o partecipanti.

## Suggerimenti per il coordinatore (file non miei)

1. `design/blueprint/DEVELOPMENT.md`: citare `preferences:dialog`, `data-motion="reduced"`,
   `isReducedMotion(ctx)`, `isPhotosensitive(ctx)` e `formatDistance(ctx, metri)` per le aree che
   animano o mostrano distanze.
2. `blueprint-checks/README.md`: aggiungere `preferences-journey.js`; segnalare che
   `combat-mobile-journey.js` cerca ancora il pulsante «Requests» (ora «Notifications and
   requests», B24) e si ferma prima di scrivere immagini.

## Review fixes (24/09/2026)

Revisione B22 (sessione `d20-b22-review`, cartella `…/2026-09-24/B22-review/`): 11 osservazioni
(1 P1, 5 P2, 5 P3). Correzioni nella stessa worktree, sessione browser `d20-b22`, prove in
`~/Workspace/Codex/d20-blueprint-evidence/2026-09-24/B22/` (percorso) e `…/B22/review-fixes/`
(sonde ripetibili `probe-*.js`, immagini «before-\*» prima della correzione).

**File toccati: solo quelli dell'area** — `preferences.mjs`, `preferences-domain.mjs`,
`preferences.css`, `tests/preferences.test.mjs`, `blueprint-checks/preferences-journey.js` e
questo file. Nessun file condiviso o di altre aree modificato in questo giro (`app.mjs`,
`token-menu.mjs`, `help.mjs`, `notifications.mjs`, `annotations*.mjs` erano in lavorazione da
altri; l'aggiunta a `app.mjs` del primo giro resta l'unica).

### Esito per osservazione

| #   | Gr. | Osservazione (in breve)                                                                                                      | Verifica                                                                                                                                                                                                    | Correzione                                                                                                                                                                                                                                                                                                                                                                                                                                            | Prova                                                                                                                                                              |
| --- | --- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | P1  | Scheda: Movimento «9 m» in inglese mentre il Tavolo dice «30 ft»; «Speed (meters)» nel dialogo                               | Riprodotta (`probe-split.js`: «SPLIT: 9 m» su Livia in EN)                                                                                                                                                  | L'adattatore converte anche numero e unità in due nodi fratelli (`9 <small>m</small>`, `convertSplitPair`); i campi numerici etichettati «(m)/(metri)/(kg)» restano nell'unità canonica e mostrano accanto l'equivalente («= 30 ft», aggiornato mentre si scrive, collegato con `aria-describedby`)                                                                                                                                                   | percorso §6: scheda EN «30 ft», «Correct values» «= 30 ft» → 12 «= 40 ft», EN + metri «9 m», IT + «Piedi e libbre» «30 ft»; test «a number and its unit…»          |
| 2   | P2  | Scala dell'interfaccia con `zoom` sul body: Tavolo fuori finestra a 125 %, banda vuota a 90 %                                | Riprodotta (`probe-zoom.js`: 125 % pagina 1064/900, 90 % barra a 732); in più, stessa causa: il menu della pedina (B12) a 125 % compariva a 99 px dalla pedina e usciva sotto (`before-token-menu-125.png`) | Niente più `zoom`: scala e testo moltiplicano le lunghezze px dei fogli di stile (come già faceva il testo, `scaledValue`), così vh/vw restano «la finestra» e le posizioni misurate dagli script restano giuste. Al Tavolo, con testo o scala > 100 %, la mappa prende l'altezza della finestra meno le barre misurate davvero (`--pref-table-chrome`), minimo 240 px; la barra strumenti ingrandita scorre dentro la mappa                          | percorso «Review fixes»: 90/110/125 % pagina 900, barra delle azioni ≤ 900; menu a 10 px dalla pedina; `probe-chrome2.js`: 9 combinazioni testo × scala, tutte 900 |
| 3   | P2  | Solo scheda: «Trova la mia pedina», righe Distanze (righello) e suggerimento «trascina la pedina» restano ma non fanno nulla | Riprodotta (`probe-sheetonly.js`, `before-sheet-only-full.png`); trovati anche «Centra …» dell'elenco Pedine e «Centra sulla mappa» nel menu della pedina                                                   | Con la mappa spariscono i suoi comandi, come Disable Game Canvas di Foundry (FVT-190): trova/centra, elenco Pedine che centra col doppio clic, righe-righello, suggerimento del Tavolo. L'elenco «Solo scheda» mostra le stesse distanze («Ostile · 12,1 m (↑ 3 m)», regola di `distanceRows`). «Centra sulla mappa» nel menu (non nascondibile: rompe la navigazione a frecce di B12) seleziona la creatura, porta il fuoco sulla sua riga e lo dice | percorso §7; test «sheet-only panel…»                                                                                                                              |
| 4   | P2  | La notifica della proposta non porta da nessuna parte; «1 preferenza. Aprile…»                                               | Riprodotta                                                                                                                                                                                                  | Nuova pagina dell'area `#preferences-proposals` (registro, `route`): proposte in attesa con Accetta/Rifiuta, decisioni passate, «Torna ai valori precedenti», «Apri tutte le preferenze»; per il DM le proposte inviate e le risposte. Le notifiche (giocatore e DM) hanno `target: {page}` già gestito da B24: nessuna modifica a B24. Titolo della pagina a fuoco all'arrivo. Testo singolare/plurale                                               | percorso §9 («3 preferenze proposte. Aprile per accettarle o rifiutarle.» → pagina, fuoco sul titolo); test «proposal notifications open the proposals page…»      |
| 5   | P2  | SV-22: mancano ritardo dei tooltip e opacità dei pannelli                                                                    | Confermata                                                                                                                                                                                                  | Aggiunta «Opacità dei pannelli sulla mappa quando non li usi» (Aspetto, dispositivo: 60/75/90/100 %): la barra strumenti e l'HUD sopra la mappa sfumano e tornano pieni al passaggio o al fuoco, come la «UI fade opacity» di Foundry V13 (FVT-189, SVC-159). **Ritardo dei tooltip: non consegnato** (vedi decisioni)                                                                                                                                | percorso «Review fixes»: 0.75, 1 al passaggio e al fuoco; test «panel fade opacity…»                                                                               |
| 6   | P2  | Le unità non valgono per i pesi (kg in inglese)                                                                              | Riprodotta (inventario EN «5.25 kg», «2 kg / unit»)                                                                                                                                                         | Il sistema di unità vale per distanze **e pesi** (BG3 CRP-184), regola SRD IT 1 lb = 0,5 kg: testo reso, nomi accessibili, `formatWeight(ctx, kg)`. Voci rinominate «Distanze e pesi», «Metri e chilogrammi», «Piedi e libbre» (valori salvati invariati)                                                                                                                                                                                             | percorso §6: inventario EN «10.5 lb», «4 lb / unit», nessun «kg»; test «weights follow…»                                                                           |
| 7   | P3  | Testo 150 %: h1 con `clamp()` non cresce                                                                                     | Riprodotta                                                                                                                                                                                                  | `font-size` (e `line-height` in px) si moltiplica per intero, anche `clamp()`                                                                                                                                                                                                                                                                                                                                                                         | percorso: h1 42 → 63 px a 150 %; test «interface and text size…»                                                                                                   |
| 8   | P3  | Telefono 390 con 150 % + 125 %: larghezza 417, striscia tagliata                                                             | Riprodotta                                                                                                                                                                                                  | Striscia della dimostrazione, intestazione e servizi vanno a capo con le dimensioni ingrandite; il controllo confronta con i 390 px del dispositivo (non con `innerWidth`, che si allarga)                                                                                                                                                                                                                                                            | percorso: 18 pagine × giocatore e DM, 0 overflow; `phone-150-125-home-390.png`                                                                                     |
| 9   | P3  | «Puoi tornare ai valori di prima finché non ricarichi» ma dopo «Chiudi» non c'è modo                                         | Riprodotta                                                                                                                                                                                                  | Finché l'annullamento vale (stessa identità, fino al ricaricamento), Preferenze e la pagina delle proposte mostrano «Annulla ripristino» / «Torna ai valori precedenti»; dopo l'uso Preferenze si riapre con i valori ripristinati                                                                                                                                                                                                                    | percorso §10 (Chiudi → Preferenze → «Annulla ripristino» → Tema Chiaro); test «after a reset the way back…»                                                        |
| 10  | P3  | Solo scheda: pannello primo a vista ma nono nell'ordine di Tab; «Mostra la mappa» lascia il fuoco sul body                   | Riprodotta                                                                                                                                                                                                  | Il pannello è spostato davvero in cima all'ispettore (ordine della pagina = ordine visivo, niente `order:-1`); «Mostra la mappa» porta il fuoco sulla pedina selezionata                                                                                                                                                                                                                                                                              | percorso §7: Tab dopo l'intestazione del Tavolo → «Mostra la mappa»; fuoco su `data-actor="livia"`                                                                 |
| 11  | P3  | Il percorso salvato non girava più (menu con lo stesso nome fuori dal dialogo)                                               | Riprodotta (violazione «strict mode»)                                                                                                                                                                       | `choose` cerca solo dentro il dialogo; percorso aggiornato con le nuove voci e i controlli di questa tabella                                                                                                                                                                                                                                                                                                                                          | percorso 14/14 gruppi, `errors: []`                                                                                                                                |

Trovato e corretto durante la verifica (tema chiaro, stessa area): l'azione di combattimento
attiva era testo ambra su fondo quasi nero e l'elenco dei motivi («Scegli un bersaglio.») era
crema su crema (1,43:1, `light-firebolt.png` prima). Ora fondo chiaro e testo ambra scuro;
controllo di contrasto (`probe-contrast3.js`) su Tavolo con Dardo di fuoco, Mani brucianti,
Dardo incantato, scheda, inventario, pagina delle proposte: 0 testi sotto 3:1.

### Decisioni e cose non fatte

- **Ritardo dei tooltip (SV-22, BG3 CRP-181): non consegnato, serve una decisione.** I tooltip
  dell'app sono nativi (`title`, il ritardo lo decide il browser) oppure quelli annidati del
  Compendio, che hanno un ritardo fisso di 250 ms in `compendium.mjs` (`HOVER_OPEN`). Una
  preferenza che non cambia nulla sarebbe un comando finto; per farla funzionare il Compendio
  deve leggere un valore (es. `tooltipDelay(ctx)` esportato da B22). Proposta al coordinatore:
  o si collega nel Compendio, o il proprietario decide di togliere il ritardo da SV-22.
- **Solo scheda, «Centra sulla mappa» nel menu della pedina (B12)**: resta visibile perché
  nasconderlo col CSS blocca la navigazione a frecce del menu (B12 sposta il fuoco anche su voci
  nascoste). In questa modalità seleziona la creatura, porta il fuoco sulla sua riga dell'elenco
  e lo dice («…nell’elenco è selezionata la creatura Sentinella.»). Pulizia consigliata a B12:
  `when` sulla voce che legge `data-pref-canvas="off"` sulla radice.
- **Suggerimento del Tavolo (B30) in modalità solo scheda**: nascosto; B30 lo archivia comunque
  alla prima comparsa, quindi resta leggibile solo in Inizio › Guide.
- **Barra strumenti della mappa più alta della mappa anche al 100 %** (sovrappone la didascalia
  «Scala» e la barra delle azioni, visibile in `B22-review/shots/table-ui100.png`): è del core,
  non di B22; con testo o scala ingranditi B22 la fa scorrere dentro la mappa. Da correggere nel
  core per tutti.
- **Scala dell'interfaccia**: non cambia le soglie `@media` (come faceva lo `zoom`); gli stili
  inseriti inline dagli script in px non crescono; gli attributi SVG non crescono (la mappa si
  adatta al suo riquadro).
- **Distanze nell'elenco solo scheda**: stessa regola e arrotondamento (un decimale in metri,
  poi l'unità della persona) della lista Distanze di B18, importata da `annotations-domain.mjs`
  (`distanceRows`): se B18 la rinomina, B22 va aggiornato.
- Categoria della notifica: B24 non ha una categoria «preferenze», quindi compare in «Altre aree ·
  Preferenze».

### Correzioni alle sezioni precedenti

- SV-16 ora copre anche i **pesi**; «Limiti onesti › Distanze»: i campi di inserimento restano
  nell'unità canonica ma mostrano l'equivalente in piedi o libbre; una coppia `9 <small>m</small>`
  ora è convertita.
- SV-12: la scala dell'interfaccia non usa più `zoom` sul `body` («Scelte adottate», punto 3).
- SV-22: «parziale» = opacità dei pannelli + sfondo dei nomi; manca il ritardo dei tooltip.
- Accettazione 9: l'annullamento del ripristino resta disponibile in Preferenze fino al reload.
- Percorso: 14 gruppi (erano 12); test dell'area 23 (erano 17).

### Comandi eseguiti

- `node --test design/blueprint/tests/preferences.test.mjs`: **23/23**.
- `node --test design/blueprint/tests/{preferences,notifications,dice-3d,registry,registry-shell,table}.test.mjs`:
  **114/114**.
- Suite completa, due volte: 1323 test, 1312 superati, 11 falliti (prima esecuzione 14), tutti in
  `annotations.test.mjs` (aure, misura a cono), `command-palette.test.mjs` e
  `encounter-builder.test.mjs`: nessuno di questi importa `preferences.mjs` (annotations registra
  una propria area «preferences» finta) e `annotations*.mjs` è stato modificato alle 08:52/08:55
  da chi lavora su B18. Non corretti: appartengono ad altre aree.
- Percorso: `playwright-cli -s=d20-b22 --raw run-code --filename=…/blueprint-checks/preferences-journey.js`
  dalla cartella delle prove → **14/14 gruppi**, `errors: []` (risultato in
  `review-fixes/journey-result.json`).
- Sonde: `probe-zoom.js` (90/100/110/125 %: pagina 900, barra ≤ 900), `probe-chrome2.js`
  (3 scale × 3 testi: tutte 900), `probe-overlay.js` (menu della pedina 10 px a destra della
  pedina a 125 %), `probe-split.js` (EN scheda e inventario: nessun «m»/«kg» residuo),
  `probe-menu2.js` («Centra sulla mappa» in solo scheda, mouse e tastiera), `probe-clip.js`
  (150 % + 125 % su 10 pagine: nessun nuovo ritaglio di testo, a parte l'iniziale nei ritratti
  circolari della libreria personaggi), `probe-contrast3.js` (tema chiaro: 0 sotto 3:1).

Immagini nuove: `proposals-page-1440.png`, `table-ui125-token-menu-1440.png`,
`phone-150-125-home-390.png`, `review-fixes/table-ui90.png`, `review-fixes/table-ui125.png`,
`review-fixes/sheet-only-token-menu.png`, `review-fixes/proposals-page-dm-1440.png` (DM: invio dalla
pagina, «Ritira» → «Ritirata», `probe-page.js`); le altre immagini del percorso sono state rigenerate.
