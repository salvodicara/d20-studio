# Review distinta — profilo forme e accesso corrente al famiglio

23/09/2026. Reviewer `blueprint_characters`, modello e sforzo ereditati.
Worktree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Sorgenti e test letti senza modifiche; nessun browser. Candidato dirty
identificato con hash effettivi, non con un candidate SHA Git inventato.

## Perimetro e stato

Nuovo `forms-profile.mjs` e relativi test; delta di `forms-companions.mjs`
successivo alla review D1–D4: accesso live a Trova Famiglio, rilascio e
archiviazione terminali. I raccordi del builder e del seed sono stati letti
per verificare le chiamate all'helper. UI e consumer root hanno verifiche
separate. Non è un'attestazione dell'intero incremento 9.

**Finale del perimetro: nessun P1/P2 residuo. F1 e F2 chiusi dopo recheck indipendente.**

## F1 — P2, accesso dipendente dall'ordine delle concessioni della magia

`derivedFamiliarAccess` seleziona la prima acquisizione SRD verificata di
Trova Famiglio con `.find`. Due concessioni della stessa magia sono invece
istanze distinte, con preparazione propria, già supportate dal builder.

Probe Node indipendente sul candidato `cfc3056e…`:

- Prima riga `catalogId:'find-familiar'`, `grantId:'class:wizard'`,
  `prepared:false`, fonte immutabile SRD 5.2.1.
- Seconda riga stessa definizione, `grantId:'background:magic-initiate'`,
  `prepared:true`, stessa fonte verificata.
- `getFamiliarCastingAccess(actor).prepared` restituisce **false**; invertendo
  solo l'ordine dell'array restituisce **true**.

L'accesso valido della seconda concessione non può scomparire per l'ordine
delle righe. Nessun costo o stato sono stati modificati dal probe.

Fix: il getter considera tutte le acquisizioni verificate e autorizza se una
è preparata. Recheck indipendente sui due ordini passa. Avviato poi un lancio
reale tramite dominio, revocare entrambe le preparazioni prima della
conclusione rende la preview invalida e il comando fallisce atomicamente; dopo
JSON reload e ripristino di una concessione valida, il completamento consuma
esattamente un materiale e uno slot. **Chiuso.**

## F2 — P2, un Apply del builder perde la correzione manuale del massimo

L'helper assegna incondizionatamente `feature.max` dalla tabella del druido.
La scheda consente una correzione esplicita del massimo e dei consumi tramite
«Gestisci capacità»; il builder già conserva tali correzioni nelle proprie
istanze e nei ledger, ma l'helper finale le sovrascrive.

Probe Node indipendente, stessa classe e livello:

1. `updateCharacterFormsProfile` su druido 3 crea riserva max 2.
2. Registrare valori vivi max 5 e used 3, come il comando scheda.
3. Richiamare l'helper con lo stesso druido 3: risultato **max 2 / used 3**.

La chiamata è presente a fine `applyCharacterDraft`, dopo il merge delle
risorse: anche un normale Apply senza modifica del livello causa la perdita.
Occorre distinguere massimo derivato da correzione esplicita e conservare o
riconciliare quest'ultima, mantenendo progressioni normali e storia degli usi.
La review non propone un recupero di risorse né un privilegio aggiuntivo.
Fix: la baseline derivata è distinta da `manualOverrides.max` con fonte
manuale. Recheck indipendente conserva max 5 e `used:null` dopo progressione,
rimozione della classe, JSON reload e riaggiunta; massimo zero disattiva il
pool mentre la classe è assente, senza perdere la correzione. Anche il
percorso reale `createCharacterDraft`/`applyCharacterDraft` è stato eseguito:
druido 2 completo, max 5/used 3, revisione invariata, sostituzione con guerriero
e ripristino del druido conservano identità, max corretto e usi spesi. La
progressione senza override 2→3→4 rimane coperta e verde. **Chiuso.**

## Altre verifiche lette

- Saldo canonico in `actor.features`; il profilo mantiene solo riferimento,
  livello e metadati. Record con usi ignoti e ledger non sono trattati come
  riposo.
- Sorgente verificata e acquisizione effettiva richieste per i profili gestiti;
  nome visualizzato o semplice classe Mago non concedono la magia.
- Preparazione, Ritual Adept, libro leggibile/trasportato e quantità sono
  interrogati dal getter puro corrente, senza autorizzazione dal cache.
- Il dominio rilegge l'accesso anche prima di completare il lancio; selezione
  e query non consumano slot o materiale.
- Rilascio/archiviazione già terminali non consentono una nuova spesa; retry
  della stessa operazione rimane distinto da un nuovo comando.
- Seed sintetico una sola volta, identità Mira separata e niente ricreazione
  di incenso consumato o token rimosso alla semplice ripetizione.

## Verifica finale

`node --test` sui quattro file `forms-profile.test.mjs`,
`forms-companions.test.mjs`, `forms-ui.test.mjs`, `state.test.mjs`: **79/79 PASS**
(9 profilo, 31 dominio, 23 UI, 16 store). Oltre alla suite sono stati eseguiti
i probe indipendenti descritti in F1/F2. Nessun test o source modificato dal
reviewer; non sono prove browser o un certificato del catalogo completo.

## Hash finali della review

| File                              | SHA-256                                                            |
| --------------------------------- | ------------------------------------------------------------------ |
| `forms-profile.mjs`               | `e1116cadef3fc352b173a920991f634eb61f6e0110d94e6970ad17e45af76c1a` |
| `tests/forms-profile.test.mjs`    | `78761de7494c9e8fa56f44c7824242992d39acb1d2b9ca87996ade87a905274b` |
| `forms-companions.mjs`            | `5a8c21a84b6f2e2afc6e8a4ec3b2cfda1cb7d92407c88962fdcac04ffae89586` |
| `tests/forms-companions.test.mjs` | `29b67a603b5381738647ac0d9a758171841c7e7567080275fcd67cea6434f054` |

I consumer di combattimento, Tavolo, collocazione e il resto dei raccordi
root rimangono fuori da questo verdetto circoscritto.
