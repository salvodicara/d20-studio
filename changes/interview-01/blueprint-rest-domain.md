# Incremento 8 — dominio riposi e tempo narrativo

23/09/2026. Autore `/root/review_journey`, modello/sforzo ereditati, worktree `~/Workspace/Codex/d20-studio-interview-01`. Stato: tre finding della review indipendente corretti e ricontrollati; delta finale di privacy da ricontrollare separatamente. Snapshot dirty, nessun candidate commit inventato. Questo rapporto non certifica UI/browser o il completamento dell'intero Goal.

File riservati: `design/blueprint/rest-time.mjs`, relativo test, questo rapporto e [contratto API](blueprint-rest-api.md). Root possiede state/Undo, adapter combat/round, profili delle fixture e integrazione; altro autore possiede UI. Nessun file altrui modificato, browser condiviso usato, dipendenza installata, commit o deploy eseguito.

## Comportamento consegnato

- Un unico stato persistente `restTime` nello store esistente, con clock narrativo relativo per contesto, partecipanti separati e riferimenti alle risorse canoniche degli attori. Un'ora per il gruppo non diventa un'ora per ogni membro. Appuntamenti UTC e sessioni reali restano indipendenti.
- Avvio non cura. Breve individuale/gruppo parziale, completamento, lungo con sonno/attività, Trance esplicita, interruzione e ripresa. Il controllore opera solo sui personaggi controllabili; DM non legge/riposa una scheda personale privata. Offline consentito ai personali, non al gioco condiviso.
- Deterministici distinti: HP/HD del lungo, tempHP, exhaustion con guard malnutrition, slot ordinari/Patto/capacità tramite policy con fonte e identità. I massimi manuali non vengono ricostruiti. Pool rimossi/max0 restano storici. Consumo ignoto può diventare0 soltanto con un recupero totale verificato; un recupero parziale ignoto è dichiarato da riconciliare.
- Second Wind, Patto e altre policy applicabili del breve maturato da un lungo interrotto si recuperano **all'interruzione**, prima dell'incontro. Il beneficio ha ID causale e righe prima/dopo; retry non lo applica due volte. Non aspetta una conferma o una ripresa. La finestra HD è separata e permette la scelta maturata all'ingresso in iniziativa, risolte le conseguenze pendenti.
- HD fisico/digitale: begin spende una volta, richiesta persistente, resolve accetta solo faccia naturale valida, mantiene COS del tentativo, minimo1 e overflow leggibili. `acceptedFace` immutabile separata da `status`: un pending ripristinato da Undo riapplica la medesima faccia. Il tiro reversed non si riusa. La generazione digitale avviene nel commit UI, attraverso lo stesso resolve, non dal dominio o come fallback a una faccia fisica mancante.
- Rapido: preview sceglie il prossimo dado nell'ordine esplicito, conteggia il tetto totale del beneficio e si ferma sotto la media del prossimo dado, a HP pieni, dati ignoti, pendenza o dadi esauriti. Nessun algoritmo “ottimale” multiclassi promesso. Il loop UI usa un dado alla volta.
- Recupero Arcano separato: selezione di slot normali fino a5°, costo somma livelli ≤ceil(livello mago/2), una volta per ciclo lungo. Quando `featureId` esiste il saldo è quello della feature della scheda e relativo ledger: correzioni della scheda arrivano immediatamente al pannello. Il profilo senza feature conserva un fallback esplicito per fixture. Livello0 non resetta la storia della capacità rimossa.
- Tempo avanzato esplicitamente dal DM, effetti con `expiresAtGameTime` e concentrazione a durata nota; effetti al turno e durate ignote non sono convertiti. Adapter interno per +6 secondi a confine di round, non per ogni attore. Eventi testuali da soli non interrompono il riposo.
- Sonno effettivo aggiunge una condizione inconscio collegata al restId e termina la concentrazione con gli effetti dipendenti. Uscire da tale attività rimuove soltanto la condizione di quel sonno, preservando altre cause di inconscio.
- Correzioni esplicite con motivo, delta sul valore corrente e prima/dopo; nessun rimpiazzo di inventario/note o ricostruzione dell'attore. Riposi/tempo restano normalmente annullabili atomicamente insieme alle risorse: nessun clear della cronologia o barriera Undo.

## Regole, provenienza e interpretazione

Ricerca riusata: [R192](blueprint-rest-time-research.md). Testi ufficiali già conservati e riletti nei passaggi normativi pertinenti:

| Fonte                                                                                | Revisione immutabile                                                              | Pagine stampate pertinenti                                                                                  |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| [SRD EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)    | 5.2.1, SHA-256 `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` | breve187, lungo185, tempHP18, concentrazione179, round13, Trance85, SecondWind48, Patto71, ArcaneRecovery78 |
| [SRD IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf) | 5.2.1, SHA-256 `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` | breve/lungo213, tempHP20, concentrazione206, Trance95, SecondWind54, Patto87, ArcaneRecovery60              |

La baseline lungo recupera **tutti** i HD, non metà2014. Il nuovo lungo aspetta16h dalla conclusione del precedente; senza campagna un successivo lungo richiede durata trascorsa attestata, senza inventare un clock del mondo. Fonti custom delle policy restano custom. Nessuna economia BG3 di cibo o numero di brevi importata. I pattern di pannello e preview derivano dalla ricerca pubblicata di R192, non da test runtime dei concorrenti compiuti in questa consegna.

