# Configurare un attacco del PNG — incremento 3

23/09/2026. Parte del blueprint locale autorizzato da D-013/I-218; non è il
contratto completo approvato né un motore di produzione. Dati sintetici,
interfaccia EN/IT, nessuna pubblicazione, dipendenza o servizio nuovo.

## Obiettivo e responsabilità

Rendere utilizzabile un attacco in mischia originale configurato dal DM,
senza attribuire incantesimi o statistiche a una creatura dal suo nome.
Il dominio condiviso usa lo stesso profilo per attacco ordinario e opportunità
quando il relativo evento e le regole lo consentono.

Writer `/root/blueprint_encounters`, modello/sforzo ereditati invariati.
Worktree `~/Workspace/Codex/d20-studio-interview-01`, branch `codex/interview-01`.
File riservati: `design/blueprint/preparation.mjs`, `preparation.css`,
`tests/preparation.test.mjs` e questo documento. Stato, regole del combattimento,
richieste e Tavolo appartengono agli altri writer; nessuna modifica ai loro file.

Piano eseguito: concordare il profilo con il writer del combattimento; testare
bozza, validazione e conservazione dei dati correnti; collegare creazione e
modifica; verificare le invarianti e consegnare il percorso al coordinatore
per la prova nel browser e la review distinta.

## Percorso visibile e confini delle operazioni

- **Preparazione → Crea PNG…**: nome, PF, CA e velocità esistenti; sezione
  chiusa **Attacco in mischia (facoltativo)**. Il DM abilita esplicitamente
  l'attacco e inserisce nome, portata in metri, bonus totale per colpire,
  numero e facce del dado danno, modificatore e tipo di danno.
  I campi vuoti non inventano bonus zero. Disabilitati, non impediscono di
  creare una creatura priva di offensiva automatizzata.
- **Crea e posiziona** conserva il nuovo PNG nella bozza; il clic sulla mappa
  colloca la pedina. **Salva preparazione** registra insieme scena e creatura.
  Un errore nei campi dell'attacco non lascia una creatura parzialmente creata.
- **Seleziona una pedina PNG → Configura attacco…** rende modificabile anche
  una creatura esistente, senza duplicarla. **Applica alla bozza** mostra il
  riepilogo con portata, bonus totale e formula dei danni sotto la pedina.
  La finestra spiega che, dopo il salvataggio, la scheda è la stessa in tutte
  le scene. **Annulla** nella finestra non scrive la bozza; **Scarta modifiche**
  scarta anche le modifiche già applicate alla bozza.
- Disabilitare l'attacco prepara la sua rimozione, effettiva solo con **Salva
  preparazione**. La copia di un PNG mantiene il profilo della sorgente ma
  conserva identità, PF e risorse indipendenti secondo il flusso già presente.
- Salvare un profilo cambia soltanto `combatProfile.meleeAttack`: non ripristina
  PF, movimento, azione/reazione o altri campi del profilo. Se lo stesso attacco
  è cambiato nel frattempo, il salvataggio è respinto prima di applicare anche
  le altre modifiche della scena; la bozza resta disponibile.
- Se il PNG è presente nella scena attiva, il salvataggio richiede la conferma
  esplicita già prevista per i cambi in uso, anche quando si sta preparando
  una scena diversa. Offline si può lavorare alla bozza ma il salvataggio
  condiviso è respinto dall'autorità comune. La configurazione è riservata al DM.

Salvataggio, rivelazione, attivazione della scena e avvio dell'incontro restano
operazioni distinte. Configurare un attacco non avvia un combattimento, non
esegue un tiro e non consuma una risorsa.

## Integrazione verificabile

`actor.combatProfile.meleeAttack` contiene nome IT/EN, `reachMeters`,
`attackBonus`, `damageDice: [{count, sides}]`, `damageModifier`, `damageType`
e `source`. Il bonus per colpire è già totale: non si sommano nascosti
caratteristica o competenza. Il dominio espone l'azione `melee-attack`.
Il validator `isValidMeleeProfile` è condiviso con `combat.mjs`; l'editor
aggiunge il limite di 100 caratteri e la scelta fra i tipi di danno mostrati.

