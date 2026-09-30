# Incremento 8 — review indipendente di riposi e tempo

23/09/2026. Reviewer `/root/blueprint_characters`, modello e sforzo ereditati. Worktree `~/Workspace/Codex/d20-studio-interview-01`. Proprietà esclusiva di questo rapporto; sorgente e test letti/eseguiti senza modificarli. Nessun browser condiviso. Gli autori del dominio, della UI e dei raccordi sono altri agenti.

## Stato della review

**Review indipendente conclusa: nessun P1/P2 residuo nel perimetro dell’incremento 8 esaminato.** R1–R4 sono stati riprodotti, corretti dagli autori e ricontrollati separatamente. Piano, [API](blueprint-rest-api.md) e [R192](blueprint-rest-time-research.md) costituiscono il riferimento. Lo snapshot è dirty e identificato dagli hash dei file in fondo: non viene inventato un candidato SHA o attestata una release. Le sezioni iniziali conservano la cronologia delle verifiche anticipate; il verdetto riguarda soltanto lo snapshot finale indicato.

La prima lettura riguarda i raccordi root: conservazione dadi/Undo in `state.mjs`, metadati di recupero in `rest-profile.mjs`, chiamata finale di applicazione nel builder, alias dello slot di primo livello dopo JSON nel combattimento. I due test di movimento/inizio iniziativa, inizialmente comunicati come deliberatamente rossi, erano già verdi quando il reviewer li ha eseguiti: non vengono segnalati come difetti.

## Evidenza indipendente iniziale

Comando eseguito:

```sh
node --test design/blueprint/tests/rest-store.test.mjs design/blueprint/tests/rest-profile.test.mjs design/blueprint/tests/combat.test.mjs design/blueprint/tests/rest-integration.test.mjs
```

**30/30 passati.** Questa esecuzione copre il gruppo indicato, non tutto l'incremento o un percorso browser.

Un ulteriore probe Node del reviewer ha usato API reali e store persistente: Livia privata fuori campagna, PF 5/22, COS 2; breve personale, Dado Vita fisico d6, faccia 1. Cura minima 1 applicata. Le query di riposi e tiri per DM restituiscono liste vuote. Cinque Undo, dalla risoluzione fino all'avvio del riposo, conservano la faccia accettata come evidenza `reversed`, un solo record audit e PF5. Ricaricamento JSON conserva stato e faccia. **Probe passato**; nessuna modifica a fixture o test su disco.

## Punti comunicati agli autori, ancora da ricontrollare

1. **Breakdown audit.** La lettura iniziale registrava `natural:1`, `modifier:-4`, `total:1`, senza il risultato dettagliato del dominio. Il totale applicato richiede spiegazione del minimo; faccia più modificatore non fanno 1. Root ha successivamente comunicato l'aggiunta di `result` completo (`rawTotal`, `healing`, `applied`, `overflow`, `before`, `after`). Rileggere campo e consumer sull'handoff, senza dichiarare ora un errore UI non ancora montata.
2. **Builder e Dado Vita pendente.** Il gate del builder letto controllava combattimento e pozione pendenti, ma non il Dado Vita dello stesso attore. Root sta aggiungendo il raccordo causale con regressione. Ricontrollare la nuova guardia e il caso di attore estraneo, senza blocchi globali.
3. **Breve ottenuto da lungo interrotto.** L'autore dominio sta correggendo il momento dei benefici deterministici secondo EN185; non valutare la prima stesura come implementazione conclusa. La review finale deve verificare interruzione, combattimento, eventuale tiro già pendente, ripresa e assenza di applicazioni duplicate.

Nessun verdetto di assenza di bug: i punti sopra non sostituiscono l'ispezione del dominio/UI finale.

## Hash della sola lettura iniziale

