# Incremento 5 — review indipendente dei raccordi shell/scheda

23/09/2026. Reviewer `blueprint_module_review`, modello/effort ereditati.
Worktree autorevole `d20-studio-interview-01`, dirty tree.

## Ambito e indipendenza

Review delle modifiche incrementali di root a `characters.mjs`,
`character-access.mjs`, `app.mjs`, `state.mjs` e dei raccordi nuovi in
`combat.mjs`, `combat-ui.mjs`, `reaction-ui.mjs`, `preparation.mjs`.
Per Preparazione la verifica riguarda i nuovi vincoli di accesso e appartenenza
alla campagna, non attesta una review indipendente del precedente editor
spaziale scritto da questo stesso agente.

Non è una review indipendente di `character-builder.mjs/css`, che appartengono
a questo autore. Il dominio di costruzione/catalogo ha review distinta.
Nessun browser utilizzato; nessuna modifica ai file applicativi esaminati.
Su richiesta esplicita del coordinatore è stata aggiornata soltanto la fixture
del test UI di avanzamento: quando il riepilogo espone la conferma dei dati da
verificare, il test lega e attiva il vero handler della checkbox prima di
applicare. Non sono stati rimossi controlli del dominio o della UI.

## Esito

**Nessun P1/P2 aperto nei raccordi esaminati allo snapshot sottostante.**
Due P2 funzionali riprodotti durante la review sono stati corretti da root e
riverificati. È stato corretto anche il problema di distinguibilità delle
concessioni omonime. Questo esito non dichiara completa l'applicazione o la
copertura CRE/ADV e non sostituisce le prove browser del coordinatore.

## Rilievi e verifica delle correzioni

### P2-S1 — Storia del builder assente dalla scheda — risolto

Prima della correzione `renderStory` ed `editText` usavano soltanto
`actor.notes`, mentre la creazione salvava i campi in `actor.description` e
`actor.backstory`. Una creazione con aspetto/storia compilati apriva una scheda
che mostrava «Una pagina ancora da scrivere» e un editor vuoto.

Riproduzione SSR iniziale: `hasBackstory:false`, `hasAppearance:false`,
`emptyStory:true`. Ora renderer ed editor distinguono aspetto, storia e
annotazioni condivise. Recheck SSR positivo su tutti e tre i campi, compreso
escaping; submit dell'editor conserva e modifica ciascun campo separatamente,
senza cancellare le annotazioni live. Le modifiche del dominio che riconciliano
storia della bozza e storia live restano alla sua review separata.

### P2-S2 — Una preparazione cancellava l'altra concessione — risolto

Con `Shield` preparato sia da classe sia da Iniziato alla Magia, togliere la
preparazione soltanto a un record eseguiva `Set.delete(combatActionId)` e
rimuoveva l'azione anche quando l'altra concessione restava preparata.
Riproduzione tramite il vero handler `prepare-spell`:
`stillPrepared:true`, `profileSpells:[]`.

`recordPreparation` ricostruisce ora le azioni esplicitamente rappresentate
dalle magie, mantenendo le altre voci del profilo e includendo tutte le
concessioni ancora preparate compatibili con la caratteristica di lancio del
profilo. La regressione in `character-integration.test.mjs` passa. Recheck
aggiuntivo: una concessione preparata con Saggezza non acquista impropriamente
l'automazione di un profilo con Intelligenza.

### Distinguibilità delle concessioni e provenienza — risolto

Le due righe omonime mostravano prima soltanto nome, livello e preparazione;
il dettaglio mostrava la pubblicazione SRD senza indicare la concessione.
L'utente non poteva identificare quale preparazione stesse modificando.

Ora `spellGrantDetails` espone classe/background/specie e caratteristica di
lancio sia nelle righe sia nei dettagli. Recheck SSR: `Class: Wizard`,
`Background: Magic Initiate`, `Intelligence` e `Wisdom` presenti e distinguibili.
La gestione delle capacità espone inoltre concessione e `sourceDetails`.

## Altri confini verificati

