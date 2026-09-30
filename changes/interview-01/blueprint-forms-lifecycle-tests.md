# Forme — regressioni dei raccordi reali

23/09/2026. Autore `/root/review_journey`, modello/sforzo ereditati, worktree
`/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Proprietà di questo sottocompito: solo
`design/blueprint/tests/forms-lifecycle-integration.test.mjs` e questo rapporto.
Nessun cambiamento alle implementazioni root/UI per far passare queste prove.
La correzione parallela autorizzata F1/F2 di `forms-profile.mjs` ha review distinta
in [blueprint-forms-profile-review.md](blueprint-forms-profile-review.md).

## Prove eseguite

**6/6 passate**, usando `createStore`, comandi Forme/Riposi, persistenza JSON,
`placeSceneToken`, `beginHealing` e il vero handler `bindTable`:

1. Lungo di gruppo con Doran e Mira: completare solo Doran mantiene il Compagno
   Selvatico di Mira e i due usi spesi. Completare Mira fa scadere soltanto il
   suo compagno, rimuove la rappresentazione e recupera lo stesso feature
   canonico. Undo ripristina insieme il compagno e il saldo senza azzerare il
   tempo trascorso; retry dopo reload non ripete il recupero.
2. Breve di Mira: i due usi spesi diventano uno nello stesso pool; il Compagno
   Selvatico rimane disponibile.
3. Livia personale avvia Trova Famiglio in iniziativa. Un salto narrativo di
   un'ora viene rifiutato atomicamente. Il vero comando Fine turno passa prima
   al goblin senza avanzare il tempo, poi al round successivo aggiungendo sei
   secondi al clock personale originario e a quello della campagna. Retry dello
   stesso evento dopo reload non aggiunge altri sei secondi; nessuno slot o
   materiale è anticipatamente consumato.
4. Compagno attivo ultimo nell'ordine: archiviazione tramite comando e hook
   reale dello store avanzano dal round 5 al 6 e iniziano il turno di Mira una
   sola volta. Movimento torna a 12 metri della forma di lupo, azioni/reazione
   si ripristinano, l'effetto che scade all'inizio termina e il tempo cresce di
   sei secondi. Una successiva spesa resta spesa: il marker non viene riapplicato.
5. Pozione fusa: `beginHealing` rifiuta senza consumare quantità né creare tiro
   pendente; dopo il ritorno normale la stessa pozione torna utilizzabile.
6. Pozione lasciata a terra: il rifiuto continua dopo il ritorno normale e non
   ricolloca automaticamente l'oggetto nell'inventario attivo.

Le aspettative numeriche sono letterali e derivate dal contratto, non calcolate
dal medesimo helper sottoposto a prova. Queste sono regressioni aggiunte a
comportamenti già implementati: sono passate alla prima esecuzione; non vengono
presentate come nuovi cicli TDD rosso→verde. Una rimozione del raccordo lungo,
del recupero canonico, dell'avanzamento al wrap, del reset effettivo o delle
guardie sull'equipaggiamento farebbe fallire le rispettive asserzioni.

## Suite completa e limiti

Comando eseguito: `node --test design/blueprint/tests/*.test.mjs`.
Snapshot corrente: **459 test, 456 passati, 3 falliti** in `library-ui.test.mjs`:

- `an instance return opens an update for its exact copy and preserves spent uses`:
  conteggio capacità 2 anziché 1, riga 222.
- `removing a resource has a reachable explicit history resolution`:
  `resourceHistory.favour` assente sulla prima capacità, riga 241.
- `sharing access, enabling a revision and collecting remain separate commands`:
  conteggio capacità 1 anziché 0, riga 399.

Segnalati al root. I tre casi sembrano usare la precedente assunzione che
`Livia.features` fosse vuoto, mentre il seed ora contiene Adepto dei rituali.
Questo rapporto non dichiara la suite globale verde e non modifica quei test.
Prettier sul nuovo test passato; controllo whitespace del perimetro passato.

Per il binding Fine turno sono forniti soltanto adattatori minimi delle
primitive DOM (`querySelector`, SVG, media query, osservatore e listener).
L'algoritmo del turno, il clock, le autorizzazioni, i comandi e lo store non
sono mock. Questa prova non attesta impaginazione, puntamento o comportamento
del browser reale: tali prove restano al root. Le fixture sono sintetiche;
nessun account, multiplayer reale o dato privato è coinvolto.

## Snapshot dei file esercitati

Hash del contenuto dirty letto/eseguito, **non SHA di un candidate commit**.
Altri autori continuano l'integrazione; cambiamenti successivi richiedono
nuova verifica nel manifest del root.

| File                                         | SHA-256                                                            |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `tests/forms-lifecycle-integration.test.mjs` | `b87b365b322c54d0c341d7ae9902377372ca7502dae6800885bb42647c645d14` |
| `forms-companions.mjs`                       | `5a8c21a84b6f2e2afc6e8a4ec3b2cfda1cb7d92407c88962fdcac04ffae89586` |
| `forms-profile.mjs`                          | `e1116cadef3fc352b173a920991f634eb61f6e0110d94e6970ad17e45af76c1a` |
| `state.mjs`                                  | `5e649e720d804caf540f3ed025c37bc95a3b77c8ceff4b30af941ffc72f1909c` |
| `rest-time.mjs`                              | `95cca248a9307d44fc2287fd453904e6bd2a7c94994c0596660f26e72d263ac8` |
| `table.mjs`                                  | `d456bdd0e66062fb44da795d25b0bfbbc7bdbbd92709e59e89dfe7859231af3d` |
| `combat.mjs`                                 | `9ceceec36a4b92aa68230c0f1ef352d7cd6c98159e24e16b21912db1b7ead034` |
| `characters.mjs`                             | `7c6106a986323105aa5e9d5200a59a03126a29a744810f24b2d3e84532a8858c` |
| `preparation.mjs`                            | `b52d10250e370959c5116e3036f2dde9b62693f6e04f8ad885d00fa20a527322` |
