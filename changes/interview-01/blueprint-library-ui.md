# Blueprint — UI Biblioteca e Homebrew

23/09/2026. Autore `blueprint_module_review`, modello e sforzo ereditati.
Worktree `d20-studio-interview-01`. Incremento locale autorizzato dal coordinatore;
non è un attestato di completamento dell'intero blueprint.

## Responsabilità e piano

File riservati: `design/blueprint/library.mjs`, `library.css`,
`tests/library-ui.test.mjs` e questo rapporto. Il dominio `homebrew.mjs` è
di `blueprint_characters`; il coordinatore integra shell, stato, builder,
scheda e Tavolo. Nessuna sessione browser condivisa viene usata dall'autore UI.

1. Concordare le firme uniformi delle bozze e la proiezione dei permessi.
2. Costruire raccolta ricercabile, dettaglio di revisione e bozza privata con
   campi pertinenti, anteprima e distinzione fra manuale e automatizzato.
3. Collegare copia, nuova revisione, condivisione, abilitazione e ritorno alla
   scelta senza confondere questi comandi con l'assegnazione alla scheda.
4. Esporre confronto dell'aggiornamento, consumi e conflitti dal dominio;
   importazione locale in anteprima ed esportazione delle revisioni consentite.
5. Verificare handler reali con controlli ricreati dopo ogni render, privacy,
   errori e ritorno persistente. Review separata e browser sono del coordinatore.

## Contratto di integrazione

Export UI concordati: `renderLibrary(ctx)`, `bindLibrary(root, ctx)`,
`startHomebrew(ctx, options)`, `hasLibraryDraft()`,
`confirmLibraryNavigation(ctx, callback)`, `resetLibraryView()`.
`ctx.chooseLibraryContent(ref, returnTo)` è il comando del consumer.

Route bozza: `library?id=<draftId>&tab=edit`. Route dettaglio:
`library?id=<contentId>&tab=<scope>&revision=<revisionId>`.
Ogni comando usa il riferimento completo `{contentId, revisionId}`;
nessun aggiornamento implicito all'ultima revisione.

## Direzione e fonti

Superficie operativa che estende il prototipo corrente: palette e caratteri
di `styles.css`, elenco leggibile, form con etichette persistenti e anteprima
contestuale. Sotto 720px le colonne diventano una sequenza; nessuna decorazione
o nuova identità visiva. Impeccable e frontend-design applicati nel perimetro
della superficie esistente.

