# B38 — Magie: gestione, liste, confronto, rituali e oggetti — evidenze

24/09/2026 (cartella delle immagini assegnata: `2026-09-25/B38`). Area `spells-plus`, caricata dal
registro (`extensions.mjs` la elencava già). Dati sintetici; nessun servizio reale, nessun orologio
reale. Regole: D&D 2024, SRD 5.2.1 EN/IT (pagine stampate controllate nei PDF locali di
`d20-studio-experience-evidence`, hash in `srd-sample.mjs`).

## Dove si trova (regola di posizionamento B61)

Tutto sta nella **scheda Magie** del personaggio: l'area la sostituisce con il punto previsto dal
registro (`sheet-tab` `spells` con `replaces: true`, stessa posizione e stessa etichetta). Nessun
pulsante nuovo nelle intestazioni. «Gestisci magie» apre il **pannello laterale** di D&D Beyond
(a destra del contenuto sopra i 1100 px, sopra l'elenco su tablet e telefono) con quattro sezioni:
Libro/Preparate, Lista di classe, Liste salvate, Trascrivi (solo mago). Il lancio avviene dalla
riga della magia (icona unica con i livelli) e si conclude nel dialogo d'uso; gli incantesimi
d'area e d'attacco automatizzati passano al Tavolo con «Prepara al Tavolo». Altri punti: una
notifica al DM per il tempo da avanzare e al giocatore per il d20 dell'ultima carica (B24), un
comando della palette «Gestisci le magie di questa scheda» (B23), un'impostazione della campagna
per le componenti nelle Preferenze del DM (come l'opzione di Solasta II).

Clic: Inizio → Personaggi → Apri scheda (Iria) → Magie (3, provato nel percorso). Da lì: Gestisci
magie → Lista di classe (2); Lancia ▾ → livello (2); Come rituale (1); Confronta ×2 → Confronta (3).

Tutti i controlli della scheda Magie del core restano, con le stesse etichette e gli stessi
gestori del core (`data-character-action`): Registra/Termina concentrazione, Correggi risorsa
degli slot, Cerca nella Biblioteca, Origine e revisioni degli homebrew, Annota magia concessa,
Annulla. «Dettagli» apre un dettaglio più ricco (fatti SRD) che conserva «Condividi nella chat…»
della B17 con lo stesso comando `chat.share-entry`.

## File

Nuovi (solo miei): `design/blueprint/spells-plus.mjs` (ingresso e interfaccia),
`design/blueprint/spells-plus-domain.mjs` (dominio puro), `design/blueprint/spells-plus.css`,
`design/blueprint/tests/spells-plus.test.mjs` (15 test),
`changes/interview-01/blueprint-checks/spells-plus-journey.js`, questo rapporto.

Una sola modifica **aggiuntiva** a un file condiviso: `design/blueprint/combat-ui.mjs`, nuovo
export `prepareCombatAction(ctx, actorId, actionId, selection)` (8 righe dopo
`hasCombatPreview`). Imposta la stessa anteprima privata che il Tavolo crea quando si sceglie
un'azione dalla barra, con la selezione già fatta (livello dello slot). Mancava un modo di aprirla
da un'altra superficie; nessuna firma o comportamento esistente cambia. La scheda B38 prevedeva
modifiche a `characters.mjs` e `combat.mjs`: non sono servite. La scheda Magie è sostituita dal
registro (punto sostituibile dichiarato nel piano §2.3) e le cariche degli oggetti usano il motore
di attività dell'Inventario (B36) invece di un'aggiunta a `combat.mjs`.

Integrazione con altre aree, solo tramite funzioni pure esistenti: `inventory-plus-domain.mjs`
(`previewActivity`, `useActivity`, `rollLastCharge`: cariche, dadi e registro dell'oggetto sono
quelli della B36), `party-stash.mjs` (monete della B26 per la trascrizione), `rest-time.mjs`
(orologio della campagna, richiesta di tempo, `observeRestEvent`), `combat.mjs`
(`observeConcentrationEnd`, `observeConditionTerms`), `forms-companions.mjs` (fine
concentrazione, orologio personale), `srd-compendium.mjs`/`srd-sample.mjs` (catalogo),
`character-rules.mjs` (quote di preparazione), `state.mjs` (`rollDie`, lo stesso servizio dei
dadi digitali). Trova Famiglio non ha un secondo flusso: il dialogo segnala l'incenso mancante e
apre «Forme e compagni» (`ctx.openForms`), che già segue quel lancio.

Stato: `state.ext["spells-plus"]` (bozze, liste, preparazioni confermate, lanci, trascrizioni,
richieste di tempo, usi gratuiti; Undo a istantanea) e `state.ext["spells-plus-rolls"]` (facce
accettate delle prove di trascrizione; `undo: "preserve"`, come gli altri tiri dell'app).

Dati di esempio (seme, solo se assenti): Iria (B21) riceve ciò che le regole 2024 già implicano
per il suo profilo — Elfo alto (Retaggio elfico, EN 84–85 / IT 94–95): Prestidigitazione concessa
dalla specie, Individuazione del magico e Passo velato **sempre preparati** con un lancio gratuito
per riposo lungo — più il libro degli incantesimi leggibile (formato `spellbook` già usato da
Forme e compagni), il cristallo segnato come focus arcano, una Pergamena di Ragnatela trovata al
faro e 150 mo. La finestra di preparazione di Iria parte aperta («riposo lungo appena concluso,
esempio»). Livia usa la sua Bacchetta di dardi incantati (3/7) e il Bastone del fuoco del seme B36.

Nota tecnica: il prefisso `.sp-` era già di sessions-plus (stessi `.sp-row`, `.sp-badge`,
`.sp-log`): questa area usa `.spl-` e `data-spl-*` per non ereditarne gli stili.

## Capacità → percorso → prova

| Capacità (censimento)                                                         | Percorso nell'app                                                         | Comandi ed esito                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Regola / fonte                                                                                                             | Modello adottato                                                                                                       | Prova                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| PG-53 Gestione conosciute/preparate con filtri di fonte                       | Magie → Gestisci magie → Lista di classe / Libro                          | Lista del **mago** soltanto (nessuna Cura ferite), filtri livello, rituali, concentrazione, ricerca, fonte «SRD 5.2.1 · 2024» (con la nota: niente versioni 2014); Metamorfosi spiega «Serve uno slot di livello 4». «Aggiungi al libro» (scelta di livello: 6 + 2 per livello, qui 6 libere), «Impara» un trucchetto entro la quota. Libro: Prepara/Togli in **bozza** (+1 −1 · 7/9), poi «Conferma preparazione» o «Annulla modifiche». Quota bloccata a 9/9 con il motivo.                                                                                                                                                                                                | Preparazione per classe e sempre preparati EN 104 / IT 118; libro, preparate, cambio dopo riposo lungo EN 77–78 / IT 60–61 | D&D Beyond Manage Spells (DDB-043), stati dnd5e non/preparata/sempre (FVT-021)                                         | test (1) ×2; percorso B; `b38-02`                          |
| PG-53 «sempre preparato non si toglie» e messaggio quando non si può cambiare | Libro e banner in cima alla scheda                                        | Individuazione del magico: «Sempre preparata: non conta nel limite e non si toglie», nessun pulsante. Dopo la conferma: «Preparazione non modificabile ora · Le magie preparate si cambiano al termine di un riposo lungo, quante vuoi», pulsanti disabilitati con il motivo nel suggerimento. Un riposo lungo concluso (beneficio di rest-time) riapre; per bardo/stregone/warlock il nuovo livello, per paladino/ranger una sola magia. Deroga con motivo: il DM su una scheda della campagna, il proprietario su una scheda personale; il giocatore non vede «Deroga del DM».                                                                                             | tabella EN 104 / IT 118                                                                                                    | BG3 spellbook: il messaggio dice quando si può cambiare (CRP-018)                                                      | test (1), (J); percorso C, J; `b38-04`                     |
| PG-54 Liste riutilizzabili                                                    | Gestisci magie → Liste salvate                                            | «Salva le preparate come lista» (Esplorazione, 6 magie; i sempre preparati esclusi); «Richiama» apre la **proposta**: Da preparare (+1 Sonno), Da togliere (−1 Armatura magica), Non disponibili (con motivo: non nel libro, oltre il limite, livello). Con una bozza aperta chiede «Mantieni le modifiche attuali / Sostituiscile con la lista». «Usa come proposta» → bozza «dalla lista» → Conferma. Aggiorna, Elimina (con conferma). Liste personali, invisibili al DM.                                                                                                                                                                                                 | MAG-03 (SPELLCASTING_FLOW)                                                                                                 | lista nominata (modulo Spell Book per Foundry) richiamata come proposta controllabile, non applicata di colpo (F-044)  | test (2); percorso C; `b38-03`                             |
| PG-55 Confronto                                                               | «Confronta» su righe, lista di classe e dettaglio → barra «Confronto (n)» | Tabella affiancata: livello, scuola, tempo, gittata, area, tiro, danni o cure, durata, concentrazione, componenti, effetto; valore mancante «non disponibile», mai zero; nessun vincitore. «Torna alla scelta» chiude e rimette il fuoco su Confronta; stato invariato.                                                                                                                                                                                                                                                                                                                                                                                                      | MAG-04                                                                                                                     | selezione per confronto (Spell Book, F-045)                                                                            | test (3); percorso D; `b38-05`                             |
| PG-56 Rituale (+10 minuti)                                                    | «Come rituale» sulla riga                                                 | Dialogo: «Nessuno slot: rituale», «Orologio personale: Giorno 1 · 00:00 → 00:10», pulsante «Lancia come rituale» → orologio +600 s, slot invariati, concentrazione avviata. Mago: Adepto dei rituali lancia dal libro anche non preparata (serve il libro a portata). Su una scheda della campagna il giocatore crea una **richiesta al DM** (notifica); il DM la applica con «Avanza di 10 min» all'orologio condiviso, o avanza subito se lancia lui. Vietato in combattimento (1 minuto o più).                                                                                                                                                                           | Rituali EN 104 / IT 118; Adepto dei rituali EN 77–78 / IT 60; tempi lunghi EN 105 / IT 119                                 | D&D Beyond «As Ritual» (DDB-042), rituali marcati BG3 (CRP-018); avanzamento del tempo riservato al GM (dnd5e FVT-060) | test (4) ×2; percorso E, J; `b38-06`, `b38-12`             |
| PG-57 Varianti in un'icona e dialogo d'uso                                    | «Lancia ▾» → livelli; dialogo                                             | Dardo incantato: 1° 4/4 · 2° 3/3 · 3° 2/2 (Invio da tastiera apre); il livello scelto è preselezionato nel dialogo, che mostra «Slot di livello 2: 3 → 2», azione, tempo, componenti; Esc non consuma nulla. Gratis del retaggio come variante. Per le magie con azione al Tavolo (Dardo di fuoco, Mani brucianti, Dardo incantato) «Prepara al Tavolo» apre l'anteprima di combattimento esistente con «Slot da usare» = 2, senza consumi. In combattimento: turno, azione/azione bonus, **un solo slot per turno**; le reazioni restano al Tavolo.                                                                                                                         | Slot superiore EN 104 / IT 119; un incantesimo con slot per turno EN 105 / IT 119                                          | varianti BG3 (CRP-100), dialogo d'uso dnd5e (FVT-018), modale di lancio Roll20 (R20-029)                               | test (5), combattimento; percorso F, L; `b38-07`, `b38-15` |
| PG-58 Lanciare da oggetti con cariche                                         | Magie → Incantesimi dagli oggetti                                         | Bacchetta di Livia 3/7: 2 cariche → livello 2 · 4 dardi, dadi fisici 1, 2, 3, 4 → «Cariche: 3 → 1 (nessuno slot)», 4d4 + 4 = 14 registrato; slot invariati; nessuna componente. Ultima carica: avviso prima, poi d20 (fisico/digitale) che blocca nuovi usi, notifica; 1 distrugge l'oggetto; Undo lo riporta in attesa. Anche le tre attività del Bastone del fuoco (Muro di fuoco porta con sé la concentrazione). Cariche, dadi e ricarica all'alba sono quelli dell'Inventario (B36).                                                                                                                                                                                    | Incantesimi dagli oggetti EN 206 / IT 234; Bacchetta di dardi incantati EN 251 / IT 247                                    | attività «Cast» dnd5e sull'oggetto (FVT-020) e dialogo d'uso (FVT-018)                                                 | test (6); percorso I; `b38-11`                             |
| PG-59 Avviso di nuova concentrazione                                          | dialogo di Volare mentre si concentra                                     | «Interromperà la concentrazione su Individuazione del magico», pulsante «Lancia e termina la concentrazione»; leggere i dettagli non mostra l'avviso; il lancio termina la precedente (effetti collegati rimossi, condizioni sostenute chiuse) e il registro lo scrive. Un lancio prolungato in corso (Trova Famiglio) blocca.                                                                                                                                                                                                                                                                                                                                               | Concentrazione EN 179 / IT 206                                                                                             | avviso BG3 Patch 6 (CRP-104), promemoria dnd5e (FVT-031)                                                               | test (7); percorso G; `b38-09`                             |
| PG-60 Trascrivere nel libro                                                   | Gestisci magie → Trascrivi                                                | Pergamena di Ragnatela: 4 ore (2 per livello), 100 mo (50 per livello), Arcano +7 contro CD 12, dado fisico 10 → 17: Ragnatela nel libro, 150 → 50 mo, orologio +4 h, pergamena distrutta. Fallimento: pergamena distrutta, tempo e monete spesi. Da un'altra fonte: stesso costo senza prova. Undo dal registro ripristina tutto; il nuovo tentativo **riusa** la faccia 10 («Riusato»), nessun ritiro gratis. Monete insufficienti spiegate («Servono 150 mo: ne hai 50»).                                                                                                                                                                                                 | Copiare nel libro EN 78 / IT 61; pergamena nel libro EN 244 / IT 271                                                       | «Learn Spells» BG3 sul personaggio giusto, con costo (CRP-018)                                                         | test (8) ×2; percorso H; `b38-10`                          |
| PG-61 Componenti e focus                                                      | dialogo d'uso; sezione «Focus e componenti»                               | Cristallo riposto → Volare bloccato: «Serve un focus impugnato (focus arcano o libro degli incantesimi), una borsa per componenti o il materiale indicato: Cristallo (focus arcano) non è impugnato», Lancia disabilitato; «Impugna il focus» nel dialogo risolve. Materiale senza costo dichiarabile. Materiale di valore consumato (incenso da 10 mo di Trova Famiglio) segnalato; «Registra materiale di valore…» lo aggiunge all'inventario (formato `materialValueGp` già usato da Forme e compagni). Dall'oggetto: nessuna componente. Regola della tavola del DM «Verifica prima del lancio / Non verificare»; deroga del DM con motivo su una scheda della campagna. | Componenti, borsa, focus EN 105–106 / IT 120; focus arcano EN 96 / IT 110; borsa EN 97 / IT 107                            | opzione componenti di Solasta II (CRP-047)                                                                             | test (9); percorso G; `b38-08`                             |

Ruoli e privacy: il DM non legge né modifica le magie di Iria (scheda personale); bozze e liste
sono della sola identità che le crea (commit personali e locali, consentiti anche senza rete); i
lanci su schede personali sono cambi personali; quelli sulle schede della campagna sono
condivisi. Tiri: dadi fisici o digitali in ogni punto dove esiste un tiro (prova di Arcano, d20
dell'ultima carica, dadi dell'effetto dell'oggetto); i digitali usano `rollDie` di `state.mjs` o il
servizio della B36.

## Verifiche

- `node --test design/blueprint/tests/spells-plus.test.mjs`: 15/15 (seme, (1)–(9), combattimento,
  privacy e EN; store e registro reali, Undo e ricarica).
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: 1923/1923.
- Browser (Chromium, `playwright-cli -s=d20-b38 --raw run-code --filename=…/spells-plus-journey.js`
  da `…/d20-blueprint-evidence/2026-09-25/B38/`): **PASS**, 12 sezioni, nessun errore di pagina.
  IT 1440×900 giocatore e DM su Livia, poi contesto EN 390×844 touch; ricarica, Undo, tastiera (Invio
  sulle varianti, Esc che non consuma), nessuno scorrimento orizzontale, controlli ≥ 40 px.
- Immagini controllate a vista (1440×900 salvo dove indicato): `b38-01-magie-it-1440.png`,
  `b38-02-manage-class-list-1440.png`, `b38-03-list-proposal-1440.png`,
  `b38-04-preparation-closed-1440.png`, `b38-05-compare-1440.png`, `b38-06-ritual-1440.png`,
  `b38-07-variants-1440.png`, `b38-08-focus-missing-1440.png`,
  `b38-09-concentration-warning-1440.png`, `b38-10-transcription-1440.png`,
  `b38-11-wand-charges-1440.png`, `b38-12-dm-time-request-1440.png`, `b38-13-phone-en-390.png`,
  `b38-14-phone-manage-en-390.png`, `b38-15-table-preview-1440.png`; stato precedente in
  `00-before-*.png`.
- «Cosa è pronto»: B38 attiva, 4 contributi, nessun avviso.

## Limiti onesti

- Il lancio dalla scheda registra risorse, tempo, concentrazione e componenti; bersagli, tiri
  d'attacco, TS e danni restano del Tavolo solo per le tre magie che il motore di combattimento
  conosce (Dardo di fuoco, Mani brucianti, Dardo incantato; Scudo come reazione). Le altre magie
  non hanno effetti automatizzati: il testo dell'effetto è il riassunto SRD.
- Gli oggetti che lanciano incantesimi funzionano dalla scheda (cariche e dadi della B36); al Tavolo
  la bacchetta non è ancora un'azione della barra (servirebbe un fornitore d'azioni con i dardi).
- Un livello superiore cambia solo ciò che la magia dice: il prototipo non calcola danni scalati
  generici (MAG-06); i dadi dei danni dell'oggetto sono quelli calcolati dalla B36.
- Preparazione: una sola classe incantatrice (la prima della costruzione); multiclasse, sostituzione
  dei trucchetti al riposo lungo e patti del warlock oltre gli slot del patto non sono gestiti.
- Le scelte di livello del libro del mago non registrate si aggiungono dalla Lista di classe; il
  builder (Avanza di livello) resta il percorso ordinario del nuovo livello.
- Componenti: solo i materiali di valore dei campioni SRD sono strutturati; un materiale senza costo
  si soddisfa con focus, borsa o dichiarazione esplicita. Mani libere e armature non indossabili non
  sono controllate.
- Rituali e trascrizioni sulle schede della campagna chiedono il tempo al DM: il lancio è registrato
  subito, l'orologio condiviso avanza quando il DM applica la richiesta. Un lancio di 1 minuto o più
  in combattimento è rifiutato invece di seguire l'azione di Magia turno per turno.
- Durate: solo la concentrazione su schede della campagna scade con l'orologio condiviso; su schede
  personali resta finché non si termina.
- Nessun backend: permessi, privacy e notifiche sono locali a questo browser.

## Revisione e correzioni (B38-rf, revisore indipendente, 24/09/2026)

Revisione separata dal costruttore, nella stessa cartella di lavoro. Sessione del browser
`d20-b38-rf`, immagini in `…/d20-blueprint-evidence/2026-09-25/B38-rf/`. Metodo: lettura completa
di `spells-plus.mjs`, `spells-plus-domain.mjs`, `spells-plus.css` e dei test; confronto con la
scheda B38 del censimento, con i modelli citati (DDB-042/043, FVT-018/020/021/031, CRP-018/047/100/104,
MAG-03/04) e con la scheda Magie del core sostituita; prove nel browser prima delle correzioni
(sonde `probe1–12.js` nella cartella delle immagini), poi test scritti prima delle correzioni.

### Difetti trovati e corretti

| #   | Gravità | Riproduzione (prima)                                                                                                                                                                                                                                                      | Correzione                                                                                                                                                                                                                                                                       | Prova                                                    |
| --- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| 1   | P2      | Tastiera: Gestisci magie → Tab su «Togli» (Armatura magica) → Invio: il fuoco finisce sul `BODY` (sonda 1). Stesso per «Aggiungi al libro». Il bersaglio del fuoco veniva impostato dopo il commit (che ridisegna subito) e restava in sospeso per un disegno successivo. | `withFocus`: il bersaglio si imposta prima del commit e si scarta se il comando è rifiutato. Prepara/Togli restano sul proprio pulsante; Aggiungi al libro e Impara passano al pulsante della stessa riga; Conferma preparazione e Annulla modifiche tornano a «Gestisci magie». | percorso R1                                              |
| 2   | P2      | Preferenze → Tema «Chiaro»: statistiche, pannello Gestisci magie e bozza restano scuri con testo scuro (contrasto 1,05:1); «Nel libro» e il distintivo C 1,45:1 (sonda 5, `rf-05-light-theme-before.png`). Colori fissi nel CSS.                                          | Solo variabili condivise (`--bg`, `--surface`, `--accent`, `--positive` con `color-mix`) e una coppia chiaro/scuro per l'azzurro; valgono anche le palette per la visione dei colori.                                                                                            | percorso R9 (8,08–14,86:1), `rf-12-light-theme-1440.png` |
| 3   | P2      | Lista di classe: «Fonte» era un menu con una sola opzione e nessun effetto (controllo finto).                                                                                                                                                                             | Diventa testo «Fonte: SRD 5.2.1 · 2024» con la nota già presente sulle versioni 2014.                                                                                                                                                                                            | test «no inert source picker»; R2                        |
| 4   | P2      | Il core «Registra preparazione» era sparito da tutte le righe: una magia annotata su una scheda senza classe incantatrice (Doran) o concessa da un talento restava «Non preparata» per sempre, senza lancio né correzione.                                                | Il pulsante del core (`data-character-action="prepare-spell"`, stesso dialogo) torna sulle righe che la preparazione di classe non governa (`outsideClassPreparation`); le righe di classe restano nel flusso Gestisci magie.                                                    | test dedicato; R6                                        |
| 5   | P2      | In combattimento, dalla scheda, Dardo di fuoco / Mani brucianti / Dardo incantato spendevano azione e slot senza bersagli, tiri né danni; poi il Tavolo rifiutava (azione già spesa): effetto perso.                                                                      | In combattimento queste magie si rifiutano con «In combattimento questa magia si lancia al Tavolo…: usa «Prepara al Tavolo»»; il pulsante resta nel dialogo. Fuori dal combattimento «Lancia» registra come il Cast di D&D Beyond.                                               | test «in combat a Table spell…»                          |
| 6   | P2      | Livia (campagna): dopo «Avanza di 10 min» o «Rifiuta…» del DM il registro del giocatore diceva ancora «+10 min richiesti al DM»; il motivo del rifiuto non si vedeva da nessuna parte.                                                                                    | La riga legge lo stato della richiesta: «applicati dal DM (Giorno 1 · 00:00 → 00:10)» oppure «rifiutati dal DM: <motivo>» (EN «applied/declined by the DM»).                                                                                                                     | test dedicato; R5, `rf-11`, `rf-13`                      |
| 7   | P3      | Il quinto «Confronta» toglieva in silenzio il più vecchio.                                                                                                                                                                                                                | Resta il limite di 4, con l'avviso «Confronto: massimo 4 magie, tolta «…»».                                                                                                                                                                                                      | test; R2                                                 |
| 8   | P3      | Nel dialogo d'uso, riportare «Materiale dall'inventario» su «Scegli l'oggetto» non annullava la scelta precedente.                                                                                                                                                        | La scelta vuota si registra; torna «Manca il componente materiale».                                                                                                                                                                                                              | R7                                                       |
| 9   | P3      | Il comando della palette «Gestisci le magie di questa scheda» non verificava il controllo della scheda.                                                                                                                                                                   | Appare solo su una scheda che controlli.                                                                                                                                                                                                                                         | test                                                     |
| 10  | P3      | Scheda della campagna con preparazione chiusa: il giocatore non sapeva a chi chiedere un'eccezione.                                                                                                                                                                       | Riga sotto il messaggio: «Per un'eccezione … chiedi al DM: la registra con un motivo.»                                                                                                                                                                                           | test; R5                                                 |
| 11  | P3      | Dettagli → «Aggiungi al confronto» con una sola magia nel confronto mandava il fuoco su un pulsante disabilitato.                                                                                                                                                         | Il fuoco va su «Confronta» del vassoio se usabile, altrimenti sul Confronta della magia.                                                                                                                                                                                         | lettura del codice                                       |

### Verificato senza difetti

- Riposo lungo **reale** dall'interfaccia dei riposi (Riposa → Riposo lungo · Trance → 240 min →
  Applica): la preparazione di Iria si riapre e Passo velato torna gratis (R3, `rf-10`); il test
  del costruttore usava un riposo scritto a mano, ora c'è anche un test con l'API di `rest-time`.
- La regola delle componenti scelta dal DM nelle Preferenze arriva davvero alla scheda (R4; prima
  provata solo nel dominio). Offline: lancio personale registrato, lancio sulla campagna fermo nel
  dialogo con il messaggio (R8). Destinazioni ≥ 40 px e nessuno scorrimento orizzontale a 390 px
  (IT, sonde 2–4 e R10); le schede della sezione scorrono di lato come nel resto della scheda.
- Posizionamento B61: tutto nella scheda Magie, Preferenze, notifiche e palette; nessuna riga di
  pulsanti in un'intestazione. Modifica condivisa `combat-ui.mjs` (`prepareCombatAction`) solo
  aggiuntiva.
- Non difetti: Livia (mai confermata) e Mira (druida senza magie) restano chiuse fino a un riposo
  lungo o a una deroga del DM, coerente con la regola 2024 (si cambia al termine di un riposo
  lungo); le scelte iniziali sono del builder. L'etichetta «Annota magia concessa» usa lo stesso
  gestore del core (`add-spell`) e il titolo del suo dialogo. «Concessione annotata» sulle righe di
  Iria senza `grantId` è la stessa etichetta del core.

### Resta aperto

- PG-53 «filtri di fonte» è parziale: il catalogo delle magie del prototipo ha una sola fonte
  (SRD 5.2.1) e gli incantesimi homebrew non hanno liste di classe; entrano dalla Biblioteca
  («Cerca nella Biblioteca»). Un vero filtro richiede una seconda fonte con liste di classe.
- Fuori area (non toccato): le caselle derivate della B37 (CA, Iniziativa… in `sheet-plus`) restano
  scure nel tema chiaro (visibile in `rf-12-light-theme-1440.png`).

### File e verifiche della revisione

- Modificati (area B38): `spells-plus.mjs`, `spells-plus-domain.mjs`, `spells-plus.css`,
  `tests/spells-plus.test.mjs` (+6 test «review:»). Nuovo:
  `changes/interview-01/blueprint-checks/spells-plus-review-journey.js`. Nessun file condiviso toccato.
- `node --test design/blueprint/tests/spells-plus.test.mjs`: 21/21.
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: 2009/2009 (una prima esecuzione
  aveva fallimenti transitori in `knowledge.test.mjs` di un'altra area in lavorazione; rieseguita).
- Percorso del costruttore rieseguito nella sessione `d20-b38-rf` dopo le correzioni: PASS
  (immagini in `B38-rf/builder-rerun/`). Percorso di revisione `spells-plus-review-journey.js`:
  PASS, 10 sezioni (R1–R10), nessun errore di pagina.
