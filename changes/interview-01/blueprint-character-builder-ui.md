# Creazione e avanzamento — UI incremento 5

23/09/2026. Autore UI `blueprint_module_review`, modello/effort ereditati.
Worktree `d20-studio-interview-01`; nessuna modifica a file di altri autori.
Root possiede shell, ingressi dalla scheda, CSS globale e browser; il dominio
e il catalogo appartengono a `blueprint_characters`. Review finale distinta.

## Obiettivo e piano

Percorso guidato e navigabile direttamente per creazione, ricostruzione,
avanzamento e revisione. Una bozza privata e incompleta rimane distinta dalla
scheda applicata. Nome e storia sono facoltativi, fonti/manualità esplicite.

1. Allineare schema/API con dominio; usare CRE/ADV e la ricerca separata.
2. Costruire sezioni, stato e motivi, metodi di caratteristiche e scelte con
   origine; salvare/riprendere bozze e proteggere le modifiche non salvate.
3. Collegare revisione, correzioni contestuali e applicazione idempotente alla
   scheda corrente, senza riscrivere risorse live dalla copia iniziale.
4. Test UI mirati e consegna dei percorsi al browser/reviewer del coordinatore.

File di proprietà: `character-builder.mjs`, `character-builder.css`,
`tests/character-builder-ui.test.mjs` e questo documento. Stato: candidato UI
consegnato per browser e review indipendente; non attestazione di completamento
del contratto intero.

## Comportamento implementato

- Undici sezioni dirette con stato e motivo del dominio; nome e storia
  facoltativi. La prima classe è un controllo vuoto, senza scelta automatica.
  Classi multiple mantengono l'ordine dei livelli. Il comando «Aggiorna scelte e
  PF» rende esplicito il ricalcolo dopo avere digitato i livelli.
- Bozze di creazione, ricostruzione, avanzamento e revisione. La copia dei campi
  non modifica la scheda; Salva o il cambio sezione salva anche dati incompleti.
  Il guard offre salva/resta/scarta solo le modifiche non salvate. Bozze chiuse,
  scartate o non più accessibili azzerano la sessione e non legano comandi.
- Fonti aggregate per pubblicazione/revisione; dettagli della singola voce
  mantengono pagine e URL. Abilitare una fonte non dichiara approvazione della
  campagna. Una scheda nuova resta privata e non viene inserita nella campagna,
  sulla mappa o in iniziativa.
- Serie standard, point buy con contatore, sei gruppi 4d6, valori manuali e
  totali sostitutivi motivati. I comandi dadi chiamano le API del dominio una
  volta; la navigazione non tira. I risultati accettati restano nello storico.
  Richieste fisiche pendenti riappaiono anche nel riepilogo se è stato cambiato
  metodo. Risultati annullati sono distinti e non offerti come valore attuale.
- Scelte di specie, aumenti del background, competenze della classe iniziale,
  lingue, strumenti, concessioni di capacità/talenti e aumenti ASI. Selezioni di
  talenti conservano `grantId`; deroga requisiti separata dalle quantità.
- Magie conosciute, preparate e limiti per fonte distinti. Le magie manuali
  dichiarate possono essere selezionate sotto la concessione appropriata. La
  ricostruzione richiede consumi espliciti di slot ordinari, Patto e Dadi Vita.
- Equipaggiamento manuale o alternative di monete effettivamente presenti nel
  catalogo. Nessun pacchetto inventato o equipaggiamento automatico. Ricostruire
  registra i beni posseduti; avanzare conserva quelli live.
- Il riepilogo collega gli errori alla sezione, espone gli avvisi e richiede un
  consenso esplicito per schede con aspetti da verificare. L'applicazione usa
  `reviewKey` e `operationId` del dominio. Nuove schede e personaggi personali
  applicano con `{local:true, visibility:'private'}`, anche offline. Schede
  collegate alla campagna usano il commit condiviso. Nessun riposo implicito.
- EN/IT; navigazione mobile orizzontale con la terza voce parzialmente visibile,
  titoli e stato compatti. Gli errori restano nel contenuto della sezione. La
  selezione mobile viene portata in vista. Focus e scroll sul titolo avvengono
  soltanto per la transizione di sezione, non per ogni checkbox.

## API di integrazione

Il modulo esporta `startCharacterBuilder`, `renderCharacterBuilder`,
`bindCharacterBuilder`, `hasCharacterBuilderDraft`,
`confirmCharacterBuilderNavigation`, `resetCharacterBuilderView`.
La route è `builder` con `view.id` della bozza e `view.tab` della sezione.
La creazione della bozza e i suoi salvataggi hanno commit privato locale;
l'applicazione torna a `characters`, `id: actorId`, `tab: actions`.
Root integra ingressi, navigation/hash/back/role/beforeunload e storage.

## Verifiche dell'autore

- `node --test design/blueprint/tests/character-builder-ui.test.mjs`: **16/16**.
  Test dei veri handler con dominio reale: isolamento della copia, riapertura,
  escaping, permessi, route scartata, prima classe, dadi fisici mancanti e
  accettati, nessun reroll da navigazione, grant di talento, magia manuale,
  consumi ricostruiti, fonte unica, pending fuori metodo e reversed, focus,
  commit privato offline e avanzamento privato/condiviso con PF spesi.
- Suite mirata con `tests/character-build.test.mjs`: **31/31** al checkpoint
  finale (16 UI + 15 dominio).
- `node --check design/blueprint/character-builder.mjs`: passato.
- Prettier applicato ai tre file di codice/test di proprietà.
- Impeccable `detect.mjs` sui due file UI: exit 0, nessun rilievo.
- Browser condiviso non usato da questo autore. Il coordinatore sta verificando
  i percorsi reali desktop/mobile EN/IT e conserva screenshot e prove separate;
  i test handler non vengono presentati come prove di gesture o layout.

## Limiti espliciti

Il catalogo disponibile e le automazioni appartengono al dominio e alla sua
evidenza. Non tutte le magie o capacità sono a catalogo; gli inserimenti manuali
non producono automaticamente regole di combattimento. Non sono stati aggiunti
pacchetti equipaggiamento o contenuti privati non forniti. Sincronizzazione remota,
collaborazione reale multiutente e feedback di giocatori esterni non sono provati
da questo incremento locale. La copertura CRE/ADV completa resta nel lavoro
complessivo, non viene dedotta dai sedici test UI.

## Snapshot del candidato per review

Dirty tree, hash SHA-256 dei soli file di proprietà:

| File | SHA-256 |
| --- | --- |
| `design/blueprint/character-builder.mjs` | `e8fbcd022bffedea85ff50279e1159295b80f6c67ae13141c72de411d7ebdcfc` |
| `design/blueprint/character-builder.css` | `714c2a95963c77edce425989d3b4bcc2570f03f648f49ede6257ae0418099266` |
| `design/blueprint/tests/character-builder-ui.test.mjs` | `87c8dc1388b2e0f72b969f03d0a07e2d6692c87e19fa16c85986294e5ee583e3` |
