# Incremento 9 — review indipendente del dominio forme e compagni

23/09/2026. Reviewer `/root/blueprint_characters`; autore del dominio
`/root/review_journey`. Worktree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Modello e sforzo ereditati, invariati. Solo questo rapporto è riservato al
reviewer; sorgente e test sono letti/eseguiti senza modificarli. Nessun browser.

Stato: quattro P2 riprodotti, corretti dall'autore e chiusi con recheck
indipendente. Nessun P1/P2 residuo nel perimetro del dominio esaminato. I
consumer root e la UI ancora in costruzione non ricevono qui un verdetto.
La chiusura separata dei raccordi root R1/R2 è in
[forms-root-pre-review](blueprint-forms-root-pre-review.md).

## Snapshot assegnato

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/forms-companions.mjs`            | `9bc4e39a355a98d292078036eae4e1100c4911015ea04a2c22b365cd7e1219f9` |
| `design/blueprint/tests/forms-companions.test.mjs` | `7bcc85f0392a46e2c712208926c3087dae4778b8370dfd16c7875a46ff270b10` |
| `changes/interview-01/blueprint-forms-api.md`      | `238e1d47fc3a5730d0812809b8b8d1598ec4822c8c67c299853b651ed352448f` |

Questi sono hash della candidata dirty consegnata dall'autore, non SHA di
commit. Gli hash delle correzioni saranno registrati al recheck.

## D1 — P2: Compagno Selvatico ignora l'indisponibilità di V/S

Stato: chiuso nel recheck.

`previewCompanionCreation` controlla livello, forma, risorsa e comparsa per
`mode:"wild-companion"`, ma non `combatProfile.componentsAvailable`. La fonte
esenta soltanto dalle componenti materiali: rimangono V/S di Trova Famiglio.
Il percorso ordinario applica già quel controllo attraverso `checkSpellAccess`.

Riproduzione dalla fixture `state()` dei test dominio:

```js
s.actors.hero.combatProfile.componentsAvailable = false;
const sel = {
  mode: "wild-companion",
  profileId: "srd2024:cat",
  name: "No components",
  cost: { kind: "wild-shape" },
  appearance: { kind: "attested", confirmed: true },
};
const p = previewCompanionCreation(s, "hero", sel, "player");
// canApply:true, errors:[]
createCompanion(s, "hero", sel, "player", {
  operationId: "no-vs",
  reviewKey: p.reviewKey,
});
// Creatura creata; feature Forma Selvatica used:1→2.
```

Atteso: preview e comando negati prima di consumare quando V/S sono
esplicitamente indisponibili, oppure percorso di correzione dichiarato;
l'esenzione da M non deve rimuovere V/S implicitamente.

Correzione verificata: V/S esplicitamente indisponibili negano preview e
comando. Probe indipendente per entrambe le risorse, uso Forma e slot:
rifiuto senza variazione di stato o consumo.

## D2 — P2: il clock personale salta i turni del lancio lungo

Stato: chiuso nel recheck.

`recordPersonalFormsTime` può avanzare un'ora mentre il soggetto è nel proprio
turno di iniziativa. `previewFamiliarCompletion` considera sufficiente l'azione
registrata nello stesso turno; il lancio di un'ora termina senza i turni
intermedi o una correzione esplicita della procedura.

Riproduzione dalla medesima fixture:

1. `hero.visibility="private"`, `campaignIds=[]`, iniziativa attiva con
   `order:["hero"]`, `round:1`, `turn:0`.
2. Avviare `startFamiliarCasting` ordinario con slot e incenso. L'unica azione
   diventa spesa.
3. `recordPersonalFormsTime(s,"hero",3600,"Personal time","player",
{operationId:"one-hour"})` passa.
4. Preview completamento con comparsa attestata: `canApply:true`,
   `elapsedSeconds:3600`, ancora `round:1`, `turn:0`, `action:false`.

Atteso: il tempo narrativo personale non deve bypassare il procedimento a
turni; preservare avanzamento per round e Magic action per proprio turno,
oppure richiedere un'esplicita correzione separata. La sola attestazione di
un intervallo personale non è presentata come tale eccezione.

Correzione verificata: il comando personale rifiuta l'avanzamento mentre
l'attore è in iniziativa. Il tentativo rimane integro e incompleto. Dopo
uscita dall'iniziativa, l'attestazione di un'ora funziona e consente il
completamento; nessun blocco permanente è stato introdotto.

## D3 — P2: una caratteristica mentale ignota produce un TS inventato

Stato: chiuso nel recheck.

Il calcolo della forma conserva i valori mentali del soggetto. Tuttavia,
`MOD` restituisce `null` quando il valore manca, e il ramo delle competenze
può sommarlo al PB come se fosse zero.

Riproduzione: eliminare `hero.abilities.wis` e `hero.savingThrows.wis` dalla
fixture e chiedere Forma Selvatica lupo. La preview passa senza errori;
`proposed.abilities.wis` è `undefined`, ma `proposed.savingThrows.wis` è `3`
e `proposed.skillModifiers.perception` è `5`.

Atteso: non inventare il modificatore da dati ignoti. Si può conservare un
valore ignoto e avvisare, o chiedere riconciliazione prima dell'automatismo;
la libertà di registrare una forma manualmente non giustifica un totale
numerico non verificabile. Il confronto con il profilo della bestia deve
restare distinguibile dalla competenza propria che non si può calcolare.

Correzione verificata: preview segnala la caratteristica mentale ignota e
nega il nuovo automatismo; TS/abilità dipendenti restano `null`. Probe esteso
indipendentemente a INT, WIS e CHA mancanti, con comando rifiutato senza
consumo.

## D4 — P2: un override parziale crea PF sopra il massimo senza rilevarlo

Stato: chiuso nel recheck.

Il controllo `manual.hp <= manual.maxHp` confronta solo i due campi presenti
nel patch, mentre il comando fonde il patch con il profilo scelto.

Riproduzione:

```js
const sel = {
  mode: "manual",
  profileId: "srd2024:cat",
  name: "manualcat",
  manual: { hp: 10, reason: "Existing companion" },
};
// previewCompanionCreation: canApply:true, errors:[]
// createCompanion: hp:10, maxHp:2 ereditato dal profilo Gatto.
```

Atteso: validare il risultato fuso, conservando `null` quando il massimo è
esplicitamente ignoto. Se un superamento deve essere un override ammesso,
deve essere deliberato e coerente anche nel caso dei due campi espliciti;
non può dipendere accidentalmente dalla forma del patch.

Correzione verificata: creazione e correzione controllano i PF risultanti
dalla fusione dei dati. Il caso hp10/max implicito2 è rifiutato. Il caso
hp10/maxHp esplicitamente `null` rimane accettato e conserva il massimo
ignoto, senza inventare un valore.

## Evidenza e limiti della verifica

- Letti dominio, API, piano incremento 9 e R193. Riletti localmente gli
  estratti dei PDF SRD 5.2.1 EN immutabili: EN42–43 (Forma Selvatica e
  Compagno Selvatico), EN104–105 (componenti e lancio lungo), EN130
  (Trova Famiglio). Le fonti EN/IT e i rispettivi hash sono in R193/API.
  Nessun prodotto commerciale è stato osservato in runtime da questa review.
- Probe Node indipendenti hanno riusato soltanto la fixture iniziale del test,
  eseguendo le API reali da un modulo in memoria; nessun test è stato scritto
  dal reviewer. I risultati D1–D4 sopra sono osservati, non ipotesi.
- I 25 test preesistenti del dominio sono passati. La lettura durante la
  correzione ha visto anche i due nuovi test D1/D2 deliberatamente rossi
  dell'autore: **25/27** a quel momento. È la fase RED in corso, non un
  attestato finale o un errore occultato.
- Recheck finale indipendente: **29/29** test dominio verdi, seguiti dai
  probe supplementari descritti nelle quattro chiusure. Il source è stato
  riletto nelle parti modificate. Verificate anche le etichette di preview
  `retained`: concentrazione non è dichiarata conservata quando il lancio
  la sostituisce/termina, né slot quando il completamento lo consuma.
- Controllati per lettura/probe: risorsa canonica tramite `featureId`, slot
  livello1/alias, nessuna spesa in preview, retry con ID/input/autorità,
  mantenimento dei PF/consumi al ritorno, tempHP separati, clock personale
  distinto, unicità del famiglio, permessi delle deleghe e parent privato,
  rimozione da scena/iniziativa senza eliminare l'identità.
- Tre profili campione non provano il catalogo completo. Integrazione delle
  statistiche effettive nei comandi esistenti, UI, piazzamento gestuale,
  progressione del clock nel Tavolo e sincronizzazione multiplayer richiedono
  le proprie prove; non sono certificati dalla sola lettura di questo modulo.

## Snapshot delle correzioni verificato

| File                                               | SHA-256                                                            |
| -------------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/forms-companions.mjs`            | `29a25265ff3d0fe7dbbc3bc83fa4fc8d2de5652da84e50ae1df32f5528a0ae1d` |
| `design/blueprint/tests/forms-companions.test.mjs` | `b0ed805628e1e8ae1c2a98f98d287e4a6a04addee3c72eb270a9478e373f8339` |
| `changes/interview-01/blueprint-forms-api.md`      | `238e1d47fc3a5730d0812809b8b8d1598ec4822c8c67c299853b651ed352448f` |

Dopo l’ultimo formatter dell’autore, le parti corrette sono state rilette
e i 29 test rieseguiti con esito verde sugli hash finali sopra.

Chiusura del solo dominio, sulla candidata dirty identificata sopra.
`forms-profile.mjs`, i consumer root e la UI richiedono handoff e verifica
distinti. Non viene dichiarato completo l'incremento 9 da questo rapporto.