**Caso ravvicinato dichiarato:** il testo EN185 consente la ripresa e aggiunge un'ora per interruzione, ma non esplicita una sottrazione di ore già conteggiate per precedenti benefici brevi. Il dominio segue la lettura letterale del tempo riposato cumulato: dopo ripresa effettiva, un nuovo fatto causale può produrre un altro beneficio breve. Un retry del medesimo fatto non lo produce. Non si presenta questa lettura come osservazione empirica o regola aggiuntiva “anti-refill”; il controllore autorizzato può correggere i consumi con motivo. Caso coperto da test distinto.

## Verifiche eseguite dall'autore

1. API fissata prima dei consumer. Prima esecuzione del file test:20/20 rossi per API assente.
2. Implementazione e cicli mirati RED→GREEN: dadi/Undo, recuperi e durata; adapter/identità risorsa/private cooldown; recupero immediato all'interruzione e sonno; getter Trance/scadenza concentrazione; saldo canonico Recupero Arcano. Test aggiuntivo della lettura ravvicinata conferma il comportamento già presente, non rivendicato come nuovo red.
3. Review distinta `/root/blueprint_characters`: riprodotti e corretti con regressioni rosse→verdi tre P2: revoca della membership non rivalidata in query/complete; Trance2h+light2h erroneamente sufficiente; cooldown perso passando da personale a campagna. Il reviewer ha ricontrollato e chiuso R1–R3 sullo snapshot intermedio `167c3ae7…`. La correzione non cancella storia personale autorizzata, conta le ore effettive di Trance e richiede riconciliazione esplicita fra clock senza offset.
4. Delta finale dello stesso R1: UI author ha segnalato metadata privacy discordanti tra getRest e preview per riposo personale successivamente collegato a campagna. Un unico helper ora conserva visibilityprivate con localfalse per target divenuto condiviso. Inoltre il filtro elenco per actorId viene applicato anche dopo proiezione, impedendo di dedurre un partecipante invisibile attraverso i suoi compagni. Due nuove regressioni rosse→verdi; rilettura indipendente di questo delta richiesta.
5. Ultima verifica dominio: `node --test design/blueprint/tests/rest-time.test.mjs` **35/35 PASS**. Suite completa intermedia dopo i tre fix:367/367 PASS. Nuovo snapshot condiviso dopo il delta: **371 pass,1 fail,372 test**. Unico rosso: nuovo test UI `authorized personal die evidence does not require live campaign access after joining`, ancora in correzione dall'autore UI al momento della verifica. La query del dominio mantiene già la storia personale leggibile dal proprietario. I precedenti rossi WIP di profilo/UI assente sono stati risolti. Nessun rosso esterno nascosto o file altrui modificato per alterare il risultato. Log locale: `~/Workspace/Codex/d20-blueprint-evidence/2026-09-23/rest-domain-suite.tap`.
6. Dopo il fix UI della consultazione storica, nuova esecuzione completa dell’autore: **375/375 PASS**, nessun rosso, stesso dominio `d89240a1…` e35 test propri. Il log locale è aggiornato a questa esecuzione.
7. Prettier eseguito sui file riservati; diff-check a consegna. Nessuna prova browser rivendicata. Integrazione root/Undo reale e percorsi UI necessitano le rispettive verifiche e review separate.

## Frontiere esplicite

Questo incremento non è un motore completo di effetti, calendario o recuperi. Non deduce riduzioni HP/abilità temporanee dai massimi corretti manualmente; il ripristino di riduzioni richiede dati d'effetto strutturati non ancora presenti. Alba, provviste/malnutrizione dettagliata, guardie/eventi preparati, attività di sintonia/identificazione, eccezioni di tutte le specie/classi e house rule non sono completate da queste policy. Le policy non verificabili rimangono manuali/da riconciliare: la loro presenza nel profilo non ne certifica l'esecuzione. Questi obblighi restano nel contratto, non sono tagli di scope.

Le API interne `observeRestEvent`/`advanceRoundTime` si fidano esclusivamente dei fatti di gioco già autorizzati dall'adapter root; non costituiscono un endpoint sicuro per comandi arbitrari. La demo locale non certifica ACL server, sincronizzazione o concorrenza distribuita. UI deve presentare le righe e i limiti, generare i dadi dentro commit e rispettare il contratto delle finestre. Le query proiettano i contenuti; non si consegna una copia pubblica dei record personali.

## Snapshot da revisionare

Hash SHA-256 dei file effettivi, **non SHA di commit**:

| File                                         | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/rest-time.mjs`             | `d89240a17492b08795a8e1b819d618e662680267aea88ad64d7a87bcc99bd259` |
| `design/blueprint/tests/rest-time.test.mjs`  | `1eb720a9ba815c4463cbfd55960e632d11db607b54f24d3b3e8cc39822501a92` |
| `changes/interview-01/blueprint-rest-api.md` | `ec76c1e45775de209c9a8ba47ec5f73bd0de2206e53d5a0488cbf61cc7e56f78` |

Il rapporto è evidenza dell'autore, non approvazione della propria implementazione. Prossimo passo: reviewer indipendente su questi file, chiusura dei raccordi root/UI e browser coordinato.
