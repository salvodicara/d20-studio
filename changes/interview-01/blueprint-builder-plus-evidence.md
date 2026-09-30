# B39 — Creazione: percorsi rapidi, personaggi pronti e controlli — evidenze

24/09/2026 (cartella delle immagini assegnata: `2026-09-25/B39`). Area `builder-plus`, caricata
dal registro (`extensions.mjs` la elencava già). Dati sintetici; nessun servizio reale.

## Dove si trova (regola di posizionamento B61)

Nessun pulsante nuovo nelle intestazioni. I tre metodi di D&D Beyond compaiono **in cima alla
sezione Identità** di una bozza nuova, cioè dopo «Crea personaggio» (DDB-009: prima il metodo),
e nella pagina delle bozze del builder («Altri modi per creare»). Percorso rapido, personaggi
pronti e bozze condivise sono sezioni di una sola pagina d'area, `#builder-plus` (non in
navigazione). I controlli stanno nella sezione del builder a cui appartengono; scendere di
livello, rifacimento ed eccezioni alle regole stanno nella scheda **Capacità** (dnd5e mette lì il
livello della classe), la dotazione iniziale riapribile nella scheda **Inventario** (DDB «More →
Starting Equipment»). Comandi della palette: «Crea personaggio: percorso rapido», «Personaggi
pronti», «Bozze condivise dei personaggi». Il DM riceve l'invito e le novità della bozza condivisa
nel centro notifiche (B24).

Clic: Inizio → Personaggi → Crea personaggio → Percorso rapido / Personaggio pronto (3).
Scheda → Capacità → Scendi di livello / Rifai da capo (2). Scheda → Inventario → Riapri dotazione
(2). DM: campanella → riga «Bozza condivisa» (2).

## File

Nuovi (solo miei): `design/blueprint/builder-plus.mjs` (ingresso, interfaccia),
`design/blueprint/builder-plus-domain.mjs` (dominio puro), `design/blueprint/builder-plus.css`,
`design/blueprint/tests/builder-plus.test.mjs`,
`changes/interview-01/blueprint-checks/builder-plus-journey.js`, questo rapporto.

Modifica **aggiuntiva** a un file condiviso, prevista dalla scheda B39 («hook di sezione»):
`design/blueprint/character-builder.mjs` — nuovo export `registerBuilderPanel(panel)` e quattro
righe di aggancio (render all'inizio/fine della sezione, in fondo all'elenco delle bozze, bind).
Un pannello è `{id, sections: [id delle sezioni | "drafts"], placement?: "start" | "end",
render(ctx, api) → html, bind?(el, ctx, api)}`; `api` = `{draft, section, data(), dirty(),
preview(), change(mutator)}`, dove `change` modifica i dati di lavoro della sessione del builder e
salva la bozza privata come fa il builder. Ogni render/bind è isolato (un pannello rotto mostra un
avviso circoscritto). Senza pannelli il markup è identico al precedente (41/41 test del builder
invariati). Firme ed esiti esistenti invariati. Nessun'altra modifica a file condivisi: le altre
integrazioni passano dal registro (`route`, due `sheet-section`, `notifications`, tre `command`,
`draft-guard`, due sezioni di stato) e dai moduli di dominio esistenti importati
(`character-build`, `character-rules`, `srd-sample`, `media-domain`, `character-access`).