- Una scheda personale privata non è leggibile o controllabile dal DM soltanto
  in quanto DM. Collegarla alla campagna è un comando esplicito con riepilogo
  di lettura/controllo; il comando non posiziona token o inserisce in iniziativa.
- Preparazione filtra e ricontrolla accesso/appartenenza sia nella lista sia nei
  comandi di salvataggio e posizionamento. Un ID personale noto non basta.
- La scheda e il combattimento leggono `spellSlots[level]` come dato canonico,
  con alias legacy soltanto di ripiego. Correzioni di livello 1 riallineano
  l'alias; consumi superiori al nuovo massimo rimangono visibili. `used:null`
  non diventa zero o disponibilità piena e il comando di lancio viene bloccato
  con un motivo correggibile.
- Capacità/slot con contatori ignoti sono distinti dai valori zero. Un punteggio
  ignoto non produce un modificatore inventato: la scheda rende `—` e il
  comando prova rifiuta prima di aprire il tiro.
- Il ledger di dadi del builder aggiunge prove private immutable; Undo conserva
  le facce accettate, marca gli annullamenti e ripristina lo stato operativo.
  La serializzazione conserva il risultato annullato. Il registro condiviso
  filtra le operazioni private per identità.
- Lettura dei guard `navigate`, `hashchange`, cambio identità e `beforeunload`:
  uscire da una bozza sporca passa dalla conferma; la route viene ripristinata
  prima della decisione. La navigazione interna alla stessa bozza conserva la
  copia di lavoro. Le gesture Back/mobile sono provate dal coordinatore,
  non da questa review statica.

## Evidenza eseguita

**117/117** test passati nella suite mirata dei file di root:

```text
node --test design/blueprint/tests/character-integration.test.mjs \
  design/blueprint/tests/character-reactions.test.mjs \
  design/blueprint/tests/state.test.mjs \
  design/blueprint/tests/characters.test.mjs \
  design/blueprint/tests/preparation.test.mjs \
  design/blueprint/tests/combat.test.mjs \
  design/blueprint/tests/combat-ui.test.mjs \
  design/blueprint/tests/reactions.test.mjs
```

Riproduzioni SSR/handler aggiuntive eseguite senza browser per storia e
concessioni duplicate, descritte sopra. Dopo l'adeguamento della sola fixture
autorizzata, i **16/16** test del builder sono nuovamente verdi; questo dato
non viene contato come review indipendente del builder.

## Snapshot SHA-256

| File | SHA-256 |
| --- | --- |
| `design/blueprint/characters.mjs` | `b8cf6a90764915add109ab8a2933550dd4d8e6d489469b776e3b6af96992926f` |
| `design/blueprint/character-access.mjs` | `070fb85f35dfe9040500f53804e1cacef6a4375a84b37690b51dd4ae715f5a9a` |
| `design/blueprint/app.mjs` | `663f750e517218681802a3fdcb8256dd992ff9ea9343eca56a31fe4a54c1594f` |
| `design/blueprint/state.mjs` | `1f9f3152da9f5a685d197fc95ea7f48f193b6f95a1052705b849471329ee8a0b` |
| `design/blueprint/combat.mjs` | `ac8c16d9116e57500572843bdd2c941c3e4073dfcdfb024879613897f050038d` |
| `design/blueprint/combat-ui.mjs` | `dcb8a1c2a96638e37aef433b67a994a97fd5a5df85178b32b581c6cd0b36a29b` |
| `design/blueprint/reaction-ui.mjs` | `bee34a0aa477d6cd406dd683ca4cfef20226c51c32cdabbf80c44c045155dcac` |
| `design/blueprint/preparation.mjs` | `1325e681f4763f16a694782a7c2be51f8810b6eeaf14b48f1bd48804cb211293` |
| `design/blueprint/tests/character-integration.test.mjs` | `2b0f23fbf0efbfc341ba95a7ae19393d7c3c029d31b5d0ada0c6a5bba966f3b8` |

Fixture UI modificata su richiesta del coordinatore, fuori dall'attestazione di
indipendenza: `tests/character-builder-ui.test.mjs`, SHA-256
`270198dadc58b90c646c462ef5b8b183dff0171614b555697017d73c8e96e849`.
