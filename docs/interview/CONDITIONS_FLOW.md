# Condizioni e sopravvivenza — scheda, Tavolo e richieste

24/09/2026. Percorsi dell'incremento 10 nella stessa app locale autorizzata da
D-013/I-218. Descrive comandi presenti nel codice, vincoli del dominio e
frontiere aperte. Non dichiara completa la famiglia delle condizioni, né
approvato il contratto intero o pronto un motore di produzione. Lo stile resta
provvisorio e **non approvato** (I-227); collocazione dei comandi, gerarchia e
comportamento sono invece parte del contratto.

Autorità: [I-228](DECISIONS.md#i-228--condizioni-e-sopravvivenza-collegate-a-scheda-tavolo-e-richieste),
[I-229](DECISIONS.md#i-229--undo-e-correzione-dei-dadi-mai-un-rilancio)
e [I-234](DECISIONS.md#i-234--ts-contro-la-morte-fuori-iniziativa-su-richiesta-dalla-scheda),
coerenti con I-181, I-027/I-028/I-032/I-035 e I-219/I-220. Regole e confronti:
[R194](../../changes/interview-01/blueprint-conditions-research.md) (N01–N17,
P01–P09, T01–T16). Firme e invarianti:
[API](../../changes/interview-01/blueprint-conditions-api.md) e
[raccordi](../../changes/interview-01/blueprint-conditions-seams.md). Evidenze:
[dominio](../../changes/interview-01/blueprint-conditions-domain.md),
[UI](../../changes/interview-01/blueprint-conditions-ui.md),
[integrazione](../../changes/interview-01/blueprint-conditions-integration.md),
[dadi](../../changes/interview-01/blueprint-dice-correction-review.md),
[review regole](../../changes/interview-01/blueprint-conditions-rules-review.md),
[review UX](../../changes/interview-01/blueprint-conditions-ux-review.md),
[correzioni](../../changes/interview-01/blueprint-conditions-fixes.md),
[chiusura](../../changes/interview-01/blueprint-conditions-closure.md),
[correzioni dopo le review B11b/inc10](../../changes/interview-01/blueprint-b11b-inc10-fixes.md).
Il testo è stato confrontato con `conditions.mjs`, `conditions-ui.mjs`,
`combat.mjs`, `combat-ui.mjs`, `table.mjs` e `characters.mjs`; non è una nuova
osservazione runtime dei concorrenti.

## Tre cose distinte nello stesso pannello

| Oggetto           | Identità e conseguenze                                                                                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Condizione SRD    | Una delle 15 definizioni 2024 con nome ufficiale IT/EN e pagina. Più origini possono sostenerla; la meccanica vale una volta sola (Indebolimento ha livelli).                         |
| Stato vitale      | Cosciente, Privo di sensi (knockout), Morente, Stabile, Morto, A 0 PF, Scomparso, PF non registrati. Deriva da PF, politica a 0 PF, TS contro la morte e cause; non è una condizione. |
| Etichetta manuale | Promemoria con motivo obbligatorio. Non applica regole né effetti, qualunque nome abbia (I-162).                                                                                      |

Concentrazione, Schivata e altri effetti restano nei rispettivi percorsi: il
pannello ne mostra le conseguenze, non li presenta come condizioni del catalogo.

## Ingressi, contesto e ritorno

- **Scheda:** un solo ingresso, **Danni, cure e condizioni**, dentro la carta
  PF; apre il pannello senza comando preselezionato. La vecchia correzione
  diretta dei PF non esiste più: danno, cura e correzione sono eventi distinti.
  Accanto alla Velocità base la scheda mostra «ora 0 m per condizioni» quando
  pertinente; oggetti caduti compaiono in **A terra** con **Registra raccolto**.
- **Tavolo:** nell'ispettore il riepilogo **Condizioni e stato** sostituisce la
  riga PF (la barra resta) e precede Forme. Per una creatura osservata ma non
  controllata l'ispettore mostra **Stato visibile**, senza PF. Le pedine hanno
  un badge (Morto, Morente, Stabile o numero di condizioni) con nome completo
  nel titolo e nell'etichetta accessibile; conta solo le applicazioni condivise.
- **Barra azioni:** **Rialzati · 4,5 m** quando la creatura controllata è
  Prona; disabilitato con motivo visibile a Velocità 0.
- **Anteprima di un attacco in mischia:** casella **Colpo non letale**.
- **Richieste → Tiri e risultati:** TS contro la morte, prova di Medicina e
  recupero da Stabile usano la coda esistente. Da un tiro partito dal pannello,
  **Torna a Condizioni e stato** riporta al pannello.

Il pannello è un dialogo contestuale sopra la vista corrente, senza nuova
pagina. **Chiudi** o Esc non tira, non applica e non annulla richieste già
avviate; il DOM del dialogo si svuota alla chiusura e al cambio di ruolo.
Riaprire la scheda o il Tavolo legge lo stesso stato, anche dopo reload.

## Origine delle scelte

Le capacità dei prodotti sono documentazione pubblicata, datata in R194, non
test del loro runtime. Le regole sono SRD 5.2.1 2024; gli adattamenti sono
dichiarati come tali.

| Gruppo                                                   | Origine verificata e motivo                                                                                                                                | Adattamento o limite                                                                                                            |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **COND-01 — Riepilogo vicino ai PF, badge, un ingresso** | P04 Beyond Maps (23/07/2026): stesso stato da pedina e scheda; P03 Foundry Tokens: icona compatta e dettaglio; P05 Roll20 Header: zona vitale contestuale. | Un solo dialogo per scheda e Tavolo. Il badge non cancella scheda o turno. Badge sul bordo, colore per stato; veste provvisoria. |
| **COND-02 — Catalogo, origine, termine, Termina**        | P01/P02 Foundry Active Effects e dnd5e 6.0.0: base separata dagli effetti, scadenze legate a fonte/bersaglio e riposo; P07 Fantasy Grounds: AppliedBy.     | Termini in linguaggio umano, nessun editor di percorsi tecnici, nessun timer reale. Origini multiple distinte (N01).            |
| **COND-03 — Effetti calcolati e motivi del tiro**        | P06 Roll20 Sidebars: mostrare cosa cambia e perché; P08 BG3 Patch 1: testo veritiero della causa di vantaggio.                                             | Regole 2024 alla distanza reale; P07 semplifica Prono e Indebolimento e non viene copiato (controevidenza R194).                |
| **COND-04 — Prono, strisciare, Rialzati**                | SRD N03/N04; movimento, percorsi e opportunità già esistenti del Tavolo (I-196/I-199–201).                                                                 | Arrotondamento in piedi dichiarato (1 ft = 0,3 m). Nessuna rialzata automatica al clic sulla destinazione.                      |
| **COND-05 — Danno, Cura, PF temporanei, Correggi**       | P05 Roll20 Header: temporanei prima dei PF, tetto alla cura, correzione distinta dall'esecuzione.                                                          | Motivo obbligatorio, prima/dopo, un evento vitale per commit. Registro fisico/Undo sono nostri (I-028/I-032).                   |
| **COND-06 — 0 PF, TS contro la morte, Stabile, Morto**   | P05: area PF che mostra TS e conteggi; P08: persistenza della richiesta dopo salvataggio. Regole N07–N12.                                                  | Coda Richieste esistente, fisico o digitale, nessuna nuova coda. Politica esplicita per creatura, mai dedotta dall'aspetto PNG. |
| **COND-07 — Colpo non letale, soccorso con Medicina**    | SRD N12/N15 (knockout 2024); P08 cita KnockedOut solo come precedente di spiegazione.                                                                      | Scelta dichiarata prima dell'attacco, non al momento del colpo. Nessun ramo Stabile a 0 del 2014 o di un videogioco.            |
| **COND-08 — Termini su turni, clock, riposi, sonno**     | P02 dnd5e: inizio/fine del prossimo turno di fonte o bersaglio, fine riposo; I-181: scadenza sul turno pertinente.                                         | Chiave di turno `encounter:round:attore` comune a combattimento, condizioni e forme. Nessuna scadenza a fine round universale.  |
| **COND-09 — Dadi: Undo, Riapplica, correzione, riuso**   | I-028/I-032/I-034/I-035 e I-219; R021 per il completamento misto fisico/digitale.                                                                          | Politica I-229 nostra, non attribuita a BG3 o Foundry come osservazione.                                                        |
| **COND-10 — Accesso, privacy, offline, errori**          | Vincoli registrati di separazione personale/campagna e di controllo della creatura; R194 T14.                                                              | Proiezioni locali a due identità; nessuna autorizzazione server o collaborazione distribuita dimostrata.                        |

P09 Solasta è usato soltanto per chiarezza e feedback: il suo Incapacitato che
impedisce il movimento contraddice la regola da tavolo e non è adottato.

## COND-02 — aggiungere, leggere e terminare

**Aggiungi condizione** cerca fra le 15 condizioni ufficiali; i nomi rispondono
in italiano e in inglese. La scheda della definizione mostra fonte SRD e pagina
per lingua, effetti calcolati dall'app ed effetti **Da gestire al tavolo**.
Poi si indicano:

- **Origine:** causa dichiarata (per esempio veleno della lama), creatura
  leggibile, oppure pedina ostile visibile nella scena attiva, citata solo per
  nome e senza accesso alla sua scheda. **Origine riservata** fa vedere agli
  altri la condizione, non la causa. Un'origine digitata non cita una pagina SRD.
  Il pannello applica sempre in modo condiviso e offre solo Origine riservata:
  un'applicazione interamente privata oggi nasce soltanto dal dominio.
- **Termine:** fino a rimozione manuale; dopo un tempo di gioco (round da 6 s,
  minuti, ore sul clock della creatura); inizio o fine del turno corrente o
  prossimo di una creatura; riposo breve, lungo o qualsiasi; finché dura una
  concentrazione attiva. L'anteprima mostra la riga **Termine** scelta.
- **Privo di sensi:** gli oggetti tenuti in mano, non l'armatura indossata.
  Se non sono noti resta una riconciliazione visibile.

**Anteprima → Applica** registra una volta sola. Una seconda origine della
stessa condizione compare come «Avvelenato ×2» con una sola penalità.
**Termina questa origine** chiede il motivo e lascia attive le altre. Le origini
vincolate non offrono Termina e spiegano la via corretta: lo 0 PF si chiude con
Cura o Correggi, il sonno con **Apri Riposo**. **Correggi termine o
riservatezza** e **Registra oggetti caduti** si aprono dentro la riga cliccata.

**Indebolimento** usa lo stepper sul livello canonico (0–6, tastiera, tocco o
digitazione): effetto aggiornato mentre si cambia, −2×livello ai d20,
−1,5 m×livello alla Velocità, morte al livello 6. Un riposo lungo concluso
riduce di 1 attraverso l'evento del dominio, dal pannello Riposo.

**Etichetta manuale senza regole** dichiara in chiaro che non applica effetti.

## COND-03 — effetti in vigore e motivi del tiro

**Effetti in vigore** elenca ciò che il dominio calcola: Velocità effettiva,
penalità d20, Incapacitato, fallimenti automatici FOR/DES, vantaggi e svantaggi
con motivo e requisito. Le anteprime di attacco e le richieste mostrano il tiro
risultante e ogni motivo con fonte, per esempio:

- Prono (bersaglio) entro 1,5 m: vantaggio; oltre: svantaggio. Il criterio è la
  distanza reale, non il tipo di arma (N05).
- Attacco a distanza con un nemico entro 1,5 m: svantaggio (SRD EN 15 / IT 17).
  Con Prono adiacente: «Tiro normale: vantaggio e svantaggio si annullano».
- Un colpo entro 1,5 m su Paralizzato o Privo di sensi è critico anche senza 20
  naturale; non è un colpo automatico (N06).
- Paralizzato, Pietrificato, Stordito e Privo di sensi falliscono i TS di Forza
  e Destrezza senza dado; Trattenuto dà svantaggio ai TS di Destrezza.
  Incapacitato da solo non fa fallire i TS e non azzera la Velocità (N02).
- Spaventato: svantaggio se la fonte è in linea di vista geometrica fra le
  pedine. Fonte ignota: domanda esplicita sì/no prima dell'attacco; lo stesso
  vale per chi afferra o affascina se ignoto. Affascinato non attacca chi l'ha
  affascinato. Invisibile rende non visibile nelle verifiche della scena.
- Avvelenato non impone effetti mentre la creatura è Pietrificata; l'istanza resta.
- Effetti sull'iniziativa: manuali, con promemoria «Da includere nel tiro: …»
  in Preparazione accanto al tiro.

Un'applicazione privata vale ovunque; chi non la vede riceve **Effetto
riservato** come motivo in scheda, anteprima, richieste e fallimenti automatici.

## COND-04 — Prono, strisciare e Rialzati

Da Prono ogni percorso del Tavolo (anteprima, avvicinamento, esecuzione,
ripresa) usa lo strisciare: costo ×2, ×3 sul terreno difficile, colori distinti
per ×1/×2/×3. La didascalia mostra «Distanza: 1,5 m · Costo movimento: 3 m».
I propri attacchi hanno svantaggio.

**Rialzati** spende metà della Velocità effettiva, non metà del residuo:
9 m → 4,5 m, 7,5 m → 3,6 m (arrotondamento per difetto in piedi). Non usa
azione né Scatto. Fuori iniziativa non spende budget. A Velocità 0 è
disabilitato con «Velocità 0: non può rialzarsi.»; con movimento insufficiente
il motivo è esplicito e nulla viene consumato. Cambiare condizione ricalcola il
residuo da movimento speso e Scatti, senza regalare o togliere metri.

## COND-05 — danno, cura, PF temporanei e correzione

Ogni comando richiede la causa e mostra un'anteprima con assorbimento dei
temporanei, PF persi o recuperati, eccedenza e conseguenze nello stesso passo.

- **Danno:** un solo evento vitale; poi interruzione dei riposi, fine della
  concentrazione dovuta allo stato, eventuale TS di Concentrazione solo se
  ancora attiva. «Da colpo critico» vale per il danno a 0 PF. Dardo incantato:
  un evento per dardo (interpretazione dichiarata, coerente con I-219).
- **PF temporanei:** comando proprio. Non si sommano: «quali tieni?» fra
  attuali e nuovi. Non risvegliano chi è a 0 PF (N13).
- **Cura:** entro il massimo; non resuscita, non concede temporanei, non toglie
  Prono. Termina solo le cause 0 PF e knockout; i PF di un Dado Vita e del
  riposo lungo sono la stessa cura (un Dado Vita chiude il knockout).
  Disabilitata con motivo per Morto o PF non registrati. Una creatura Incapacitata non beve la propria
  pozione: il dialogo spiega perché e non offre Bevi. Somministrare a un
  alleato a 0 PF si registra per ora come Cura nel pannello.
- **Correggi PF e stato:** cambia solo i campi toccati (PF, massimi,
  temporanei, successi/fallimenti, Stabile, Morto, politica a 0 PF) e ripete
  «non è una resurrezione». Rifiuta, con messaggio sotto il campo e Applica
  disabilitato, i PF 0 partendo da PF > 0 (la caduta si registra con **Danno**)
  e un massimo di 0 PF (la creatura muore: si registra con **Morto**, SRD EN 17 /
  IT 19). Tre fallimenti richiedono Morto, tre successi Stabile nella stessa
  correzione. Le riconciliazioni offrono il comando che le risolve.

Errori: messaggio sotto il campo con `aria-invalid`, righe prima/dopo ancora
visibili e Applica disabilitato. Qualsiasi modifica dopo l'anteprima la rende
obsoleta. Annulla prima di Applica non cambia nulla.

## COND-06 — 0 PF, TS contro la morte, Stabile e Morto

La politica a 0 PF è esplicita per creatura: TS contro la morte, morte,
scomparsa o manuale. Nel campione Livia, Doran e Mira hanno TS contro la morte,
le sentinelle muoiono, famiglio e Compagno Selvatico scompaiono, il compagno
manuale è manuale. Una creatura senza politica mostra una riconciliazione a
0 PF invece di un esito inventato.

- Il danno che porta a 0 rende Morente, Privo di sensi e Prono, senza tiro
  immediato. Danno massiccio sul residuo pari ai PF massimi: morte (N08).
- A ogni inizio turno reale la coda riceve **un solo** TS contro la morte:
  1d20 CD 10 senza caratteristica, modificatori solo con fonte (Indebolimento).
  Fisico o digitale, breakdown, correzione motivata. Un retry dello stesso
  inizio turno non crea un secondo tiro. In combattimento il pannello spiega che
  il TS arriva a inizio turno.
- Fuori iniziativa il TS si tira su richiesta dalla scheda (pannello
  Condizioni e stato): **Tira contro la morte** crea una richiesta alla volta; risolta, se ne può chiedere un'altra
  (scelta delegata [I-234](DECISIONS.md#i-234--ts-contro-la-morte-fuori-iniziativa-su-richiesta-dalla-scheda)).
  Una richiesta così ancora in attesa scade quando la creatura entra
  nell'ordine d'iniziativa; una legata a un turno scade fuori dal suo incontro
  attivo. A ogni inizio turno resta in coda un solo TS.
- Undo non concede un nuovo tiro vitale: dopo Undo la stessa richiesta (TS,
  Medicina, d4 del recupero) offre solo **Riapplica risultato noto** con la
  faccia già registrata; lo storico dice «Riusato» (I-229).
- 1 naturale = due fallimenti; 20 naturale = 1 PF. Danno a 0 PF = un
  fallimento, due se critico, anche se assorbito dai temporanei (lettura
  combinata N11/N13). Terzo fallimento: **Morto** su pedina e scheda.
- Tre successi o soccorso riuscito: **Stabile**, sempre a 0 PF e Privo di sensi.
  Recupero di 1 PF dopo **1d4 ore di gioco**, con tiro in coda che non blocca i
  turni; nessun timer reale. Un nuovo danno toglie Stabile.
- Una cura prima del tiro chiude la richiesta come scaduta con motivo, senza
  faccia inventata. I conteggi tornano a zero quando si recuperano PF.

## COND-07 — Colpo non letale e soccorso con Medicina

**Colpo non letale** vale solo se il colpo in mischia porterebbe a 0 PF: la
creatura resta a 1 PF, riceve una propria causa di Privo di sensi più Prono e
avvia il proprio riposo breve. La fine di quel riposo, una cura (anche i PF di
un Dado Vita) o il pronto soccorso terminano solo il knockout; Prono resta.

**Soccorri un alleato** (Stabilizza o Pronto soccorso) mostra chi riceve
(morente o KO) e chi aiuta (solo creature controllate, coscienti, diverse dal
bersaglio), CD 10, modificatore con fonti, svantaggio da Avvelenato e costo
dell'azione in iniziativa. **Avvia prova di Medicina** usa la coda esistente;
se una prova è già in attesa la riapre. L'azione è spesa solo nel turno reale
in iniziativa. Stabilizzare non cura. L'SRD non fissa la distanza del soccorso:
il pannello lo dice e non la misura.

## COND-08 — termini, turni, clock, riposi e sonno

Il dominio osserva inizio e fine turno reali, avanzamenti del clock di
campagna o personale, completamento dei riposi per tipo e partecipanti, fine
della concentrazione. «Prossimo turno» esclude quello in corso; uscire
dall'iniziativa non inventa turni; un evento ripetuto non scade due volte.
Se il compagno di turno viene rimosso (per esempio scompare a 0 PF), il suo
turno si chiude con la chiave del turno rimosso: «fine del turno corrente»
scade una volta, «prossimo turno» no.

Il sonno del riposo è Privo di sensi attraverso il dominio, con propria causa
legata al riposo, fine della concentrazione ed eventi registrati; al risveglio
resta Prono (N06). Un termine non rivela una fonte riservata: l'attore del
termine è anonimizzato per chi non la vede.

## COND-09 — dadi: Undo, Riapplica, correzione e riuso

Politica [I-229](DECISIONS.md#i-229--undo-e-correzione-dei-dadi-mai-un-rilancio):
**Undo non è mai un rilancio**, con dadi fisici o digitali.

- Un attacco digitale sono due passi: tentativo e dadi. Il primo Undo ritira i
  dadi e lascia l'azione spesa; il risultato ritirato torna solo con
  **Riapplica risultato noto** o con una correzione motivata, mai con la
  continuazione automatica. Il secondo Undo ritira il tentativo e rimborsa.
- Un nuovo tentativo identico (stesso attore, azione, bersagli e turno) riusa
  le facce ritirate; lo storico le marca **Riusato**. Un bersaglio diverso
  produce dadi nuovi.
- Se una correzione cambia il profilo (colpo ↔ critico), le facce note restano
  per gruppo di dadi uguali nell'ordine originale; mancano solo i dadi nuovi,
  chiesti in fisico o tirati in digitale. Le altre facce diventano
  «sostituite» nello storico. **Completa il tiro** mostra le facce note in sola
  lettura e il cambio (1d10 → 2d10).
- Cambiare una faccia nota richiede un motivo; lo storico mostra «Corregge 15 ·
  Motivo: …» e conserva i valori precedenti. Dadi misti sono etichettati per
  dado («Digitale (dado 1) + Fisico (dado 2)»).
- Il pulsante Undo porta l'etichetta della modifica che annulla. Undo non
  termina una singola origine e non resuscita: per quello esistono Termina e
  Correggi.

## COND-10 — accesso, privacy, offline

- Scrivono solo i controllori della creatura, verificati a ogni Applica; gli
  altri vedono **Consultazione**. Il tiro vitale lo risolve chi controlla la
  creatura che tira.
- PF, conteggi e tiri vitali sono letti da chi legge la scheda (membri per i
  personaggi di campagna, DM per i PNG, proprietario per le schede personali).
  Gli altri vedono solo lo stato pubblico della pedina.
- Origine riservata: registro condiviso con la sola applicazione; applicazione
  privata: voce nascosta, effetto «riservato». Una stringa privata del DM non
  resta nel DOM dopo il cambio di ruolo.
- Le facce accettate su una scheda personale restano personali anche dopo
  l'ingresso in campagna; chi perde il controllo non può riapplicarle. Anche per
  i tiri vitali (naturale, totale, ore del d4) chi non è proprietario né
  risolutore vede solo «Registrato».
- Offline le schede personali restano modificabili localmente. Sulle condivise:
  «Non applicata, niente in coda; riconnettiti e premi Applica; gli input
  restano». I tiri condivisi sono disabilitati con motivo.

## Esempi di verifica

| Percorso                                                  | Esito da verificare                                                                     |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Avvelenato da due origini, fine di una                    | ×2 con una penalità; l'altra origine resta; Undo ripristina la stessa origine.          |
| Livia Prona striscia 1,5 m, poi Rialzati                  | 3 m spesi (9 → 6), poi 4,5 m (6 → 1,5); azione e Scatto invariati.                      |
| Dardo di fuoco su Sentinella Prona adiacente              | Svantaggio per distanza + vantaggio per Prono: tiro normale con entrambi i motivi.      |
| Livia a 0 PF, quattro fine turno                          | Un solo TS per inizio turno reale; nessun tiro all'arrivo a 0.                          |
| Mira soccorre con Medicina 15                             | Livia Stabile a 0 PF, ancora Priva di sensi; azione di Mira spesa.                      |
| Cura 5 su Livia Stabile                                   | 0 → 5 PF, Privo di sensi termina, Prono resta, Cosciente.                               |
| Doran: 1 naturale, poi danno a 0                          | Due più un fallimento: Morto su pedina e scheda, Cura disabilitata; stato dopo reload.  |
| Bastone ferrato non letale sulla Sentinella               | 1 PF, causa knockout propria, Prono, riposo breve avviato.                              |
| Dardo di fuoco digitale: Undo, Undo, ritentativo identico | Azione spesa dopo il primo; rimborsata dopo il secondo; facce riusate, nessun rilancio. |
| Correzione 15 → 20 dopo Undo                              | Critico: 1d10 → 2d10 conserva la faccia 2, chiede solo il dado mancante.                |
| TS contro la morte: Undo del tiro e della richiesta       | La stessa richiesta offre solo Riapplica con la faccia nota; storico «Riusato».         |
| TS fuori iniziativa in attesa, poi inizio del combattimento | La richiesta scade a inizio turno; in coda resta un solo TS.                            |
| Correggi PF e stato da 5 a 0 PF                           | Rifiutato sotto il campo (usa Danno), Applica disabilitato, nulla cambia.               |

Questa matrice descrive esiti del percorso. Conteggi di test e visite browser
sono in [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md) e nella
[verifica](../../changes/interview-01/blueprint-verification.md).

## Regole applicate e fonti

SRD 5.2.1 EN/IT, baseline 2024, PDF con hash verificato in R194
(EN `8974902d…`, IT `a7b88b0c…`). Pagine stampate EN / IT.

| Regola                                                          | EN / IT                       |
| --------------------------------------------------------------- | ----------------------------- |
| Condizioni non cumulative, Indebolimento eccezione (N01)        | 179 / 206                     |
| Incapacitato: niente azioni/reazioni, fine concentrazione (N02) | 184 / 208                     |
| Prono, rialzarsi, attacchi a 1,5 m (N03, N05)                   | 186 / 212                     |
| Strisciare ×2, ×3 su difficile (N04)                            | 179 / 216                     |
| Privo di sensi, critico ravvicinato, Prono residuo (N06)        | 191 / 212                     |
| 0 PF, danno massiccio, TS contro la morte, Stabile, knockout    | 17–18 / 19–20                 |
| PF temporanei (N13)                                             | 18 / 20                       |
| Morte e ritorno in vita (N14)                                   | 180 / 210                     |
| Indebolimento 2024 (N16)                                        | 181 / 208                     |
| Concentrazione e ordine degli eventi simultanei (N17)           | 179, 184, 187 / 206, 208, 207 |
| Attacco a distanza in mischia                                   | 15 / 17                       |
| Spaventato, linea di vista                                      | 182 / 216                     |
| Morso del Lupo, Prono con taglia Media o inferiore              | 364 / 394                     |

Catalogo completo delle 15 condizioni con pagine: tabella «Indice completo» di
R194. Le etichette e le correzioni del pannello usano una fonte manuale, mai una
citazione SRD inventata. Materiale SRD 5.2.1 di Wizards of the Coast LLC,
licenza CC BY 4.0; sintesi e adattamenti sono di questo progetto.

## Interpretazioni dichiarate

- Arrotondamento di Rialzati in piedi con conversione D&D, uguale in IT ed EN.
- Danno a 0 PF interamente assorbito dai temporanei: conta come fallimento.
- Dardo incantato: un evento vitale e di concentrazione per dardo.
- Spaventato: linea di vista calcolata fra le pedine della scena.
- Oggetti tenuti ignoti finché registrati; un'arma usata per attaccare diventa
  tenuta; gli oggetti caduti vanno a terra e non sono più equipaggiati.
- Colpo non letale scelto prima del tiro, non al momento della riduzione a 0.

Ognuna è correggibile e non attribuita a un concorrente o a un chiarimento
ufficiale.

## Frontiera

Restano obblighi, senza tagli impliciti: comando dedicato per somministrare una
pozione a un alleato; Spaventato sulle prove di caratteristica (oggi avviso);
**Registra raccolto** che non spende l'interazione con un oggetto; effetti
d'iniziativa automatici; distanza del soccorso; trascinamento di Afferrato;
immunità e resistenze ai danni, danni periodici, resurrezione; catalogo delle
cause oltre il campione; controllo per un'applicazione interamente privata dal
pannello. I personaggi del builder non registrano ancora immunità alle
condizioni né taglia (il Morso del Lupo mostra una riconciliazione). Il Dado
Vita che chiude un knockout e il termine del compagno rimosso sono provati da
test di dominio, non da un percorso browser; il badge è verificato solo in
Chromium. Ruoli, rete e storage sono simulazioni locali; nessuna sicurezza
server o sincronizzazione reale.