Il profilo originale registra `source.kind = authored-demo`, edizione 2024,
revisione UUID nuova per la definizione applicata e titolo originale. Nessun
valore numerico personalizzato è attribuito a SRD o a uno statblock altrui.
L'edizione indica il contesto del blueprint; non trasforma il profilo originale
in una regola ufficiale.

`stageNPCAttack` conserva il valore originario per rilevare conflitti.
`saveSceneDraft` riceve le patch come sesto argomento e le applica dopo tutte
le validazioni; le modifiche live agli altri campi della creatura sono mantenute.
`meleeProfileFromForm` distingue un campo assente/vuoto da uno zero esplicito.

## Provenienza del pattern

Fonti primarie consultate il 23/09/2026. Sono capacità pubblicate; non una prova
runtime nei prodotti concorrenti, né una dimostrazione che siano universalmente
ottimali. Nessun asset o codice dei prodotti è copiato.

| Fonte, versione/data                                                                                                                                | Comportamento pertinente                                                                                                            | Sintesi adottata e differenza                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [Foundry dnd5e — Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities), documentazione aggiornata il 10/09/2026, dichiarata per 6.0.0    | Le attività configurabili appartengono agli oggetti; identità, attivazione ed effetti separano descrizione e comportamento.         | Configurazione esplicita dell'azione con nome e parametri. Qui è un singolo profilo della creatura, non il sistema completo delle Activities. È una capacità del sistema dnd5e, non attribuita indistintamente a Foundry core. |
| [Foundry dnd5e — Activity Type Attack](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Attack), 10/09/2026, 6.0.0                            | L'attacco espone dettagli di attacco e danno; Flat To Hit permette un bonus esplicito senza aggiungere caratteristica e competenza. | Bonus totale del PNG chiaramente dichiarato, portata e formula danni configurabili; input numerici controllati. Il blueprint non replica tutte le classificazioni, condizioni o combinazioni dell'editor Foundry.              |
| [D&D Beyond — Tutorial: How to Homebrew Monsters](https://www.dndbeyond.com/posts/1140-tutorial-how-to-homebrew-monsters-on-d-d-beyond), 04/01/2022 | Creazione di mostri da zero o da modello, statistiche e azioni esplicite, espressioni utilizzabili nei tiri.                        | Creazione originale o copia indipendente e revisione dell'azione. È un precedente storico dell'editor, non fonte delle regole 2024 né verifica dell'attuale interfaccia Beyond.                                                |

L'uso di una sezione facoltativa nella finestra esistente è la sintesi locale
per evitare di imporre un'offensiva a ogni nuova creatura. L'esatto raggruppamento
non è presentato come una copia osservata di una schermata concorrente.

## Verifica eseguita e ancora necessaria

TDD: quattro test iniziali aggiunti e osservati fallire prima dell'implementazione
staging/profilo (24 pass, 4 fail); dopo implementazione 28 pass. Il test aggiunto
sui campi vuoti del form è stato osservato fallire per l'helper mancante (29 pass,
1 fail), quindi corretto con il parsing che non inventa zero.

- `node --test design/blueprint/tests/preparation.test.mjs`: **30/30 pass**.
  Include permessi, numeri/dadi/portata invalidi, bozza e scarto, creazione con
  profilo, rimozione esplicita, preservazione di PF/risorse e campi fratelli,
  conflitto concorrente e campo vuoto distinto da zero.
- `node --test design/blueprint/tests/*.test.mjs`: **90/90 pass** nell'esecuzione
  del 23/09/2026, comprendente il dominio reazioni in lavorazione parallela.
  È una fotografia della candidata condivisa, non una certificazione di tutte
  le funzionalità ancora previste.
- Sintassi di `preparation.mjs` e formattazione dei tre file di codice verificate.
- Prova del nuovo percorso nel browser e review distinta: **ancora da eseguire
  dal coordinatore**; nessuna dichiarazione di prova interattiva o usabilità
  umana deriva dai test del dominio. La prova PASS11 del precedente incremento
  sulle pedine/iniziativa non verifica questi nuovi campi.