I file possono cambiare dopo questi hash. Non sono l'identità di un candidato approvato.

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/state.mjs`                       | `de488679057228fc4064a4ef26e2510aa2326bf87152a5de52413e3a431a03df` |
| `design/blueprint/rest-profile.mjs`                | `bed2846df9b86b1e690637b57ea96a1ed4bf2586153b406a4f8c7f6f9146fbab` |
| `design/blueprint/character-build.mjs`             | `6bb0deed7cbbbdb17f5ff36e976d6b4445c189a2ec5e4704bc054be058ca0e03` |
| `design/blueprint/combat.mjs`                      | `dcd7c3909ca65bf9936131231c84b69ad1a8be391189539874fddd1f4f134352` |
| `design/blueprint/tests/rest-store.test.mjs`       | `d6a48ba6bf2cf0f7c2cc4f4a46cbe7ea658b7b5f5597b75d5cd990bfc4688fee` |
| `design/blueprint/tests/rest-profile.test.mjs`     | `31dfbbed46039bb6980382ceb2f6fe68ad378841310b907982c67999ec5d9248` |
| `design/blueprint/tests/rest-integration.test.mjs` | `e43a079044469ef7f537531fe761e1749a0ef4d66866e080e0d1671183ba594f` |

## Prossimo controllo alla consegna stabile

Autorità/visibilità e revoca per riposi personali e di gruppo; clock narrativo distinto dagli appuntamenti; lifecycle di breve/lungo/interruzione/Trance; risorse ignote, parziali e inattive; recupero arcano separato; tiri fisici persistenti e retry; correzioni, Undo ripetuto e fonte dei risultati; profili dopo avanzamento; raccordi danni/lanci/movimenti/round; anteprime pertinenti; dialoghi dirty/error/cambio ruolo e ritorni contestuali; breakdown EN/IT e controlli accessibili. La prova browser rimane compito del coordinatore e sarà citata separatamente, mai presentata come eseguita dal reviewer.

## Review del primo handoff stabile del dominio

Dominio `rest-time.mjs` SHA-256 `c7590c6f2925e91755d7f6ba442ff719ac43dcea87239b40b4eb9be467a5596f`. Il gruppo `rest-time`, `rest-store`, `rest-profile`, `rest-integration` passa **41/41**. La UI non è ancora in handoff: questo non è il verdetto complessivo dell'incremento. Le riproduzioni seguenti sono probe Node indipendenti attraverso API reali, senza modificare sorgente o test dell'autore.

### R1 — P2: revoca della membership non applicata a riposi già avviati

**Chiuso dopo recheck indipendente su `167c3ae7f7f36243974d6aefe78695d73fa59e3942d42f8462e2442c3c5ec5e8`.** Avviare un breve di campagna con Livia e Doran come DM, avanzare di 3600 secondi, impostare `player.active=false` in `campaign.members`. `getGameTime` nega correttamente l'accesso al player, ma `getRest` gli restituisce entrambi i partecipanti, `getRestRecoveryProfile(state,"doran","player")` espone PF27, `previewRestCompletion` su Livia dà `canApply:true` e `completeRest` applica il beneficio. La guardia del nuovo avvio non copre query e comandi successivi. Rivalidare l'autorità corrente sul contesto campagna; conservare l'accesso autorizzato alla storia e alle schede personali non equivale ad autorizzare nuove conseguenze nella campagna revocata.

### R2 — P2: Trance di quattro ore concessa dopo soltanto due ore di meditazione

**Chiuso dopo recheck indipendente su `167c3ae7f7f36243974d6aefe78695d73fa59e3942d42f8462e2442c3c5ec5e8`.** Configurare il profilo elfico tramite `updateCharacterRestProfile`, avviare un lungo in `trance`, avanzare 7200 secondi, scegliere `light`, avanzare altri 7200. Il partecipante ha `elapsedSeconds:14400`, `sleepSeconds:0`, `lightSeconds:7200`; il completamento è ammesso. La riduzione a quattro ore richiede che quelle ore siano trascorse in meditazione (SRD 5.2.1 EN85), mentre il modello controlla solo durata totale, sonno e limite delle attività leggere. Serve distinguere il tempo effettivo di Trance dalla semplice durata del riposo, senza trasformare un cambio di attività in tempo meditato.

### R3 — P2: collegare la scheda personale perde il vincolo fra due lunghi

**Chiuso dopo recheck indipendente su `167c3ae7f7f36243974d6aefe78695d73fa59e3942d42f8462e2442c3c5ec5e8`.** Livia privata con `campaignIds:[]`: lungo personale, 28800 secondi registrati e completamento. Chiamare quindi il collegamento reale `connectCharacterToCampaign(state,"livia","player")` e anteprima di un nuovo lungo nella campagna. Il nuovo avvio è subito ammesso (`canApply:true`, nessun errore), perché cerca una conclusione solo nel medesimo `campaignId`. Il precedente lungo personale non deve sparire dal controllo delle sedici ore. I due clock non hanno un offset deducibile: richiedere un raccordo esplicito quando necessario, senza inventare ore trascorse.

### Raccordi già ricontrollati su questo handoff

Il record audit include il risultato dettagliato del Dado Vita; il builder blocca il proprio attore con Dado Vita pendente; l'ingresso in iniziativa dopo un'ora di lungo assegna subito i recuperi deterministici del breve. I test di integrazione relativi sono verdi. Recupero Arcano ora usa `featureId` per leggere e aggiornare il contatore della scheda e il ledger, mantenendo il fallback del profilo soltanto quando non esiste la capacità strutturata. Nessuna chiusura implicita dei tre finding sopra.

### Recheck indipendente R1–R3

Il probe originale è stato convertito in asserzioni indipendenti ed eseguito nuovamente. Query e completamento negati dopo revoca, clock non esposto dalla preview, DM ancora autorizzato; 2h di Trance + 2h leggere negate e completamento consentito soltanto raggiunte 4h reali; collegamento alla campagna negato senza attestazione, 57599 secondi insufficienti e 57600 sufficienti, senza muovere il clock condiviso da zero. Lo storico personale precedente non diventa visibile al DM dopo il collegamento. **Tutti i probe passati.** Gruppo mirato dominio/store/profili/integrazione/UI: **62/62** al ricontrollo.

### R4 — P2: evidenza di dado conservata ma irraggiungibile dopo Undo dell'avvio

**Chiuso dopo recheck indipendente UI, incluse persistenza JSON e privacy.** Riproduzione tramite lo stesso harness UI con controlli rigenerati a ogni render: breve, avanzamento DM di un'ora, completamento, Dado Vita fisico con faccia3 accettata. Undo della risoluzione, spesa, completamento, tempo come DM, avvio come player. `listRests` restituisce zero; `getRestRolls` conserva esattamente un tiro `reversed` con faccia3. Riaprire Riposa mostra solo la preparazione di un nuovo riposo: non esiste sezione dei dadi registrati o riposo da aprire. Il registro del Tavolo mostra soltanto etichette neutre. Occorre una consultazione delle evidenze orfane già autorizzate, senza comandi per riapplicare un risultato annullato. L'autore UI deve preservare il filtro del dominio, incluso il contesto personale originario.

### Raccordi UI e shell letti

Ingressi dalla scheda e dal Tavolo, dialogo comune, refresh dopo commit, reset al cambio ruolo/esempio e CSS montato: nessun P1/P2 distinto trovato in questi raccordi. Le preview sono nuovamente proiettate dopo revoca invece di mostrare nomi dalla cache; relativo handler test verde. Raccordo minore segnalato e corretto dall'autore: `concentration.active` ora riceve etichetta Concentrazione e stati leggibili, non `Risorsa · true → false`. Il coordinatore esegue la prova browser separatamente; questo rapporto non ne rivendica l'esecuzione.

### Recheck indipendente R4 e privacy originaria

Probe aggiuntivo con harness reale: riposo personale, faccia fisica3, cinque Undo fino a rimozione dell'avvio, nuova istanza store da JSON e riapertura del pannello. Il registro mostra l'evidenza reversed, nessun pulsante Resolve; il DM non vede né nome né tiro personale. **Passato.** Il gruppo mirato arriva a **67/67** nello snapshot successivo ai fix.

Il raccordo store è stato provato anche con comandi reali distinti: breve personale → Dado Vita pendente → collegamento della scheda alla campagna → risoluzione senza opzioni private → reload JSON. Il ledger resta privato al proprietario e il record audit resta `visibility:private`, benché la scheda sia ora condivisa. Nessuna faccia nuova o duplicazione; `state.mjs` ricontrollato SHA `f91f01b292166679a440e1b4cd484ea03d28e252dd49db29efcc9cf9afefba87`.

Il delta dominio successivo uniforma `commitForRest`: il contesto personale conserva visibilità privata, mentre la modifica a una scheda ormai condivisa richiede comunque rete. Inoltre un filtro per attore invisibile non rivela che partecipasse a un riposo con altre schede visibili. Le regressioni passano; il DM non può usare nemmeno la correzione di un riposo personale precedente pur controllando ora la scheda condivisa.

## Verifica finale e limiti

Ultima esecuzione indipendente dei cinque file test riposi: **70/70 PASS** (dominio35, UI22, store4, profili3, integrazione6). Riletto l’ultimo delta UI: progresso della Trance effettiva, input di raccordo fra contesti senza avanzare il clock, registro orfano con faccia/modificatore/minimo e stato non applicato, commit privato dopo collegamento della scheda. Le correzioni di membership, proiezione filtrata, provenienza della risorsa e audit restano coerenti nei raccordi.

Comando finale:

```sh
node --test design/blueprint/tests/rest-time.test.mjs design/blueprint/tests/rest-store.test.mjs design/blueprint/tests/rest-profile.test.mjs design/blueprint/tests/rest-integration.test.mjs design/blueprint/tests/rest-ui.test.mjs
```

Le prove Node indipendenti aggiuntive, descritte sopra, coprono i trigger originali e varianti di autorizzazione/reload. Il reviewer non ha usato il browser. Il coordinatore ha comunicato separatamente quattro percorsi browser con undici gruppi verdi, inclusi il nuovo R4 e close/reload/reopen: evidenza del coordinatore, non osservazione runtime di questo reviewer. Il coordinatore ha inoltre comunicato **375/375** nella suite globale; tale esecuzione e l’ultimo controllo visuale restano attribuiti al coordinatore.

Questo esito non dichiara completo il catalogo dei recuperi, un motore universale di durata, la sicurezza server o la sincronizzazione remota. Restano i limiti espliciti della consegna: alba e calendari dettagliati, provviste, recupero delle riduzioni strutturate non ancora modellate, attività durante il riposo ed eccezioni delle capacità non implementate. Le lacune non diventano funzioni approvate per omissione. Non sono stati modificati sorgente, test, modelli o browser altrui.

Ultimo ricontrollo circoscritto della shell: letto il testo IT/EN di “Cosa è pronto” che aggiunge riposi, tempo, Dadi Vita e correzioni. Descrive i comandi montati, mantiene il limite del contratto ancora in costruzione e non modifica guardie o handler. Hash app coincidente con la tabella finale.

## Hash dello snapshot finale ricontrollato

File effettivi nel worktree, SHA-256; nessun commit candidato dichiarato. I vecchi hash nelle sezioni precedenti documentano soltanto i checkpoint intermedi. Una modifica successiva alle parti esaminate richiede ricontrollo del delta.

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/rest-time.mjs`                   | `d89240a17492b08795a8e1b819d618e662680267aea88ad64d7a87bcc99bd259` |
| `design/blueprint/rest-ui.mjs`                     | `b4b36be487aff1cbe5fc12be52a93be468bed668670224e5adb29980b422d502` |
| `design/blueprint/rest-ui.css`                     | `bb389cb797c397f9057acfe53c7148b466b4b7c70d5e7da998fb44c98ee56c44` |
| `design/blueprint/rest-profile.mjs`                | `8d07dafa7274a9dbb72ee4f2984f158fcb996179a38a96ddb18f130c47d2d651` |
| `design/blueprint/state.mjs`                       | `f91f01b292166679a440e1b4cd484ea03d28e252dd49db29efcc9cf9afefba87` |
| `design/blueprint/character-build.mjs`             | `2b6a1b688898e182f48a15c29d5faeba7bea6138d28650d78d83344869b8ce04` |
| `design/blueprint/combat.mjs`                      | `8a5218034638c9cb8604bfea0356cd1fbefcbae4dece6c950f791112fd0d7e16` |
| `design/blueprint/app.mjs`                         | `f121eac3a9587252150f6048eba3eb1f0f619ec6387998cbf183809b356a66aa` |
| `design/blueprint/table.mjs`                       | `fa72ae3cfe196379b2acd9828187aca18e95ae8ca9c3bdd30a81bf74221a018f` |
| `design/blueprint/characters.mjs`                  | `523b30998d0c30d0c611425f4721db02723f7fb4b0fdc268f7a8989ac168e348` |
| `design/blueprint/preparation.mjs`                 | `2b501fb4bedddfd919c41350b2226fc3defd54d2c4dc0b3be61316af95e724ce` |
| `design/blueprint/index.html`                      | `dc498fb9ea672b2c983c7d5891eee9a588e5586c7a60ac6fb285395cfb92f45c` |
| `design/blueprint/tests/rest-time.test.mjs`        | `1eb720a9ba815c4463cbfd55960e632d11db607b54f24d3b3e8cc39822501a92` |
| `design/blueprint/tests/rest-ui.test.mjs`          | `f14d04585b2d44f18e57e567a19d534aaddacd1494ee062b0653cb91a8ceb557` |
| `design/blueprint/tests/rest-store.test.mjs`       | `4adcea74983a5bbb5cb88790ce1bf3342bf6bb8dea5073bc5a77fe59d7cb7614` |
| `design/blueprint/tests/rest-profile.test.mjs`     | `e3221b71ec2fe33ad3612c33e0a712165f78944f62541c0ff08e43fbc7708c9f` |
| `design/blueprint/tests/rest-integration.test.mjs` | `7da42397c6ff40dbc2b4ee24152c381e3698afda2a80c69fad718f5d63d8c4f1` |
