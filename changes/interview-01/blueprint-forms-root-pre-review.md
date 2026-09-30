# Incremento 9 — verifica anticipata dei raccordi root

23/09/2026. Reviewer: `/root/blueprint_characters`, distinto dall'autore dei
raccordi. Worktree: `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Modello e sforzo ereditati, invariati. Solo lettura di sorgente e test; questo
report è l'unico file scritto dal reviewer. Nessun browser o candidato Git
attestato: la candidata è dirty e dominio/UI dell'incremento 9 sono ancora in
costruzione.

## Perimetro

Accesso/delega degli attori, proiezione delle richieste e dei risultati, PF
temporanei, contabilità movimento/Scatto, geometria del posizionamento. Fonti
di intenti: piano incremento 9, API forme/compagni e R193. Il danno fisso, il
posizionamento tramite Tavolo, l'integrazione dei valori effettivi, il dominio
e la UI nuovi non ricevono un verdetto di completezza da questa verifica.

## R1 — P2: lo storico rivela i tiri di un attore personale al DM

**Stato: chiuso dopo il secondo recheck indipendente.**

`projectAttempts` ora nasconde correttamente nome e richieste di un attore
privato del giocatore, ma `combat-ui.mjs:renderRollHistory` ammette ogni tiro
quando `ctx.role === "dm"`. Il nuovo controllo sui PNG personali è quindi
aggirato dal pulsante Tiri e risultati. Inoltre `state.mjs:acceptedRolls`, nel
ramo combattimento, non considera `actor.visibility === "private"`: senza
l'opzione privata del commit può persino registrare quell'evidenza come
condivisa.

Riproduzione indipendente con `createStore`, `beginAttempt`, `resolveRoll` e
il vero `renderRollHistory`, senza browser:

1. Copiare il profilo sintetico di Livia in `pet`, con `kind:"npc"`,
   `owner:"player"`, `visibility:"private"`, `controllers:[]` e nome
   `Private synthetic familiar`. Si tratta di un PNG di prova, non di un
   famiglio normativo con divieto di attacco.
2. Posizionarlo accanto a `goblin-1`, metterlo al turno corrente, avviare il
   Bastone ferrato fisico. Accettare la faccia naturale 18 in un commit con
   `{visibility:"private"}`.
3. `projectAttempts(state,"dm")` restituisce `actorName:null`,
   `sourceHidden:true`, `requests:[]` per la sua azione.
4. `renderRollHistory` con la stessa identità DM produce invece
   `Private synthetic familiar · Attack` e `18 + 2 = 20`.

Atteso: evidenza consultabile dai destinatari autorizzati dell'origine
personale, anche dopo Undo/reload; nessuna autorità DM universale sulle
istanze personali. La riservatezza di un tiro PNG di campagna e quella di un
attore personale devono restare distinguibili, senza cancellare i dadi.

Recheck del primo fix: la richiesta conserva `personal` e `owner`; lo store
registra `personal:true` e `visibility:"private"` anche con opzioni commit
ordinarie, e `renderRollHistory` non concede più accesso universale al DM.
La regressione dell'autore include Undo, condivisione successiva e reload;
un probe indipendente conferma anche il ramo senza Undo.

Quest'ultimo probe individua il residuo: dopo tiro personale accettato 18,
condivisione dell'attore e JSON reload, `renderRollHistory(dm)` è vuoto ma
`projectAttempts(dm)[0].requests` contiene ancora la richiesta
`personal:true`, `values:[18]`, `modifier:2`, `total:20`. Il dialogo mostra
quindi il medesimo risultato attraverso la lista delle richieste. La privacy
d'origine deve valere anche in questa proiezione, non soltanto nel ledger.

Secondo fix verificato: `resolveRoll` non delega la richiesta personale al
nuovo controllore DM; `projectAttempts` e il controllo UI rispettano
`personal`/proprietario originario. Probe aggiuntivo PASS: creazione privata
del tentativo → condivisione mentre pendente → tentativo del DM negato senza
mutazione → proprietario accetta 18 → reload → richiesta e ledger invisibili
al DM → Undo e nuovo reload mantengono 18 consultabile dal proprietario come
risultato annullato. Le richieste nuove di campagna rimangono distinte.

## R2 — P2: una delega di compagno continua a funzionare dopo l'uscita dal gruppo

**Stato: chiuso nel recheck circoscritto dei comandi.**

`canControlActor` consulta proprietario/controllori ma non il contesto
campagna. `beginMovement` e gli altri consumer root usano quel controllo;
il nuovo dominio forme usa invece anche la membership corrente. Il risultato
è una divergenza concreta sulle nuove deleghe: il pannello del compagno può
negare accesso mentre il Tavolo consente di continuare a usarlo.

Riproduzione indipendente:

```js
const s = createInitialState();
s.actors.pet = {
  ...structuredClone(s.actors.livia),
  id: "pet",
  name: "Delegated synthetic",
  kind: "npc",
  owner: "dm",
  controllers: ["player"],
  visibility: "shared",
  campaignIds: [s.campaign.id],
  companion: {
    kind: "manual",
    parentActorId: "doran",
    lifecycle: "available",
    attacksAllowed: true,
  },
};
s.scenes[0].tokens.push({ actorId: "pet", x: 100, y: 100 });
s.combat.active = true;
s.combat.order = ["pet", "goblin-1"];
s.campaign.members = s.campaign.members.map((m) =>
  m.id === "player" ? { ...m, active: false } : m,
);
// isCampaignMember(s, s.campaign.id, "player") === false
// canControlActor(s.actors.pet, "player") === true
beginMovement(
  s,
  {
    id: "revoked-member",
    actorId: "pet",
    point: { x: 120, y: 100 },
  },
  "player",
);
// status === "resolved"; token pet now x=120, y=100.
```

Atteso: la nuova delega di un compagno condiviso non autorizza comandi dopo
la revoca della membership. Questo finding riguarda i nuovi compagni; non
afferma che l'intera autorizzazione legacy del Tavolo debba essere riscritta
in questo incremento. La correzione può essere circoscritta, preservando la
consultazione delle evidenze personali autorizzate.

Recheck: `canViewActor` e `canControlActor` accettano ora lo stato opzionale
e verificano membership/campagna per i compagni condivisi. I comandi e i
consumer interessati passano lo stato. Ripetuto il caso sopra: controllo
negato, `beginMovement` rifiuta senza mutare, il completamento/retry fisico
rifiuta, nessun tiro digitale automatico viene generato. Rimangono distinti
la disponibilità del compagno e il diritto di leggere la sua scheda/storia.

## Controlli eseguiti

- Lettura dei raccordi e delle regressioni assegnate; esecuzione di
  `node --test` su `companion-integration`, `spatial`, `combat`, `state`.
  Risultato della prima lettura: **51/52**. L'unico rosso era il test lifecycle/
  famiglio appena aggiunto mentre l'autore modificava quel ramo; comunicato
  come lavoro in corso, non come finding aggiuntivo.
- Passano i casi già montati per controllore delegato, revoca esplicita della
  delega prima del tiro digitale/fisico, attore privato negato al DM nelle
  richieste, PF temporanei assorbiti prima dei PF ordinari, TS concentrazione
  sul danno ricevuto, redazione delle riserve dei PNG, percorso e Scatto con
  costo cumulativo.
- Il test di posizionamento verifica portata, occupazione, input invalidi e
  geometria senza restituire ID di occupanti segreti. Il modello dichiara
  collisione del centro e diametro di una casella; non è una prova delle
  geometrie complete delle creature.
- Due probe indipendenti sopra eseguiti sullo store/dominio/renderer reali.
  Nessuna modifica a sorgente o test e nessuna installazione.
- Recheck del primo batch di fix: **57/57** test indipendentemente eseguiti
  sui cinque file `companion-integration`, `spatial`, `combat`, `combat-ui`,
  `state`. Il rosso transitorio lifecycle non è più presente. I probe
  aggiuntivi confermano R2 e isolano il residuo R1 descritto sopra.
- Recheck finale circoscritto: **50/50** sui quattro file di test
  `companion-integration`, `combat-ui`, `combat`, `state`; il probe supplementare
  chiude il residuo R1. Nessun P1/P2 residuo nel perimetro di questo precheck.

## Hash osservati durante la verifica anticipata

Questi identificano la lettura intermedia; non congelano il lavoro degli
autori. Una chiusura richiederà rilettura dei delta e hash aggiornati.

| File in `design/blueprint/`            | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `character-access.mjs`                 | `3586db21c45b1b65c9f1b3375e229241b4aa0d453f023c67f394f4c33e0011d7` |
| `combat.mjs`                           | `6ef8e7b9ed2a330098b75e2506546b73f5aa3f494505902662cf24c7d137d0fc` |
| `combat-ui.mjs`                        | `0c721dac8f589af9696843d83446ce8167e06d7809abe84993ac7faac1590514` |
| `state.mjs`                            | `a47cbcb69045fb57fcbb743d6107aa21c3250d173db6f8f9416d2d320ae2eed5` |
| `spatial.mjs`                          | `1f05d8a0181b7523e94d54929cff8719abc32ff9b7057700aa8a930e8b2df067` |
| `tests/companion-integration.test.mjs` | `7ab192662c32ebaf2e2107033c31a8f14b772b6daecca6520637f83a256423b5` |
| `tests/combat.test.mjs`                | `8cd21403fcdb2aea12abc17e784379717975ad09a61c9e72844949dab999f135` |
| `tests/spatial.test.mjs`               | `8ee7c28fd8474b327381c013ef9acfd1f3858954d2385948099d8d1d53be7dd8` |
| `tests/state.test.mjs`                 | `d38b55ef91cf3c1681ad1028eef73df216e94a4dedfe3be1de8faa6330bf7404` |

## Hash del recheck R1/R2

| File in `design/blueprint/`            | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `character-access.mjs`                 | `af9822a15678c258769c7e8f2f8b45be4bea569e32bb67366354cb9ac74c1e3d` |
| `combat.mjs`                           | `ffaa1f0efbcace2c682dd29a6e899474321c7609a80c1d9a8a4417882c060bef` |
| `combat-ui.mjs`                        | `fca28dc7a9aa212d42df0e4091da60e0b224f4a61f4aa6e666465afcd4afb319` |
| `state.mjs`                            | `b5a2cb909ad716a02349c3d0a445376a79015d642627c4a2f22389c6d4c1db21` |
| `tests/companion-integration.test.mjs` | `cb949ea90060a823113eb14414f1d9edca21b9241ce639d248477c4830799437` |

Questa chiusura vale per R1/R2 e i raccordi assegnati. Il root continua
l'integrazione dei profili effettivi e del lancio; nuovi delta richiedono
rilettura nella review dell'incremento, senza retrodatare questo esito.
Prossimo passo: review separata del dominio forme/compagni su handoff.