Percorso consegnato per la prova: creare PNG senza attacco; crearne uno con
attacco completo e collocarlo con un clic; annullare una modifica; applicarne
un'altra solo alla bozza e scartarla; salvare una revisione e verificarla nel
menu del Tavolo; confermare un tiro fisico/digitale tramite il dominio;
controllare che PF e risorse consumate non si ripristinino. Provare una creatura
esistente, lingua EN, tastiera, viewport stretto e salvataggio offline.

## Lacune dichiarate

Questo editor copre un attacco in mischia originale, un termine di dadi
(da 1 a 20 dadi, d4/d6/d8/d10/d12/d20), modificatori interi e un tipo di danno.
Non è l'editor completo di creature o attività, non gestisce qui multiattacco,
armi multiple, danni composti, azioni leggendarie, incantesimi o regole importate.
Profili non rappresentabili sono conservati e non troncati silenziosamente.
Il singolo nome personalizzato è conservato uguale nelle due lingue; traduzioni
personalizzate distinte restano da esporre nell'editor completo.

La persistenza è locale, i ruoli e la rete sono simulati; questa prova non
stabilisce sincronizzazione distribuita o sicurezza di produzione. I limiti
dell'incremento sono lacune da proseguire, non esclusioni dal prodotto richiesto.

## Raccordo disposizione — correzione della review R1

23/09/2026, writer delegato `blueprint_characters`; riservati soltanto
`preparation.mjs`, `tests/preparation.test.mjs` e questa appendice. Il
coordinatore mantiene browser e file condivisi. Modello/sforzo invariati.

La review ha trovato un'interruzione concreta: il profilo di un PNG nuovo
non aveva una squadra e non esisteva un controllo per renderlo ostile;
quindi il percorso di configurazione non poteva arrivare all'opportunità.

**Crea PNG**, **Duplica PNG** e **Attacco e disposizione…** espongono ora
**Disposizione verso il gruppo**: Alleato (`party`), Neutrale (`neutral`),
Ostile (`watch`), nelle due lingue. I PNG nuovi partono neutrali; la copia
mostra la disposizione della sorgente e può cambiarla indipendentemente.
I PNG campione già dichiarati ostili mantengono il fallback esplicito.
Il testo distingue la disposizione da chi controlla la creatura: non
trasferisce permessi al giocatore e non modifica il proprietario.

Il campo è esterno alla sezione dell'attacco facoltativo: si può dichiarare
la disposizione anche senza un attacco automatico. Il riepilogo della pedina
la mostra sempre, anche quando l'attacco è disabilitato. La disabilitazione
dell'attacco conserva la disposizione.

L'argomento opzionale `team` di `stageNPCAttack` aggiunge alla bozza solo la
disposizione esplicitamente applicata. Il salvataggio conserva gli altri
campi di `combatProfile`, PF, movimento, reazione e slot correnti. Per quel
campo viene conservato `originalTeam`: se una modifica concorrente lo ha
cambiato, l'intero salvataggio è rifiutato prima delle mutazioni. I vecchi
chiamanti che modificano soltanto l'attacco non sovrascrivono una squadra
modificata nel frattempo. Annulla/Scarta conservano lo stesso ciclo di bozza.

Quattro regressioni osservate rosse, poi verdi: default neutrale/validazione;
permessi e salvataggio con risorse consumate; conflitto e copia indipendente;
**creazione di PNG ostile → profilo → Salva → movimento al Tavolo → vera
richiesta di opportunità**. Test Preparazione: **34/34 pass**. Controlli
browser e nuova review distinta rimangono al coordinatore/reviewer.

Controllo integrato dopo il raccordo: **109/109 pass** nella suite completa,
sintassi di Preparazione, formattazione e `git diff --check` validi.

Queste tre disposizioni sono il raccordo dell'incremento corrente, non un
editor completo di fazioni e rapporti individuali. Il dominio ammette soltanto
la relazione ostile esplicita party↔watch; due stringhe diverse non fanno
automaticamente diventare nemico un soggetto neutrale.
