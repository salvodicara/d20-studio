# Review indipendente UI spaziale — incremento 4

23/09/2026. Reviewer `/root/blueprint_encounters`, modello e sforzo ereditati.
Worktree esaminato: `~/Workspace/Codex/d20-studio-interview-01`.
Review in sola lettura del codice: il reviewer scrive soltanto questo report.
Nessun browser condiviso usato, nessuna modifica ai file degli altri writer.

**Esito finale: nessun P1/P2 aperto nei sei file UI esaminati, alla fotografia
identificata sotto.** Quattro P2 individuati sono stati corretti dai writer e
ricontrollati. È un giudizio sull'incremento, non l'approvazione del contratto
completo né una prova di tutte le funzioni previste.

## Rilievi risolti

| Priorità | Problema riprodotto                                                                                                                                                                                                                                                                                                                                         | Correzione e ricontrollo                                                                                                                                                                                                                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| P2       | Un attacco fisico diretto già a portata poteva diventare un avvicinamento non mostrato se il bersaglio si spostava mentre era aperto **Ho lanciato i dadi**. Prima: Livia x100, bersaglio x140; il bersaglio diventava x300 prima del submit e Livia veniva spostata a x250.25, pagando 4.5075 m e ricevendo un'altra richiesta di lancio.                  | Il payload fisico diretto conserva `allowApproach: false`; `beginAttempt` rifiuta il nuovo ramo prima di mutare posizione, movimento o azione. Harness delle callback UI rieseguito: errore `approach-not-authorized`, JSON dello stato identico, zero commit completati. Test di dominio aggiunto dal writer.                                               |
| P2       | La chiave della mossa preparata era soltanto ruolo/personaggio. Dopo aver copiato i punti del percorso in A e attivato B, la selezione continuava a usare i punti di A, mentre il checkbox spariva perché il percorso di B era vuoto. Un bersaglio adiacente poteva risultare irraggiungibile senza un controllo visibile per togliere il percorso vecchio. | La chiave di `combat-ui.mjs` include ora scena attiva, come `path-ui.mjs`. Harness: in B nessuna preview di A, nessun percorso ereditato; tornando in A resta la sua bozza distinta; cambiando ruolo non viene letta la bozza DM.                                                                                                                            |
| P2       | **Regola e calcolo** attribuiva anche il profilo PNG originale a `SRD <UUID>` e generava `href="#"` come falsa fonte.                                                                                                                                                                                                                                       | `renderActionSource` distingue SRD da contenuto originale e rende il link solo con URL HTTPS. Regression test `authored NPC actions do not inherit an SRD attribution or a fake source link` passato dal reviewer.                                                                                                                                           |
| P2       | Escape era gestito soltanto dall'SVG: dopo scelta dalla barra, o con focus nei controlli del percorso, non annullava la mossa anche se il comando mostrava **Esc · Annulla preparazione**.                                                                                                                                                                  | Listener del Tavolo sul documento con controllo del contenitore connesso, dialogo/input e evento già gestito; rimozione del listener al reset/nuovo binding. Codice ricontrollato. Il coordinatore ha confermato nel browser mobile azione → Escape senza focalizzare la mappa; questa prova browser è riferita dal coordinatore, non eseguita dal reviewer. |

La prima ipotesi comunicata sul blocco `stale-geometry` dopo annullamento di un
attacco fisico **diretto** non era una riproduzione valida: in quel ramo la chiave
precedente era assente. Non è conteggiata fra i bug confermati. Il writer ha
comunque separato la copia accettata dalla bozza viva: una chiave usata da un
commit fallito non blocca le successive valutazioni della bozza. Ora la copia
accettata riceve la chiave geometrica attuale anche nel caso diretto.

## Controlli e confini

Lettura completa di `table.mjs`, `path-ui.mjs`, `table-spatial.mjs`,
`combat-ui.mjs`, `reaction-ui.mjs`; lettura mirata del CSS e delle API in
`combat.mjs`, `spatial.mjs`, `state.mjs`, `preparation.mjs`, `app.mjs`.
Sono state considerate cancellazione e modifica dei punti, isolamento
ruolo/scena, geometria cambiata, attacco dopo avvicinamento, autorità sulle
porte, risorse, segreti, eventi tastiera/puntatore e controlli touch.

- Eseguiti `node --test` su `combat-ui.test.mjs`, `doors.test.mjs`,
  `spatial-combat.test.mjs`, `table.test.mjs`: **23/23 pass** nell'ultima
  esecuzione del reviewer. Include stale geometry/ostacoli segreti, porte
  inaccessibili e risorse, richieste fisiche differite, interruzioni e
  proiezioni per ruolo.
- Harness Node delle callback UI reali, con DOM minimo sostituito, riproduceva
  i due errori di stato sopra e verifica ora le correzioni. Non simula layout,
  focus del browser, tocco reale o il comportamento completo del DOM.
