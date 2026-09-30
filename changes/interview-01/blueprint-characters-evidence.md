# Blueprint — personaggi e inventario, primo incremento

23/09/2026. Worker `blueprint_characters`, stesso modello/sforzo ereditati.
D-013/I-218 autorizzano il prototipo locale. Questo incremento è integrato
nell'unico blueprint, ma non completa CRE/ADV/INV/MAG né il Goal intero.

## File e integrazione

- `design/blueprint/characters.mjs`: `renderCharacters(ctx)` e
  `bindCharacters(root, ctx)` secondo DEVELOPMENT; stato dell'attore condiviso
  con Tavolo e shell, nessuna copia privata della scheda.
- `design/blueprint/characters.css`: stili del modulo e adattamenti 1000/620 px.
- `design/blueprint/tests/characters.test.mjs`: test con Node, nessuna dipendenza.
- Raccordo concordato con root: `ctx.openNotes()` apre lo stesso servizio
  Appunti; `navigate('table', { id })` seleziona il medesimo attore consentito.
- Le mutazioni passano per `ctx.commit`; salvataggio, audit e undo sono quelli
  comuni. Il controllo viene ripetuto all'applicazione, non solo nascondendo
  il pulsante. Il gate offline è responsabilità del commit comune.

## Comportamenti presenti

| Percorso / controllo                                 | Risultato osservabile nella simulazione                                                                                                                             | Riferimento / adattamento                                                                                      |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Raccolta → filtro → scheda → sei sezioni             | Scheda della stessa identità; ricerca; vista in consultazione dei compagni; NPC soltanto al DM.                                                                     | NAV-04 e NAV-11; Beyond Sheet Sections e Foundry Play/Edit, R176/R177. Non prova della matrice ruoli completa. |
| Crea / Modifica scheda                               | Registrazione **manuale** di identità, classe/livello, CA, PF massimi, velocità e caratteristiche; Salva/Annulla con form nativo.                                   | CRE-01/02, distinzione dati ricostruiti e automatismi. Non builder completo né avanzamento.                    |
| Correggi PF                                          | Valore entro 0 e massimo, motivo obbligatorio e audit comune. Modifica dei massimi conserva danni e non rianima chi è a zero; slot/inventario restano invariati.    | I-028, ADV-05/07/08; valore manuale dichiarato.                                                                |
| Azioni → caratteristica                              | Digitale casuale non prefissato, o faccia fisica 1–20; d20 + modificatore e risultato esposti.                                                                      | Breakdown I-026/I-027; non deduce competenza, CD o successo di una prova esterna.                              |
| Inventario → Aggiungi / Dettagli → Modifica          | Nome, tipo, quantità non negativa, peso, descrizione, pozione standard facoltativa; stato sulla stessa scheda.                                                      | INV-01/03, Foundry Items e Beyond Sheet Sections. Nessun acquisto dedotto.                                     |
| Inventario → Equipaggia / Riponi                     | Registra esplicitamente una situazione già avvenuta; arma equipaggiata raggiungibile nelle Azioni.                                                                  | INV-04, non cambio gratuito universale durante combattimento.                                                  |
| Pozione → preview → Bevi digitale                    | Cura 2d4+2 casuale; quantità consumata una volta; bonus in combattimento; limite PF e parte eccedente esposti.                                                      | INV-06, esempio normativo SRD 5.2.1 EN p.99 già verificato nel corpus. Solo uso su sé.                         |
| Pozione → Bevi fisica → chiudi → riapri tiro         | Uso già registrato, cura pendente senza duplicare consumo; inserisci due facce naturali 1–4; formula e PF risultanti esposti.                                       | INV-06/11 e I-026–028; chiudere non annulla un uso avvenuto.                                                   |
| Cura → undo comune                                   | Annullare la registrazione fisica ripristina il tiro pendente mantenendo il consumo; annullare il tentativo restituisce lo stato antecedente con audit.             | Undo locale comune; non promessa di riavvolgimento multiplayer o di correzione selettiva esaustiva.            |
| Magie → aggiungi / dettaglio / registra preparazione | Annotazione manuale con livello e fonte; cantrip concesso senza toggle universale di preparazione. Correzione preparazione esplicita e contatore slot modificabile. | NAV-04/MAG; **non** preparazione per capacità, timing o motore magie completo.                                 |
| Capacità → aggiungi / gestisci                       | Testo e contatore manuale massimo/speso; nessun beneficio inferito dalla descrizione.                                                                               | I-160, distinzione risorsa strutturata e promemoria.                                                           |
| Storia / Extra                                       | Biografia consultabile con la scheda; Appunti Solo io separati; piano testuale senza benefici; altre schede e campagna raggiungibili.                               | NAV-04/09, I-057/I-175. Piano futuro strutturato ancora da costruire.                                          |

