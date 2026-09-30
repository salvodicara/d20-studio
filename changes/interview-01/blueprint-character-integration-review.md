# Blueprint — review indipendente dell'integrazione Personaggi

Checkpoint del 23/09/2026, `review_journey`, modello/sforzo ereditati.
Review in sola lettura del codice; unico file di review scritto. Nessun
browser condiviso o modifica all'implementazione. Il candidato è una
fotografia dirty identificata dagli hash sotto, non un commit approvato.

Perimetro: `character-access.mjs`, raccordi in `characters.mjs`, `app.mjs`,
`preparation.mjs`, `state.mjs`, test d'integrazione e stato. Verificati accesso
personale, appartenenza alla campagna, slot canonici, guardie d'uscita e
conservazione dei tiri. [CRE](../../docs/interview/CHARACTER_CREATION.md),
[ADV](../../docs/interview/CHARACTER_ADVANCEMENT.md) e
[ricerca builder](blueprint-character-builder-research.md) sono il riferimento.

## Esito del primo passaggio

Un P2 riprodotto e corretto dall'autore root. Nessun altro P1/P2 individuato
nel raccordo letto. La review dell'applicazione completa del builder e delle
guardie effettive UI resta da completare dopo la consegna dei moduli degli
altri autori: questo checkpoint non li approva anticipatamente.

### R1 — P2, modifiche di una scheda personale registrate come condivise — chiuso

`characters.mjs`, helper `commit`, non derivava visibilità/natura locale
dall'attore. Nuova scheda con `visibility=private`, `campaignIds=[]` e
proprietario giocatore: una prova fisica FOR10 creava il log
`Check: Strength · 10 +0 = 10` con `visibility=shared` e `history.shared=true`.
Il DM non poteva aprire la scheda, ma il log condiviso ne esponeva il tiro.
Le correzioni personali passavano inoltre dal rifiuto offline delle scritture
condivise. Il problema nasceva dall'integrazione delle nuove schede personali
nel percorso esistente.

Correzione dell'autore: l'helper impone `local:true` e `visibility:private`
per attori privati e non esegue il refresh globale delle conseguenze su
queste modifiche. Il comando esplicito di collegamento alla campagna rimane
separato, con avviso di condivisione e commit condiviso.

Verifica indipendente red→green con handler reale `bindCharacters`, store
reale e fixture personale: prima log condiviso; dopo opzioni locali, log
privato, tiro accettato, undo privato. Il collegamento esplicito rende la
scheda condivisa senza aggiungere token o iniziativa. Per eseguire il solo
handler mentre `character-build.mjs` era ancora in scrittura, l'import
`startCharacterBuilder` non utilizzato dalla prova è stato sostituito **solo
in memoria** con uno stub che lancia errore se chiamato. Nessun file
sorgente è stato cambiato. Questa prova non verifica il builder stesso.

## Riscontri senza finding

- Accesso: un attore privato è visibile solo al proprietario, anche quando
  l'altro visitatore è DM. `canControlActor` passa da questa verifica. Elenco
  Personaggi, ricerca, campagna e collocazione in Preparazione usano le
  guardie; un ID noto non basta a collocare una scheda privata.
- Appartenenza: `connectCharacterToCampaign` è esplicito e idempotente
  rispetto all'ID campagna. Non modifica scene o ordine. Gli attori legacy
  senza `campaignIds` conservano il comportamento delle fixture già
  esistenti; per quelli nuovi la lista vuota distingue l'uso personale.
- Slot: lettura scheda e dominio combattimento preferiscono
  `spellSlots[level]`; `slots` è fallback legacy al livello1. Il setter
  della scheda riallinea l'alias quando corregge livello1, conserva gli altri
  pool e gli usi eccedenti il massimo. Il JSON non conserva identità di
  riferimenti: conta l'uso coerente del pool canonico, non presumere che
  l'alias sia sempre lo stesso oggetto dopo ogni caricamento.
- Stato: il ledger dei tiri build conserva gli ID precedenti anche se una
  bozza viene riscritta o rimossa; le nuove evidenze sono private. Undo
  conserva facce e log, marca reversed il risultato accettato e riallinea
  le copie presenti nelle bozze. La regressione eseguita comprende reload.
- Shell: navigazione applicativa, hashchange, cambio ruolo e beforeunload
  consultano il controllo di bozza; cambio ruolo resetta la vista del
  builder prima del rientro. La correttezza end-to-end di Save/Discard/Stay
  dipende ancora dal modulo UI in consegna, non dal solo wiring.

## Verifiche eseguite e limiti

`node --test design/blueprint/tests/state.test.mjs`: **16/16 pass**.
Riproduzione Node isolata R1: pass dopo la correzione, con controllo di
privacy del log/undo e assenza di collocazione automatica dopo connessione.
Letti i quattro casi del test d'integrazione corrente, senza rivendicare
la loro esecuzione finché la catena d'import del builder non era completa.

Non verificati qui: browser, mobile/touch, UI finale del builder, applicazione
del dominio in lavorazione, catalogo esaustivo, sicurezza server o multiplayer
reale. Il cambio ruolo della demo è una simulazione, non un confine di
autenticazione. Nessuna nuova esclusione di prodotto deriva dai limiti.

## Hash del checkpoint letto

Percorsi relativi a `design/blueprint/`. Un cambio successivo richiede una
verifica mirata della differenza prima di riusare questo esito.

| File                                   | SHA-256                                                            |
| -------------------------------------- | ------------------------------------------------------------------ |
| `character-access.mjs`                 | `070fb85f35dfe9040500f53804e1cacef6a4375a84b37690b51dd4ae715f5a9a` |
| `characters.mjs`                       | `63f40f835585039fb77af81cfcd5ade512e2b3610c8382b24f28ef2f3838cfa0` |
| `app.mjs`                              | `97d75796e2dae44877306da44f6b9ca116a8aa28695c64a67120bb8421face53` |
| `preparation.mjs`                      | `1325e681f4763f16a694782a7c2be51f8810b6eeaf14b48f1bd48804cb211293` |
| `state.mjs`                            | `f5784a049411e536c2992436090b74146a610e98c1f704e213d160f1304250d7` |
| `tests/character-integration.test.mjs` | `ece40e9e7b9731a07efcabb7ebfd90424865b0026eba0a4b80135a6cc1afbf93` |
| `tests/state.test.mjs`                 | `5e43ad92db9fe77d02777f19b17e8f107b858e77a1ff1efb7fc33dfdc1c328b9` |