Stato: `state.ext["builder-plus"]` (Undo a istantanea: percorsi rapidi, origini delle schede,
dotazioni riaperte, tiri dell'oro, rifacimenti, discese di livello) e
`state.ext["builder-plus-cobuild"]` (Undo `preserve`, comandi `undoable:false`: la correzione è
«Ripristina il valore precedente», che aggiunge una revisione). Le costruzioni restano quelle del
builder: `characterDrafts`, `actor.characterBuild`, applicate con `applyCharacterDraft`.

## Capacità → prove

| Capacità (censimento)                                 | Percorso                                                                                                                                          | Comandi e risultato                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Regola / fonte                                                                                                                                                                          | Pattern adottato                                                                                                                              | Prova                                                                                                                                                                                              |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-09 percorso rapido di livello 1                    | Personaggi → Crea personaggio → Percorso rapido → `#builder-plus?tab=quick&id=<bozza>`                                                            | Cinque passi (Classe, Background, Specie, Nome e ritratto, Riepilogo) con carte e **pagine di dettaglio**; «Scegli X»; ricarica: passo, nome e ritratto restano; «Crea personaggio» applica la bozza con il builder e apre la scheda (privata, fuori campagna, niente equipaggiato); «Rivedi scelte» resta disponibile. «Modifica nel passo per passo» passa le scelte al builder completo.                                                                                                                                                                                                     | Serie standard per classe EN 21 / IT 23; consigli stampati per classe (es. Mago EN 77–78 / IT 60, Difesa EN 47 / IT 53, Abile EN 86 / IT 97); tutto validato da `previewCharacterDraft` | D&D Beyond Quickbuilder (DDB-010), bozza creata subito (DDB-011), BG3 creatore a pannelli (CRP-010)                                           | Journey A (3 clic, dettaglio, ricarica, creazione); test «every quick class × background × species…» (432 combinazioni, 0 errori del builder); immagini 01–05, 19–20                               |
| PG-10 nomi suggeriti                                  | Percorso rapido › Nome e ritratto; builder › Identità (bozze nuove)                                                                               | Sei nomi per pagina, «Suggerisci altri» cambia l'elenco, il nome cambia solo al clic; ritratto: iniziale, 8 emblemi (PNG generato e salvato nella libreria immagini B28) o un ritratto già caricato.                                                                                                                                                                                                                                                                                                                                                                                            | Nomi scritti dall'app (nessun elenco di manuale)                                                                                                                                        | DDB «Suggest More» (DDB-021), picker del ritratto del Quickbuilder (DDB-010)                                                                  | Journey A (Suggerisci altri, scelta, ritratto sulla carta dell'elenco); test UI «builder identity…»; immagine 04                                                                                   |
| PG-09 personaggi pronti e Reclama                     | Crea personaggio → Personaggio pronto → `#builder-plus?tab=premade[&id=]`                                                                         | 4 personaggi (Brann G1, Sefa C1, Kessa G2/M1, Oren D5) con anteprima calcolata dal builder; «Reclama» crea una copia privata con provenienza (`actor.premade`), ripetibile; con aspetti da verificare serve la conferma; la bozza vuota da cui si arriva viene scartata.                                                                                                                                                                                                                                                                                                                        | Costruzioni SRD 5.2.1 validate dal builder; dati sintetici `blueprint-b39-premades-1`                                                                                                   | DDB Premade + Claim (DDB-004/009), Roll20 pronti con livelli già scelti (R20-020), Alchemy Premades (VTL-025)                                 | Journey D e G (claim da desktop e da telefono); test «ready-made characters…»; immagini 10–11, 21                                                                                                  |
| PG-11 prerequisiti con eccezione segnalata            | Scheda → Rivedi scelte → Capacità e talenti                                                                                                       | «Talenti bloccati dai requisiti»: Lottatore «Bloccato», motivo e valori (Forza 8 · Destrezza 12); «Consenti eccezione e scegli…» chiede un motivo (vuoto rifiutato), attiva la deroga del builder, sceglie il talento; dopo «Applica alla scheda» la scheda (Capacità) mostra **Eccezioni alle regole** con requisito, valori, motivo, autore e data, anche dopo ricarica. La deroga non vale per il multiclasse.                                                                                                                                                                               | Lottatore EN 87 / IT 98; I-059/I-060                                                                                                                                                    | DDB prerequisiti con bypass e scelte fuori regola conservate con avviso (DDB-016)                                                             | Journey E; test «a feat with an unmet prerequisite…» e «builder features…»; immagini 14–15                                                                                                         |
| PG-12 competenza duplicata                            | Builder › Background e specie / Competenze                                                                                                        | Scelta di classe Atletica, poi background Soldato: la scelta duplicata viene liberata subito con l'avviso «Atletica ora è concessa da Soldato… scegli un'altra competenza», «Vai alle competenze», «Ho capito». Vale anche per l'abilità a scelta della specie.                                                                                                                                                                                                                                                                                                                                 | Background e competenze EN 83 / IT 93                                                                                                                                                   | DDB duplicate-proficiency detection (DDB-017)                                                                                                 | Journey C; test «duplicate proficiencies…» e «builder origin…»; immagine 09                                                                                                                        |
| PG-13 dotazione iniziale: pacchetti o oro, riapribile | Percorso rapido › Riepilogo «Cambia dotazione…»; builder › Equipaggiamento «Pacchetti iniziali»; scheda › Inventario «Riapri dotazione iniziale…» | Per classe e background: pacchetto (A/B) **oppure** il suo oro, mai entrambi; anteprima «Rimuove / Aggiunge / Restano come sono / Oro 18 → 169»; gli oggetti tenuti restano come sono (quantità, equipaggiato); l'oro già speso impedisce di tornare indietro; «Annulla» nell'avviso. Partenza dal 5° livello: «500 mo più 1d10 × 25 mo», dado fisico (faccia 1–10) o digitale (servizio `rollDie`, dadi 3D B56), correzione con motivo, prova nel registro; dopo Annulla un nuovo tiro digitale riusa la faccia ritirata (I-229). Oggetti magici: indicazione per il DM, mai aggiunti da soli. | Pacchetti: Guerriero EN 47 / IT 53, Mago EN 77 / IT 59, Chierico EN 36 / IT 41, Ladro EN 61 / IT 55, Druido EN 41 / IT 46, background EN 83 / IT 93; livelli superiori EN 24 / IT 27    | DDB Starting Equipment (DDB-019), dnd5e dotazione di classe/background (FVT-015)                                                              | Journey B (C al posto di A, Undo) ed E (d10 = 7 → 675 mo, ricarica); test «starting equipment…», «starting at level 5…», «a digital retry…», «sheet: the starting gold roll…»; immagini 06, 16, 22 |
| PG-14 fonti per categoria e opzioni nascoste          | Builder › Fonti; avvisi in Background e specie, Capacità e talenti e nella griglia delle specie del percorso rapido                               | Categorie con descrizione (Regole 2024, Legacy 2014, Homebrew); Legacy spenta: «**3 opzioni nascoste** dalle fonti disattivate»; accesa (Spazio sull'interruttore): le 3 opzioni compaiono con badge Legacy e «Registra come capacità manuale» (provenienza SRD 5.1, nessuna regola 2014 nei calcoli 2024). Una scheda di campagna la trova bloccata se la politica della campagna blocca il legacy.                                                                                                                                                                                            | SRD 5.1 CC-BY-4.0 (pagine non verificate, vedi limiti); politica B20 `legacySources`                                                                                                    | DDB categorie di contenuti con messaggio «opzioni nascoste» (DDB-015), badge Legacy (DDB-165), avviso di mescolanza FG (R20-042); I-062/I-063 | Journey C; test «disabled legacy sources…»; immagine 08                                                                                                                                            |
| PG-15 multiclasse con requisiti                       | Builder › Classi e punti ferita (tabella «Requisiti del multiclasse»); anteprima dei pronti; scheda › Capacità                                    | Per ogni classe: requisito, valori attuali, Soddisfatto/Bloccato (Guerriero 1 + Mago: «Intelligenza 13 · Intelligenza 8 · Bloccato»); Kessa Guerriero 2 / Mago 1: tutti soddisfatti.                                                                                                                                                                                                                                                                                                                                                                                                            | Multiclasse EN 24 / IT 27                                                                                                                                                               | DDB prerequisiti del multiclasse (DDB-016/023), Roll20 aggiunta classe nel builder (R20-018)                                                  | Journey B e D; test «multiclass prerequisites…»; immagini 07, 11                                                                                                                                   |
| PG-16 scendere di livello e rifacimento completo      | Scheda › Capacità › «Livelli e rifacimento»                                                                                                       | «Scendi di livello…» per classe: anteprima di privilegi, magie, slot, Dadi Vita, PF massimi e scelte liberate; conferma; avviso con «Annulla». Minimo livello 1; la classe iniziale resta finché ci sono altre classi; PF del livello tolto dal metodo registrato, altrimenti chiesti. «Rifai da capo…» apre una bozza «revise» su Classi: specie, background, nome, storia, lingue e oggetti restano, il resto si risceglie fino al livello attuale (banner «livelli scelti 0/3»); la scheda cambia solo applicando il riepilogo.                                                              | Creazione e avanzamento EN 19–25 / IT 23–27; ADV-08                                                                                                                                     | dnd5e Level Down con conferma (FVT-012), BG3 respec (CRP-014)                                                                                 | Journey D (Mago 1 tolto e Annulla; rifacimento aperto e scartato); test «level down…», «…asks for the maximum HP…», «full rebuild…» (rifacimento applicato fino a Guerriero 3); immagini 12–13     |
| PG-19 DM e giocatore sulla stessa bozza               | Builder › Identità «Costruisci con il DM…» → `#builder-plus?tab=cobuild&id=`; DM: centro notifiche                                                | Dichiarazione di cosa si condivide; ogni identità scrive in una copia non pubblicata; l'altra vede solo «Il giocatore sta modificando qui» (mai il testo); «Pubblica modifiche»; se il campo è cambiato nel frattempo: conflitto esplicito «La tua versione / Versione del DM · rev 1» con «Tieni la mia» / «Usa la versione del DM»; cronologia con «Ripristina il valore precedente»; il proprietario porta i campi nella propria bozza privata; il DM viene invitato e avvisato dal centro notifiche.                                                                                        | Nessuna regola di gioco (identità e privacy del prototipo)                                                                                                                              | Quest Portal co-costruzione con cursori multipli (VTL-022)                                                                                    | Journey F (ruoli giocatore/DM, conflitto, notifica, trasferimento); test «co-building…» e «co-building page…»; immagini 17–18, 23                                                                  |

## Verifiche

- `node --test design/blueprint/tests/builder-plus.test.mjs`: **27/27**.
- `node --test design/blueprint/tests/character-builder-ui.test.mjs tests/character-build.test.mjs`
  dopo l'aggancio: 41/41.
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: 1589/1596; i 7 fallimenti sono
  tutti in `tests/projects.test.mjs` (area di un altro costruttore in corso; in una corsa precedente
  fallivano invece 6 test di `sessions-plus.test.mjs`, poi verdi). Nessun fallimento in B39 o nel
  builder.
- Browser (Chromium, playwright-cli, sessione `d20-b39`, server `127.0.0.1:8879`):
  `builder-plus-journey.js` → **PASS**, 18 verifiche, nessun errore di pagina; esito salvato in
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B39/journey-result.json`.
  Copre IT desktop 1440×900 (clic, Invio e Spazio da tastiera), EN telefono 390×844 con tocchi
  (niente overflow orizzontale, ogni controllo B39 ≥ 40 px), ricarica, Annulla, correzione, giocatore
  e DM.
- Immagini 1440×900 (e telefono 390) ispezionate:
  `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B39/01…23-*.png`.
- File formattati con Prettier (il giornale senza il punto e virgola finale richiesto dalla CLI).

## Limiti onesti

- **Scelte dell'app nel percorso rapido**: dove la SRD stampa un consiglio (serie standard per
  classe, incantesimi e trucchetti consigliati, Difesa, Abile, maestria del Ladro) lo si segue e lo
  si dichiara; abilità di classe, padronanze d'arma, lingue, sottoscelte della specie, +2/+1 del
  background e incantesimi mancanti dal catalogo sono proposte dell'app, dette come tali e
  modificabili. Solo livello 1, come il Quickbuilder.
- **Nessun equipaggiamento automatico** (deviazione voluta da DDB: contratto CRE-07/I-172): la CA
  iniziale resta quella senza armatura finché il giocatore non equipaggia.
- **Pacchetti di oggetti** catalogati per Guerriero, Mago, Chierico, Ladro, Druido e i 4 background;
  per le altre 7 classi c'è solo l'oro alternativo, con l'avviso. Il libro degli incantesimi non ha
  peso nella SRD 5.2.1: 0 finché non lo si registra. Pesi in kg come li stampa la SRD italiana.
- **Legacy 2014**: 3 voci d'esempio (Mezzelfo, Mezzorco, Lottatore 2014) dalla SRD 5.1 CC-BY-4.0,
  **pagine non verificate** (il PDF 5.1 non era disponibile localmente; nessuna citazione inventata)
  e nomi italiani dell'app; si registrano solo come capacità manuali. Collegare alla campagna una
  scheda personale con contenuti legacy non viene rifiutato dal collegamento del core (solo
  avvisato qui): da decidere.
- **Oro tirato** solo per partenze dal 5° livello (unico tiro della SRD 2024); al 1° livello l'oro
  alternativo è fisso. Gli oggetti magici della tabella restano un'indicazione per il DM.
- **Co-costruzione**: due identità simulate nello stesso browser, nessuna sincronizzazione in tempo
  reale; la «presenza» è l'esistenza di modifiche non pubblicate su un campo (non cursori o
  battiture); caratteristiche, tiri e scelte meccaniche non si co-modificano (restano nella bozza
  privata del proprietario, che porta nel builder nome, classe, specie, background e storia).
- **Scendere di livello** toglie l'ultimo livello preso nella classe scelta; le scelte in eccesso si
  tolgono dalla fine e sono elencate nell'anteprima (non si chiede quale tenere). Il rifacimento
  completo è applicato nel test Node; nel browser si apre e si scarta.
- **Ritratti**: emblemi generati come PNG 128×128 nella libreria immagini (B28); senza quell'area il
  ritratto resta solo nell'origine B39.
- **Rilievo sul core (non modificato)**: `featEligibility` di `character-build.mjs` conta
  l'aumento di caratteristica del talento stesso per il suo requisito (Lottatore con +1 Destrezza
  porta 12 a 13 e risulta «idoneo», e il builder non chiede la deroga). Le proiezioni B39 (pannello
  e scheda) usano i punteggi _prima_ del talento, come vuole la regola; conviene correggere il core.
- I personaggi a più livelli (Kessa, Oren) portano gli avvisi «catalogo parziale» del builder:
  reclamarli richiede la conferma esplicita, come per ogni costruzione oltre il 1° livello.
- DDB accende tutte le categorie per i personaggi nuovi; qui Legacy parte spenta (base 2024).

## Review and fixes

24/09/2026 · revisione indipendente (sessione `d20-b39-rf`, cartella
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-25/B39-rf/`). Ho controllato
le 8 accettazioni nell'app in esecuzione (clic, tastiera, tocco, ricarica, giocatore/DM, IT/EN,
390 px), la fedeltà ai pattern citati, i comandi inerti, la coerenza con scheda/campagna, la
privacy, il fuori rete, Undo/correzioni, i test e il posizionamento B61. Il percorso di base del
costruttore passava (18 verifiche) perché premeva Tab prima di ogni clic: così nascondeva i
difetti P2 qui sotto, che si vedono appena si scrive e poi si clicca.

### Difetti trovati

| #   | Gravità | Riproduzione (prima della correzione)                                                                                                                                                                                                                                                                                                                | Esito                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | P2      | Percorso rapido › Nome e ritratto: scrivi «Aelinor» e clicca subito «Continua al riepilogo» (o «Suggerisci altri», un nome, un ritratto, un passo). Il clic va perso: il nome si salvava all'uscita dal campo e ridisegnava la pagina tra pressione e rilascio del pulsante. Resti su «Nome e ritratto».                                             | **Corretto.** Un campo di testo ora si salva _dopo_ il clic del comando premuto (il suo gestore salva già il nome), dopo Tab quando il fuoco si è spostato (il fuoco torna dove era andato), subito solo se si preme una tendina. Verificato: un clic basta e salva nome e pagina dei nomi; Tab salva e porta il fuoco al nome suggerito successivo.                                                                                                               |
| 2   | P2      | Bozza condivisa: scrivi «Brann» nel Nome e clicca «Pubblica modifiche»: resta una modifica non pubblicata e non si pubblica niente. Clicca dal Nome nel campo «Idea del personaggio» e scrivi: il fuoco torna al Nome e il testo finisce nel campo sbagliato («Brannok» scritto nell'Idea). Tab da un campo modificato ti lascia nello stesso campo. | **Corretto** con lo stesso meccanismo. «Pubblica» salva prima il testo nel campo e poi pubblica (anche «Tieni la mia», «Scarta», «Ripristina», «Porta nella mia bozza», «Chiudi»). Ogni salvataggio usa la modifica presa all'uscita dal campo: scrivere subito in un altro campo non la sostituisce più (prima, con una digitazione veloce, il primo testo andava perso). Navigare dall'intestazione dopo aver scritto non apre più la domanda: salva e prosegue. |
| 3   | P2      | Bozza condivisa › «Chiudi la bozza condivisa»: la finestra promette «Resta in sola lettura con la sua cronologia», ma la bozza sparisce dall'elenco e il suo indirizzo mostra l'elenco. Idea e agganci (che il trasferimento nel builder non porta) diventano irraggiungibili.                                                                       | **Corretto.** Le bozze chiuse restano nell'elenco con il badge «Chiusa» (anche il pulsante «Bozze condivise» della pagina delle bozze le conta), si aprono in sola lettura con campi disattivati e cronologia, senza Pubblica/Ripristina/Scarta; non generano notifiche.                                                                                                                                                                                           |
| 4   | P3      | Tastiera: dopo «Scegli Mago», un cambio di passo o «Continua», dopo «Annulla»/«Chiudi» negli avvisi della scheda e dopo «Scendi di livello»/«Applica dotazione» il fuoco tornava all'inizio della pagina.                                                                                                                                            | **Corretto.** Il fuoco va al titolo del nuovo passo, al titolo della sezione dopo Annulla/Chiudi e al pulsante «Annulla» dell'avviso dopo aver applicato.                                                                                                                                                                                                                                                                                                          |
| 5   | P3      | «Passa al passo per passo» in cima al percorso rapido apriva il builder con la bozza vuota: le scelte fatte fin lì restavano solo nel percorso rapido.                                                                                                                                                                                               | **Corretto.** Porta le scelte nel builder (tutte composte se classe, background e specie ci sono, altrimenti classe, background e nome) e apre la prima sezione da scegliere, come «Modifica nel passo per passo».                                                                                                                                                                                                                                                 |
| 6   | P3      | In inglese l'anteprima e la copia reclamata dei personaggi pronti avevano la storia in italiano.                                                                                                                                                                                                                                                     | **Corretto.** Aspetto e storia sono scritti in IT/EN; «Reclama» copia il testo nella lingua di chi reclama.                                                                                                                                                                                                                                                                                                                                                        |
| 7   | P3      | Il PNG dell'emblema (~24 KB) restava anche nel percorso rapido concluso, oltre che nella libreria immagini; l'immagine si chiamava «Nome — emblem-arcane».                                                                                                                                                                                           | **Corretto.** Dopo la creazione resta solo l'id dell'emblema; l'immagine si chiama «Nome — Emblema Arcano» / «Arcane emblem».                                                                                                                                                                                                                                                                                                                                      |
| 8   | P3      | Elenco delle bozze condivise: più pulsanti «Apri» senza contesto per chi usa un lettore di schermo.                                                                                                                                                                                                                                                  | **Corretto:** «Apri Brann». I campi di una bozza chiusa si vedono disattivati.                                                                                                                                                                                                                                                                                                                                                                                     |

### Non difetti e limiti registrati

- **Nomi inglesi nell'interfaccia italiana** (es. «Spellcasting», «Darkvision» nelle pagine del
  percorso rapido e nell'anteprima): vengono dal catalogo del core `character-rules.mjs`, dove
  quei nomi hanno la stessa stringa in IT e EN; il builder mostra gli stessi. Non è un file B39:
  serve un compito sul catalogo. Anche le pagine IT mancanti in alcune fonti («SRD 5.2.1 · EN 77»)
  sono dati del catalogo, mostrati onestamente.
- **Conflitti espliciti della bozza condivisa** («Tieni la mia» / «Usa la versione del DM»): il
  censimento cita VTL-022 solo per la co-costruzione con presenza; la risoluzione esplicita è
  richiesta dall'accettazione (8) della scheda B39, quindi resta, ma non ha una fonte di mercato
  propria.
- **Bozza condivisa avviata dal DM**: solo chi l'ha avviata la porta nel builder, quindi la scheda
  risultante è del DM; non c'è un passaggio al giocatore. Idea e agganci non entrano nella scheda
  (la storia del builder ha solo aspetto e storia): restano leggibili nella bozza condivisa, anche
  chiusa. Decisioni di prodotto aperte.
- **Tendina dopo la scrittura**: se stai scrivendo e premi una tendina (Classe nella bozza
  condivisa, «Visita come»), il testo si salva alla pressione e la tendina va riaperta con un
  secondo clic (il fuoco resta su di essa). Limite dell'app che ridisegna tutta la pagina a ogni
  modifica; i pulsanti, i nomi e i ritratti non hanno più questo problema.
- **Nessuna regressione dal file condiviso**: la revisione non ha toccato `character-builder.mjs` né
  altri file condivisi; i test del builder passano. Posizionamento B61 confermato: niente nelle
  intestazioni né al Tavolo; sezioni nelle schede Capacità/Inventario della scheda, pagina d'area
  fuori dalla navigazione, tre comandi e il centro notifiche.
- Fedeltà ai pattern confermata per percorso rapido (DDB 2024: Classe → Background → Specie →
  nome), Reclama (DDB), «Suggerisci altri» (DDB), Level Down con anteprima (dnd5e), respec (BG3).

### File toccati dalla revisione

Solo file dell'incremento: `design/blueprint/builder-plus.mjs`,
`design/blueprint/builder-plus-domain.mjs` (bozze chiuse elencabili con `includeClosed`, storie
IT/EN con `premadeBuild(id, lang)` e `claimPremade(..., {lang})`, `moveQuickToBuilder` anche con
scelte parziali), `design/blueprint/builder-plus.css`, `design/blueprint/tests/builder-plus.test.mjs`,
`changes/interview-01/blueprint-checks/builder-plus-journey.js`, questo rapporto. Nessun file
condiviso modificato.

### Verifiche dopo le correzioni

- `node --test design/blueprint/tests/builder-plus.test.mjs`: **35/35** (27 + 8 nuovi: Pubblica con
  il testo ancora nel campo; bozza chiusa elencata e in sola lettura; tempi del salvataggio; storia
  in inglese e nessuna copia del ritratto; passaggio a metà percorso; bozza chiusa nel dominio;
  storie IT/EN; Pubblica fuori rete rifiutata con messaggio, testo tenuto come modifica locale). I
  nuovi test della pagina falliscono sul codice di prima (il doppio degli elementi ora vede le
  `section` e nessun campo ha il fuoco, come nel browser dopo un clic).
- Suite completa `node --test design/blueprint/tests/*.test.mjs`: **1698/1698**.
- Browser: `builder-plus-journey.js` → **PASS, 20 verifiche**, nessun errore di pagina. Nuove
  verifiche con azioni reali senza Tab: nome scritto e un solo clic su «Suggerisci altri»; Tab che
  salva e sposta il fuoco; clic in un altro campo della bozza condivisa con la digitazione che resta
  lì; «Pubblica» subito dopo aver scritto; al telefono nome scritto e un solo tocco su «Continue to
  review»; Brann reclamato in inglese con storia inglese; bozza chiusa elencata («Closed») e in sola
  lettura. Eseguito da una copia con le immagini in `B39-rf/journey/` (lo script continua a
  scrivere in `B39/`); esito in `B39-rf/journey-result.json`, immagini della revisione
  `B39-rf/r01…r10-*.png`.
