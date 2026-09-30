# Incremento 9 — review indipendente dei raccordi root

Data: 23 settembre 2026. Reviewer: `blueprint_module_review`, modello/sforzo
ereditati, senza override. Worktree: `d20-studio-interview-01`.

**Esito sullo snapshot sotto: nessun P1/P2 residuo nel perimetro verificato.**
Due P2 riprodotti durante la review sono stati corretti dal coordinatore e
ricontrollati indipendentemente. Questa review riguarda i consumer root:
non attesta il modulo `forms-ui` scritto dal reviewer, né sostituisce la
review di `forms-companions`/`forms-profile`.

## Perimetro e metodo

Lettura mirata di posizionamento/comparsa, permessi dei compagni, statistiche
effettive, PF temporanei, movimento, tratti, ciclo di vita, iniziativa,
clock/riposi e Undo. Il dominio forme è usato nei probe come API pubblica,
senza ripetere la sua review. Nessuna modifica a fonti o test degli autori;
unico file scritto: questo report. Nessun browser usato dal reviewer.

Riferimenti: [API forme](blueprint-forms-api.md),
[ricerca R193](blueprint-forms-companions-research.md),
[pre-review root](blueprint-forms-root-pre-review.md). I rilievi precedenti
sui dadi personali e sulle deleghe revocate non sono stati riaperti senza
evidenza; le relative regressioni sono incluse nel gruppo eseguito.

## R1 — P2: compagno personale senza percorso verso la campagna — chiuso

Prima del fix, creare un compagno manuale con genitore personale produceva
correttamente una creatura `visibility:private`, `campaignIds:[]`.
Collegare successivamente il genitore lasciava personale il compagno, ma
`previewCompanionMapPlacement` richiedeva di collegare la creatura e
`connectCharacterToCampaign` rifiutava ogni `kind:npc`. Anche il pulsante
della scheda era riservato ai personaggi: l'istruzione non era eseguibile.

Fix root in `character-access`, `homebrew-integration` e `characters`:
collegamento esplicito anche per un attore con metadata `companion`,
membership corrente obbligatoria e controllo delle definizioni Biblioteca
riusato. Nessuna condivisione automatica del genitore o degli altri compagni.
La preview distingue contenuti della scheda condivisi da Appunti personali
e registrazioni private del passato.

Recheck indipendente PASS, usando `bindCharacters` e lo store reale:

- Il pulsante esiste; aprire la preview lascia ancora privata la creatura.
- Confermare rende consultabile al DM soltanto il compagno; il genitore
  personale resta identico e inaccessibile al DM.
- Il successivo posizionamento è disponibile e non duplica la creazione.
  Undo del posizionamento rimuove la pedina conservando il collegamento;
  Undo del collegamento ripristina la creatura personale.
- La regressione dell'autore verifica anche revoca membership, rifiuto del
  DM non proprietario e conservazione della privacy degli eventi d'origine.

## R2 — P2: il Tavolo esponeva il compagno dopo la revoca — chiuso

Prima del fix, `renderTable.canObserve` consultava `canViewActor` soltanto
per gli attori privati. Con compagno condiviso, pedina visibile e membro
`player` disattivato, `canViewActor` e `canControlActor` restituivano `false`,
ma l'HTML del Tavolo conteneva ancora nome, pedina e voce dell'iniziativa.

Fix root: i compagni passano anche la query di accesso corrente prima della
proiezione di pedine e iniziativa. Recheck SSR indipendente PASS dopo la
revoca: nome e attributi `data-actor`/`data-select` assenti; il PNG pubblico
ordinario resta osservabile. Il fix non concede controllo attraverso la
sola visibilità del token.

## Altre verifiche effettive

- `renderCharacters`, `renderTable`, `listActions` e `previewAction` su un
  attore trasformato non modificano lo stato canonico. Probe con CA base 18
  e Gatto CA 12: Correggi valori precompila 18; scheda, Tavolo e raccolta
  proiettano 12. Undo della trasformazione ripristina attore e operazione.
- Movimento canonico: 6 m già spesi e uno Scatto restano registrati. I test
  coprono il budget residuo dopo cambio di velocità e i danni fissi senza
  inventare un dado o raddoppiare il danno fisso al critico.