Tutte le stringhe dei controlli sono EN/IT; dati scritti dall'utente restano
nella lingua inserita. HTML dinamico passa da `ctx.esc`. Icone riutilizzano
l'insieme SVG della shell. Nessun asset esterno o testo proprietario importato.

## Verifiche eseguite

- Red iniziale: cinque test di dominio falliscono sulle funzioni vuote prima
  della loro implementazione. Il primo tentativo senza modulo ha prodotto
  `ERR_MODULE_NOT_FOUND`, quindi è stato ripetuto con export vuoti per ottenere
  fallimenti di comportamento.
- Test successivi red → green: blocco uso fuori turno, nessuna rianimazione
  dal cambio dei massimi, nessun toggle di preparazione universale ai cantrip.
- `node --test design/blueprint/tests/characters.test.mjs`: **10/10 pass**.
  Include input invalidi, cura pendente e idempotenza dopo risoluzione, cap PF,
  consumi preservati, escaping/visibilità e undo sullo store reale.
- Suite completa durante lavoro parallelo: 26/27 pass al primo controllo;
  rosso in `state.test.mjs`, “starting combat refreshes the starting creature,
  not reactions of other creatures”. Segnalato a root, che possiede quel file.
  Non mascherato come suite verde e non modificato dal worker.
- `node --check characters.mjs`, Prettier sui tre file e `git diff --check`
  eseguiti. Browser/tastiera/touch e resa responsive affidati alla verifica
  integrata del coordinatore; nessuna prova runtime inventata da questo worker.

## Lacune da completare nella stessa app

1. Builder CRE completo: sorgenti/revisioni, background/specie, punteggi con
   metodi alternativi, dotazioni, competenze, talenti/deroghe, draft e riepilogo.
2. Avanzamento, multiclasse, milestone/PE, revisione dipendenze e piano futuro
   strutturato: il modulo attuale registra solo valori manuali e un promemoria.
3. INV: contenitori, confronti, sintonia/riposi, visibilità per oggetto e proprietà
   sconosciute, trasferimenti/offerte/accettazioni, bottino comune, cariche e
   munizioni, consumi generici, bersaglio della pozione diverso da sé.
4. MAG: disponibilità per capacità, fonti, preparazione consentita, liste,
   casting/multibersaglio/AoE, slot per livello, concentrazione, azioni e reazioni.
   L'annotazione manuale non sostituisce questo lavoro.
5. Correzioni selettive di vecchi tiri fisici, conseguenze dipendenti, recuperi,
   effetti/condizioni, abilità/competenze, creature/forme e permessi completi.
6. Armi mostrano “Apri il Tavolo” senza fingere la selezione di un attacco:
   percorso di combattimento ancora incompleto nel primo incremento.
7. Import/export delle schede, bozza recuperabile dopo ESC/cambio contesto,
   collaborazione/revoche/conflitti e scenari di rete non sono provati dai
   test del modulo. I form attuali seguono il comportamento del dialog comune.

La presenza dei sei tab non chiude nessuna di queste lacune. La matrice del
blueprint deve conservare lo stato parziale; l'intero contratto rimane aperto.

### Independent review follow-up

Private future plans now use `personalPlans[ctx.role]`; legacy `futurePlan`
is readable only by the actor owner, not automatically by the DM. Local
private commit preserves private audit visibility. UI bind/submit regression
passes for both identities and cross-character viewing: **11/11 module**,
**32/32 integrated suite** after the follow-up. Separate reviewer found no
substantive residual issue in this correction.
