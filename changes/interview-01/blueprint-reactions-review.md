# Blueprint — review indipendente delle reazioni

23/09/2026. Reviewer `review_journey`, modello e sforzo ereditati invariati.
Sola lettura di codice e test; unico file scritto dal reviewer: questo report.
Gli autori hanno continuato il loro lavoro durante la review. Non è una review
di un commit candidato, un'approvazione d'integrazione o un'attestazione di
completamento del Goal. Nessun browser condiviso utilizzato.

## Perimetro ed evidenza

- `design/blueprint/combat.mjs`: attacco, Scudo, opportunità, movimento
  interrotto, concentrazione, risoluzione digitale automatica e proiezioni.
- `design/blueprint/preparation.mjs`: creazione/configurazione esplicita
  dell'attacco del PNG e raccordo con il dominio delle opportunità.
- Test `combat.test.mjs`, `reactions.test.mjs`, `preparation.test.mjs`.
- Contratto [TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md),
  [ricerca primaria](blueprint-reactions-research.md) e
  [nota del dominio](blueprint-reactions-domain.md).

Suite mirata eseguita durante la review:

```sh
node --test design/blueprint/tests/reactions.test.mjs design/blueprint/tests/combat.test.mjs design/blueprint/tests/preparation.test.mjs
```

Primo esito: **71/71 pass**; primo ricontrollo: **74/74 pass**; ricontrollo
finale dopo il raccordo Preparazione: **78/78 pass**.
Riproduzioni aggiuntive tramite import dei veri
export in Node, con fixture sintetiche in memoria; nessun file applicativo
modificato. I casi sotto non erano coperti dalla suite verde iniziale.

## Rilievi materiali

### R1 — P2: il PNG configurato non può offrire opportunità

`preparation.mjs`, `stageNPCAttack`/`saveSceneDraft`, in raccordo con
`combat.mjs`, `profileFor`/`opportunityEligible`.

Il percorso reale crea un PNG, configura il profilo con `buildMeleeProfile`,
lo prepara con `stageNPCAttack` e salva. Il profilo risultante contiene solo
`meleeAttack`; l'eleggibilità per opportunità richiede invece schieramenti
presenti e opposti. Il profilo parziale sopprimeva anche il fallback dei PNG
campione. Non esisteva un controllo di schieramento nel percorso esposto.

Riproduzione: Livia e PNG configurato a `(200,200)`, portata del PNG 1,5 m,
reazione disponibile, movimento Livia verso `(400,200)`. Il PNG espone
`melee-attack` ma non compare alcuna richiesta; Livia arriva direttamente a 400
con movimento `resolved`. Il comportamento promesso dall'editor non è quindi
eseguibile con i dati che l'editor permette di preparare.

Correzione richiesta: raccordare il dato necessario con una scelta esplicita
e conservare i dati degli attori esistenti; non dedurre che ogni PNG sia nemico.
Segnalato al coordinatore e all'autore dominio. **Chiuso nel ricontrollo
finale**: il dominio preserva il solo schieramento delle quattro fixture
quando ricevono un profilo parziale. Preparazione espone `npcTeam` in Crea,
Duplica e Attacco e disposizione, con alleato, neutrale e ostile; un nuovo PNG
parte neutrale. Lo schieramento resta distinto dal controllo del DM. La
modifica viene preparata nella bozza, il salvataggio preserva PF, risorse e
altri campi del profilo e respinge un conflitto sullo schieramento.

Riproduzione indipendente finale tramite i veri export: nuovo PNG neutrale,
attacco e disposizione applicati alla bozza, Salva preparazione,
serializzazione e ripristino dei dati, poi movimento Livia da 200 verso 400.
Con `watch` compare una sola opportunità del PNG e la pedina si ferma a 250,
senza spendere la reazione per la sola offerta. Con `party` e `neutral` non
compare opportunità e la pedina arriva a 400. Il proprietario rimane `dm` in
tutti e tre i casi. I quattro test aggiunti coprono anche risorse vive,
conflitto, duplicazione e il percorso reale fra i due moduli. Il collegamento
dei dialoghi è stato letto nel sorgente; la prova del browser è del coordinatore.

### R2 — P2: la morte esplicita non ferma il movimento

`combat.mjs`, `beginMovement`/`advanceMovement`/`resumeMovement`.

Le guardie controllano velocità, posizione, scena e turno, ma ignoravano
`actor.dead`, già riconosciuto dal dominio per reazioni e concentrazione.
Un nuovo movimento con `dead:true`, velocità e budget numerici veniva applicato.

Riproduzione anche sulla catena nuova: movimento Livia da 200 verso 400,
opportunità al confine 250, attacco 14+4 e danno 3+2, stato `awaiting-choice`.
Dopo la correzione esplicita `livia.dead=true`, `resumeMovement` portava ancora
la pedina a 400 e marcava il movimento `resolved`.

Correzione richiesta: la morte esplicita impedisce l'esecuzione e blocca il
seguito sospeso; nessuna richiesta di inferire la morte da 0 PF o di convertire
Incapacitato da solo in velocità 0. **Chiuso nel ricontrollo**: `beginMovement`
rifiuta la morte esplicita e `advanceMovement`, usato anche dalla ripresa,
blocca il seguito. La riproduzione dopo l'attacco ora mantiene la pedina a
`x=250`, conserva il budget a `7.5`, marca `blocked` e permette Cambia percorso.
Il test aggiunto esercita la morte prima dell'avvio e durante l'interruzione.

## Limiti e stato

Entrambi i rilievi sono chiusi; nessun ulteriore P1/P2 trovato nel perimetro letto. La chiusura della
concentrazione quando il soggetto diventa incapacitato senza un attacco
pendente è stata verificata sulla correzione concorrente e funziona.

Non sono rilievi la geometria ancora dichiaratamente limitata, i profili
speciali non implementati o altre parti del Goal ancora da costruire. La
convenzione di un TS concentrazione per dardo è dichiarata dal dominio come
interpretazione adottata dal coordinatore, non chiarimento ufficiale SRD.

Snapshot del ricontrollo; una modifica successiva richiede verifica pertinente.
La verifica browser resta del coordinatore.

| File                                          | SHA-256                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/combat.mjs`                 | `94256d036306a32002fc649e72a69555c95534e7030d82e398faf4925c59c932` |
| `design/blueprint/preparation.mjs`            | `457b71f9ef5237a2aee79485e6455bf7595f62a0d8e13ce930411158aaf6b461` |
| `design/blueprint/tests/combat.test.mjs`      | `8205654bdeb7c596ab110b66d5e8cd3bc848e1a4c48920e271d5f5f94cda12e0` |
| `design/blueprint/tests/reactions.test.mjs`   | `8fbb1cb99f371ab7a8eae8db5550547fc52b1b22cad0a833585cf7fec8ca20d2` |
| `design/blueprint/tests/preparation.test.mjs` | `0259b6760512fe2276571b8da64f09d930525987066f18a13ec5f91fefd1226a` |