Fonti: [HOMEBREW_FLOW](../../docs/interview/HOMEBREW_FLOW.md),
[Biblioteca](../../docs/interview/pages/library.md),
[ricerca documentale dell'incremento](blueprint-homebrew-research.md).
La separazione template/copia, bozza/revisione e accesso/abilitazione segue
HB-01–12; il confronto rispettoso dei consumi è un contratto dell'app, non
una funzione concorrente verificata. La prosa non genera regole eseguibili.

## Comportamento implementato

La raccolta mostra soltanto le definizioni proiettate dal dominio. Ricerca,
tipo e lingua restano disponibili dopo dettaglio/ritorno e nel sessionStorage
dell'identità demo; il fallback in memoria resta utilizzabile. La raccolta
Campagna apre una revisione effettivamente abilitata, non la revisione più
recente se quest'ultima non è abilitata. La raccolta personale distingue
creazioni proprie da revisioni raccolte; raccogliere non duplica la definizione.

L'editor conserva una copia di lavoro privata e campi incompleti. Un input
modificato disabilita Applica fino a un nuovo riepilogo. Salva bozza/Anteprima
non creano contenuto utilizzabile né modificano una scheda; il salvataggio
revisionato, la duplicazione indipendente e l'applicazione sono distinti.
Nome/descrizione IT e EN, fonte e facoltà dichiarate, campi specifici di magia
e oggetto, riserva, attività manuali e dipendenze hanno controlli reali.

Il dettaglio conserva riferimento esatto e ritorno tipizzato. Un ritorno
`characters` con `instanceId` offre il confronto verso un'altra revisione
della stessa definizione; la revisione già in uso viene riconosciuta.
`ctx.applyLibraryDraft(draftId, reviewKey)` è l'adapter del coordinatore per
applicazioni alla scheda e sincronizzazione atomica dei dati del builder.
Gli altri salvataggi sono commit locali privati. L'UI non modifica direttamente
il modello del personaggio.

Dal builder o dalla scheda, il filtro contestuale iniziale mostra i tipi
compatibili con Capacità, Magie o Inventario/equipaggiamento. Disattivarlo
consente di consultare tutta la Biblioteca; nel dettaglio di un altro tipo
compare il motivo dell'incompatibilità e non un comando di scelta. Il ritorno
senza scelta resta disponibile. Gli handler ricontrollano la destinazione
corrente prima di invocare il consumer o creare una bozza di assegnazione.
Anche l'assegnazione generale conserva nel ritorno la sezione corretta,
senza ricondurre magie e oggetti alla sezione Capacità.

Il confronto espone base applicata, valore corrente e candidato, scelte per
conflitti locali e conservazione esplicita dello storico delle riserve rimosse.
Massimo, usi spesi, disponibili ed eccedenza sono calcolati dalla proposta del
dominio; un consumo sconosciuto rimane tale. Il commit rivalida il riepilogo.

Condivisione, abilitazione, raccolta e assegnazione sono comandi separati.
L'ACL corrente viene mostrata solo se la proiezione concede `canShare`.
Importazione JSON locale: verifica del file, bozza con riepilogo leggibile,
anteprima delle revisioni e applicazione esplicita. Esportazione: file locale
delle revisioni e dipendenze autorizzate dal dominio, senza dati degli attori.

## Verifica del checkpoint

- `node --test design/blueprint/tests/library-ui.test.mjs`: **15/15**.
- `node --test design/blueprint/tests/*.test.mjs`: **234/234** al checkpoint.
- Prettier applicato ai file riservati; `node --check` del modulo passato.
- Detector Impeccable sui due file UI: nessun rilievo (`[]`).

Gli handler dei test operano su controlli ricreati dal markup dopo ogni
render/commit; nessun nodo staccato viene riutilizzato per simulare recuperi
inesistenti. Copertura: bozza e guardia di uscita, escape HTML, privacy anche
con cambio DM, ritorno esatto al consumer, aggiornamento di una sola copia
con usi conservati, riserva rimossa, ricerca/ritorno, duplicazione/revisione,
condivisione distinta da abilitazione, importazione invalida e idempotente,
scelta della revisione abilitata nella raccolta Campagna.
Il followup contestuale verifica i sei ingressi builder/scheda, la
consultazione degli altri tipi, il ritorno senza scelta, la rivalidazione
di un handler quando cambia destinazione e il ritorno dell'assegnazione
generale alla sezione corretta. Le tre regressioni sono state osservate
fallire prima della correzione.

SHA-256 del checkpoint prima di browser/review separati:

| File                        | SHA-256                                                            |
| --------------------------- | ------------------------------------------------------------------ |
| `library.mjs`               | `477110772bef09f36aeb26d2f34d6193261db7fbb60fa30f86ff4dcfd4bd42d8` |
| `library.css`               | `06d74223751c37fcd1be661417cab8cfb938a86c9f10b2aaf3b320b18dec1626` |
| `tests/library-ui.test.mjs` | `ba50cc9e66ee8c075533143e04126a94013641dc4547a5ae47351ddbe65dc2b3` |

Nessun browser usato dall'autore. Layout effettivo, download tramite browser,
touch/tastiera, EN/IT nel runtime e raccordi shell sono verifiche del
coordinatore; questo documento non le anticipa e non vale come review
indipendente.

## Limiti che restano obblighi aperti

Le attività qui descritte sono manuali: non esiste un evaluator di prosa né
un finto comando eseguibile. Il caso della reputazione della gilda richiede
un vero raccordo ai tiri abilità/domande narrative del consumer. Non è
dimostrato dalla sola definizione salvata. Le classi/sottoclassi e gli altri
tipi senza `targetKind` mantengono il proprio nome e sono consultabili;
catalog injection e progressioni strutturate non sono imitate da una voce
nel selettore. La prova isolata di regole/esiti complessi è ancora da collegare.

Pubblicazione/catalogo pubblico, moderazione, revoca completa, ruoli oltre
le identità demo, allegati, formati terzi e sincronizzazione di rete non sono
implementati da questo incremento. Fonte e diritti dichiarati non attestano
una licenza. Queste frontiere non riducono lo scopo dell'app completa.

## Followup della review: importazione e gestione accessi

Checkpoint del 23/09/2026 successivo ai controlli sopra. Correzioni riservate a
`library.mjs` e ai suoi test; il dominio è aggiornato dal suo autore separato.

- Una lettura asincrona del file conserva generazione, identità, route e sessione
  originarie. Un nuovo input, una vista ricreata, il reset o una diversa sessione
  invalidano il completamento precedente prima di commit/navigazione. Anche gli
  errori di una lettura superata sono ignorati: non sostituiscono il nuovo lavoro.
- Il `returnTo` tipizzato entra nella bozza di importazione e rimane nella preview,
  dopo reload e Apply, nei risultati e nella successiva scelta. L'editor espone
  anche il ritorno diretto senza scegliere. Le definizioni importate non vengono
  assegnate automaticamente al consumer.
- `canManageAccess` permette al proprietario di gestire gli accessi esistenti
  anche quando `canShare` è falso. I controlli consentono riduzione e revoca;
  nuovi lettori o promozioni a editor sono disabilitati con una spiegazione.
  Il comando di dominio rivalida i privilegi al salvataggio.
- Il selettore delle revisioni usa data/ora locale EN/IT senza millisecondi;
  un dato mancante ha un'etichetta esplicita e non mostra un ID come nome.

Quattro nuove regressioni degli handler sono fallite prima delle correzioni:
lettura tardiva sopra una bozza sporca, errore tardivo di import superato,
perdita del contesto e gestione della revoca non raggiungibile. Gli handler
ricercano i controlli dopo render; la fixture riproduce la nuova revisione
creata da un editor con diritto di condivisione ristretto. Una quinta verifica
controlla date locali e fallback del selettore.

Verifica finale di questo followup: **20/20 UI** e **54/54** nell'esecuzione
combinata `library-ui.test.mjs`, `homebrew.test.mjs`,
`homebrew-integration.test.mjs`. Prettier applicato; il modulo è importato dalla
suite e il precedente `node --check` era passato. Nessun browser usato
dall'autore; i risultati runtime restano del coordinatore. Il precedente
234/234 descrive il checkpoint storico e non viene esteso a queste modifiche.

| File                        | SHA-256 del followup                                               |
| --------------------------- | ------------------------------------------------------------------ |
| `library.mjs`               | `f13ac7e3fbb8ca037a7e5e457c2abfb7ad7731993270d83e0cd26741d12106c0` |
| `library.css` (invariato)   | `06d74223751c37fcd1be661417cab8cfb938a86c9f10b2aaf3b320b18dec1626` |
| `tests/library-ui.test.mjs` | `075c47a082288b82caf0e43215980f77126d4fb0983681db4d3fcdcb618f6892` |
