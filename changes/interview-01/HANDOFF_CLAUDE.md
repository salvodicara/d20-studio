# Passaggio a Claude — 23 settembre 2026

## Richiesta attuale dell'owner

L'owner passa a Claude per il limite settimanale di Codex. Obiettivo invariato:
blueprint visuale navigabile dell'intero prodotto D&D, con UX definita e
Markdown sincronizzato per gli agenti. Non chiede un altro documento da
approvare né di ricominciare. Lo stile attuale non gli piace: è provvisorio e
**non approvato**, mentre navigazione, collocazione dei controlli, gerarchia e
interazioni devono già essere valutabili seriamente. Non ridurre lo scope.

Non cambiare il modello/sforzo scelti nella nuova sessione. Gli agenti Codex
sono interrotti e avvisati di non riprendere. `get_goal` al passaggio restituisce
`goal:null`: il vecchio Goal non è un'esecuzione attiva trasferibile a Claude.
Usare questo handoff e NEXT come continuità, non attendere task Codex.

## Dove lavorare e cosa leggere

- **Worktree autorevole:** `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
- Branch `codex/interview-01`; HEAD di base `f7ef92dcc32f82765ed9bafe6593cc4f957743e7`.
- Molto lavoro è intenzionalmente **dirty e non tracciato**. È lavoro reale,
  non scarto: niente reset, clean, checkout sostitutivo o ripartenza dal main.
- Main `/Users/salvatoredicara/Workspace/d20-studio` non contiene gli ultimi
  incrementi. Le sue vecchie istruzioni solo Markdown non sono la direzione
  attuale: D-013/I-218 autorizzano il blueprint locale visuale e interattivo.
- Leggere inizialmente AGENTS, docs/NEXT.md, questo handoff,
  docs/interview/BLUEPRINT_CONTRACT.md e BLUEPRINT_STATUS.md. Poi i documenti
  pertinenti al ramo corrente, senza ricaricare tutto il corpus a ogni passo.
- Per la copertura complessiva usare anche REFERENCE_COVERAGE, COVERAGE,
  NAVIGATION_COVERAGE, OPEN e i contratti di percorso in docs/interview.
- Fonti/decisioni sono nel repository; nessuna memoria del modello sostituisce
  il repository. Vecchi guado/design-01 e visualizzazioni isolate sono ritirati.

## Confine dell'obiettivo

Una sola app dimostrativa in `design/blueprint/`, uno stato locale coerente,
dati sintetici, tutti i percorsi e controlli inclusi davvero visitabili.
Simulare quanto basta a rendere verificabile l'interazione; non costruire in
questa fase un backend o un motore esaustivo di produzione. Un nome nel menu,
un controllo finto o un messaggio “previsto” non valgono come funzione coperta.
Il catalogo di esempio e i test passati non provano la completezza dell'app.

Seguire pattern verificati da Foundry, D&D Beyond, BG3, Owlbear, Roll20,
Solasta, Fantasy Grounds, Crucible e gli altri prodotti pertinenti. Conservare
fonte, motivo e adattamento; distinguere documentazione da osservazione reale.
Per le regole prevale la baseline D&D 2024: non copiare una variante BG3/2014
come se fosse SRD2024. Ricercare le lacune, riusare la ricerca valida esistente.
Nessuna nuova domanda per scelte ordinarie già delegate. Una domanda concreta
solo per veri conflitti d'intento, proseguendo sui rami indipendenti.

Italiano con l'owner; codice/commenti inglesi; UI EN/IT. Dadi fisici e digitali,
breakdown, libertà/correzioni, riservatezza e automazione visibile rimangono
vincolanti. Niente chiamate interne, ambienti 3D o reimplementazione di Discord;
musica esterna per ora. Nessun'altra esclusione dedotta. Nessuna modifica a
d20 Folio, deploy, spesa, migrazione o impegno esterno autorizzati dal blueprint.
Il congelamento finale richiede approvazione esplicita dell'owner della visita
visuale e del Markdown corrispondente. Non dichiarare “perfetto” senza prova.

## Ultimo checkpoint verificato: incremento 9

Gli incrementi1–9 sono integrati nella stessa app: campagna, Tavolo, scheda,
inventario, preparazione, combattimento del campione, geometrie/movimento,
builder, Biblioteca/homebrew, narrazione/sessioni, riposi/tempo, forme/compagni.
**461/461 test Node**, cinque nuovi percorsi browser/12 gruppi, core13 e
creazione5/avanzamento3 passati al checkpoint9. Review dominio, profilo, UI,
raccordi e controllo visuale chiusi nei rispettivi perimetri.

`blueprint-increment9-manifest.json` identifica 174 file dello snapshot dirty;
non riscrivere manifest8/9 per includere le modifiche successive. Dettagli in
blueprint-verification.md, FORMS_COMPANIONS_FLOW.md e BLUEPRINT_STATUS.md.
Questo non è il candidato completo, né un commit o un'approvazione finale.

## Incremento 10 in corso: condizioni e sopravvivenza

Ricerca R194 pronta in `blueprint-conditions-research.md`; raccordi in
`blueprint-conditions-seams.md`; piano nella sezione10 di blueprint-build-plan.md;
API accettata tecnicamente in `blueprint-conditions-api.md`; piano UI in
`blueprint-conditions-ui-plan.md`. Questi documenti sono la base di ripresa.

**Stato reale al passaggio:** conditions.mjs e conditions-ui.mjs/CSS NON
esistono ancora. `tests/conditions-ui.test.mjs` è un lavoro parziale lasciato
dall'autore interrotto e cerca i moduli ancora mancanti con import dinamico
e fallback vuoto: i test segnalano API assente. Non interpretare questi
fallimenti attesi come regressione del checkpoint9 o test già passati.
Riprendere/completare quei test e il dominio; verificare lo stato reale su disco.

Decisioni tecniche già concordate:

- actor.conditions contiene solo istanze attive; history/idempotenza in
  conditionEvents, non una seconda coda dadi. Origini multiple restano distinte.
- actor.exhaustion canonico; actor.dead/deathSaves e vitalityPolicy esplicita:
  death-saves/death/disappear/manual. Non dedurre la policy dall'aspetto NPC.
- conditions.mjs NON importa Forms. Root passa effectiveActor corrente dove
  richiesto; forme possono importare gli helper puri delle condizioni.
- Incapacitated/Stunned non azzerano da soli la velocità; Prono usa distanza
  reale per vantaggio/svantaggio. Rialzarsi costa metà velocità, non metà residuo:
  arrotondamento in piedi (1ft=0.3m), quindi9m→4.5m e7.5m→3.6m.
- Incoscienza crea Prono; risvegliarsi non rialza. Fine per singola causa:
  sonno/restId, zeroPF, knockout e altre non vanno appiattite.
- Danno/cura/correzione sono eventi distinti;0PF prima di richieste
  concentrazione irrilevanti. Cure ordinarie non resuscitano. Il knockout2024
  qualificante in mischia produce1PF/incoscienza e proprio riposo breve.
- Morte, Medicina e recupero stabile1d4 ore usano richieste/risultati combat
  esistenti, con facce note persistenti e autorità rivalidata. Nessuna nuova coda.
- Callbacks UI concordate: conditionActor(actorId,state=ctx.state),
  beginConditionRoll({kind:'death-save',actorId}|{kind:'medicine',actorId,targetId,
  aidKind:'stabilize'|'wake-knockout',reviewKey}|{kind:'stable-recovery',actorId})
  → {descriptorId}; openConditionRoll(descriptorId); conditionRolls(actorId)
  → proiezione autorizzata [{descriptorId,kind,status,label?}].
- applyConditionFollowUps(state,result) si chiama nello stesso commit dopo
  il comando dominio, per riposo knockout, richieste e raccordi causali.
  Refresh non apre da solo dialoghi né sostituisce input pendenti.

### Modifiche root successive al checkpoint9 già presenti

1. spatial.mjs: opzione crawling su tracePath/findApproachPath, costo2×normale
   e3×difficile, fonte immutabile. Test spaziali9/9 passati. **Non ancora
   collegata al personaggio Prono**, il dominio manca.
2. state.mjs/combat.mjs: Undo conserva acceptedValues e rollEvidence delle
   richieste; i dadi digitali riusano risultati noti anche se il danno viene
   ricreato. resolveRoll accetta correzione motivata delle facce dopo Undo;
   originale e correzione restano nello storico. Test nuovo combat-evidence.
3. combat-ui.mjs: openRoll ora esportata; dialogo “Riapplica risultato noto”
   con dettaglio per correggere trascrizione e motivo. **Ultima modifica UI
   non ancora provata nel browser né rivista.**
4. tests/state.test.mjs: il precedente caso di sostituzione dopo Undo ora
   passa correctionReason esplicita; la libertà di correggere rimane.

Ultima suite completa prima di questi ultimi fix:465 test,464 passati e1
fallito (vecchio caso di sostituzione senza motivo). Quel caso è corretto:
ultimo gruppo mirato state+combat-evidence **20/20** passato. Non esiste un
nuovo totale completo verde e non va dichiarato. Il test UI incompleto è
arrivato dopo quella suite. Log in directory evidenze, non tutti i risultati
sono un checkpoint accettato. Nessuna review10 ancora chiusa.

**Rischio concreto da testare/correggere subito:** Undo di un batch digitale
attacco+danni conserva la richiesta danno. Correggere poi la faccia attacco
da normale a critico (o viceversa) cambia il numero dei dadi; requestFor oggi
può riassociare le vecchie acceptedValues al nuovo profilo incompatibile.
Preservare la prova precedente, ma distinguere le richieste ricalcolate senza
rilanci impliciti. Scrivere prova reale prima del fix. Verificare inoltre
privacy di rollEvidence, autorità corrente e corretto storico delle correzioni.

### Prossime azioni concrete

1. Riprendere il delta10 presente, chiudere il rischio sui dadi e il suo
   percorso UI; niente ricostruzione del checkpoint9.
2. Completare moduli condizioni/UI secondo API, collegarli a scheda/Tavolo,
   damage/healing, sleep/rest, turni, movimento e coda richieste esistenti.
   Wolf Bite deve applicare Prono eligible: oggi è ancora dichiarato manuale.
3. Test pertinenti, browser sui percorsi reali e review distinta del delta;
   aggiornare contratto/copertura e creare checkpoint10 solo quando verificato.
4. Continuare sugli altri rami aperti delle matrici di copertura. Una funzione
   non completata resta obbligo, non diventa esclusione o semplice etichetta.

## Ambiente e strumenti

Server ultimo noto: http://127.0.0.1:8879/, directory design/blueprint,
exec95807. Verificarne la raggiungibilità prima di riavviare. Comando:
`python3 -m http.server 8879 --bind 127.0.0.1 --directory design/blueprint`.
Browser Playwright precedente: d20-blueprint. Gli handle Codex non sono
necessariamente accessibili a Claude: riusare il server, avviare una propria
sessione browser se necessario. Nessun backend reale in ascolto richiesto.

Evidenze fisiche: `/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23`.
CLI playwright cwd nella directory evidenze, mai nel checkout per screenshot.
Script browser in changes/interview-01/blueprint-checks; README elenca i casi.
Suite: `node --test design/blueprint/tests/*.test.mjs`.
Prettier già presente in `/Users/salvatoredicara/Workspace/d20-studio/node_modules/prettier/bin/prettier.cjs`.
Nessun bisogno di installare tool. Browser condiviso mai in parallelo.

Task Observer: `/Users/salvatoredicara/Workspace/Codex/agent-state/d20-studio/skill-observations/log.md`;
ultima osservazione30, non duplicarla. Skill pertinenti conservate.

## Efficienza richiesta nel passaggio

L'owner segnala consumo eccessivo di token. Preservare ambizione e qualità
riducendo lavoro ridondante: letture mirate, ricerca riusata quando valida,
deleghe indipendenti bounded, review dei delta, test proporzionati alle
modifiche. Non continuare a perfezionare all'infinito una meccanica del campione
mentre intere aree UX mancano. Alternare copertura e approfondimento, registrare
i punti da riprendere. Nessun nuovo giro di interviste/conferme ovvie.

Aggiornamenti brevi e visuali su risultati concreti; l'owner non deve leggere
questo file. Il prossimo risultato va mostrato dentro l'unica app.