- Verifica mirata del primo turno di un nuovo incontro: la prima interazione
  con una porta costa `interaction`, `objectInteractionUsed` viene azzerato
  per la creatura che inizia. Nessun difetto residuo rilevato su questo punto.
- Verifica della checkbox per percorso con attacco PNG a portata 3 m:
  l'attuale controllo dipende da `attackType === melee`, non dal limite 1.5 m.
- Il coordinatore riferisce suite complessiva **144 pass** e prove browser
  proprie. Non sostituiscono la fotografia e le verifiche specifiche qui
  eseguite. Il suo percorso touch sui waypoint era ancora in verifica alla
  chiusura di questo report.

Non sono emersi altri P1/P2 dimostrati. Limiti già dichiarati come coperture
parziali, ingombro delle creature e diagonali su griglia non sono presentati
come funzionalità completate da questa review. Nessuna pretesa di validazione
di multiplayer, sicurezza o accessibilità completa deriva da un modello locale.

## Harness di regressione del tiro fisico differito

Eseguibile dalla radice del worktree con Node ESM. Il cambio di posizione nel
modello rappresenta esplicitamente l'aggiornamento avvenuto durante il dialogo;
non è presentato come un'azione browser né come prova multiplayer.

```js
import assert from "node:assert/strict";
import { createInitialState } from "./design/blueprint/state.mjs";
import { bindCombatUI, handleCombatMap, resetCombatUI } from "./design/blueprint/combat-ui.mjs";

const state = createInitialState();
state.combat.active = true;
state.scenes[0].gridSnap = false;
state.scenes[0].tokens = [
  { actorId: "livia", x: 100, y: 100 },
  { actorId: "goblin-1", x: 140, y: 100 },
];
let dialog,
  commits = 0;
const empty = { querySelectorAll: () => [], querySelector: () => null };
globalThis.document = {
  querySelector: (selector) => (selector === "#dialog" ? empty : null),
  querySelectorAll: () => [],
};
const button = { dataset: { combatAction: "quarterstaff" } };
const mode = { addEventListener: (_, fn) => (mode.change = fn) };
const root = {
  ...empty,
  querySelectorAll: (selector) => (selector === "[data-combat-action]" ? [button] : []),
  querySelector: (selector) => (selector === "[data-combat-mode]" ? mode : null),
};
const ctx = {
  state,
  role: "player",
  t: (it, en) => en,
  esc: String,
  label: (value) => (typeof value === "object" ? value.en : value),
  canControl: (actor) => actor.owner === "player",
  render() {},
  toast() {},
  dialog: (title, body, options) => (dialog = { title, options }),
  commit: (title, mutate) => {
    mutate(state);
    commits++;
  },
};
resetCombatUI();
bindCombatUI(root, ctx, "livia");
button.onclick();
mode.change({ target: { value: "physical" } });
handleCombatMap(ctx, "livia", "click", { x: 140, y: 100 }, "goblin-1");
assert.equal(commits, 0);
assert.equal(dialog.title, "Physical roll");
state.scenes[0].tokens[1].x = 300;
const before = JSON.stringify(state);
assert.throws(
  () => dialog.options.onSubmit(),
  (error) => error.code === "approach-not-authorized",
);
assert.equal(JSON.stringify(state), before);
assert.equal(commits, 0);
```

## Identità della fotografia esaminata

Il checkout è dirty. `HEAD` è `f7ef92dcc32f82765ed9bafe6593cc4f957743e7`,
**solo base del checkout, non SHA della candidata non committata**. Non si
attesta una revisione che non esiste. SHA-256 dei file letti dopo le correzioni:

| File sotto `design/blueprint/` | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `table.mjs`                    | `60143852c7c95cffcd0b9fe2ed31bf9beee856c4e4c45fef672a9bef320b4007` |
| `path-ui.mjs`                  | `25ed082537920aadf0f09b6d7da7d3d567fd26905156fd4d4fba1033d355f15c` |
| `table-spatial.mjs`            | `d44e95d3af7a12a76abe35d50646715fb4e713e4d0390f2803ca029e2112a1bc` |
| `combat-ui.mjs`                | `dcb8a1c2a96638e37aef433b67a994a97fd5a5df85178b32b581c6cd0b36a29b` |
| `reaction-ui.mjs`              | `0bd8387b4d6ed34fc3aebb6ed5ad6a3417d37f5180cd656ef8cefd7a904e616c` |
| `styles.css`                   | `228cfa92d4dd090fc2508abb4f4494c2616e9d5103d451bfdfe53072a0dd1765` |

API di dominio consultate, non sostitutive della loro review separata:

| File sotto `design/blueprint/` | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| `combat.mjs`                   | `0ff6325d7f276dee344562e14330d88478feb3823883f61443db0dce9c82c7a6` |
| `spatial.mjs`                  | `6ef9c613b6de585ce1ef8132935497b34d07e635fb500d4e6bf78c4eba818e95` |

Un cambiamento successivo a questi file richiede di controllare il delta;
questo report non approva automaticamente le versioni future.