- I test coprono assorbimento dei PF temporanei prima dei PF, TS di
  concentrazione sui danni ricevuti e difese effettive della forma.
- Famiglio senza attacchi, anche con arma aggiunta; compagno non disponibile
  escluso dalle azioni di combattimento, movimento, porte e piazzamento.
  La scomparsa nel proprio turno avvia quello successivo una sola volta;
  Undo ripristina entrambi. Non si attesta ogni comando amministrativo della
  scheda come azione di gioco.
- Pack Tactics del Lupo modifica davvero i dadi dell'attacco; Agile del
  Ratto evita l'opportunità. Prono del Morso è dichiarato **non automatizzato**
  nel dettaglio della mossa: il metadata non equivale a una condizione
  applicata. Il danno fisso è leggibile nella preview.
- Probe con clock personale a 3594 secondi e attore in iniziativa: il round
  successivo aggiunge 6 secondi una volta sola, fa scadere la forma nello
  stesso commit dello store, e Undo ripristina clock e forma.
- La perdita di accesso invalida comandi e richieste digitali pendenti;
  i dadi originariamente personali restano privati dopo collegamento,
  Undo e reload. I test precedenti di questo raccordo restano verdi.

## Comandi eseguiti e limiti

Gruppo esteso: **79/79 PASS**, con `node --test` su
`companion-integration`, `table`, `state`, `combat`, `rest-integration`,
`spatial`, `homebrew-integration` sotto `design/blueprint/tests/`.
Dopo gli ultimi delta di copy e raccolta Personaggi: **26/26 PASS** su
`characters`, `companion-integration`, `table`. I gruppi si sovrappongono:
non sono conteggi da sommare. I probe indipendenti sopra sono stati eseguiti
con Node/heredoc, senza introdurre file di test nel checkout.

Nessuna attestazione di browser, touch, tastiera reale, screenshot o playtest
umano da questa review. Tali verifiche appartengono al coordinatore e alla
sua evidenza. Restano i limiti dichiarati dell'incremento: tre profili del
catalogo, anatomia/bonus degli oggetti incompleti, Prono non automatizzato.
Non sono trasformati in una dichiarazione di completamento del prodotto.

## Snapshot SHA-256 ricontrollato

Hash dei file effettivi nel worktree, non SHA di commit. Fonte dei percorsi:
`design/blueprint/`, salvo i test indicati.

| File                                   | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `companion-map.mjs`                    | `d25eee2d431ba09f15c7eb3042b0925c2672dbdd61e764b69776c5cd294e2809` |
| `character-access.mjs`                 | `b9c5346f5241590bd768c74766eae495e4168592d64dd015c6db2de4d85de91a` |
| `homebrew-integration.mjs`             | `041a9cf581176d50b82e1a18ba09d5cdd417f8180258310433d35b03b4e8ee7c` |
| `characters.mjs`                       | `769f1100632707790189af7af21a722421960f264198cd04e73a16677ae04931` |
| `table.mjs`                            | `3f195fae0e7350a5473b4b1e8a987a9405503c52df3bb03e7a4f486cbb8f4ac7` |
| `combat.mjs`                           | `37d7d1eb6ab4dd61b91ed47511f752f2789fa2db0d3669dee0fa0ca4fb0225c6` |
| `combat-ui.mjs`                        | `ca359fd5087132e3ae3505056af9c645de192304197b451282b56d60f91cd572` |
| `state.mjs`                            | `5e649e720d804caf540f3ed025c37bc95a3b77c8ceff4b30af941ffc72f1909c` |
| `rest-time.mjs`                        | `95cca248a9307d44fc2287fd453904e6bd2a7c94994c0596660f26e72d263ac8` |
| `preparation.mjs`                      | `b52d10250e370959c5116e3036f2dde9b62693f6e04f8ad885d00fa20a527322` |
| `tests/companion-integration.test.mjs` | `f37da6f6eb24ddbccafbe046db6f90d38ba705241e94ce07ead37ddd31faadea` |
| `tests/table.test.mjs`                 | `ee36bf1fc74067156fe2f5e00162b9573374c67f30ef059ff20ac459c2b3ad35` |
