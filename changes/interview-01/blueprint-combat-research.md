# Verifica normativa per il prossimo incremento di combattimento

23/09/2026. Ricerca circoscritta per gli autori del blueprint, non prova di
implementazione, completezza del combattimento o runtime dei concorrenti.
Nessuna modifica al contratto generale o ai file degli altri autori.

## Fonti normative e revisione

Fonte `srd`, edizione `2024`, revisione immutabile `5.2.1`. Riaperti i PDF
ufficiali online; letti i passaggi nelle copie locali già acquisite e
ricalcolati i rispettivi SHA-256, identici a R165 e SPELLCASTING_FLOW.
I numeri indicano le pagine stampate, coincidenti con la numerazione PDF.

- [SRD EN 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf):
  `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`.
- [SRD IT 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf):
  `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718`.

Le copie di evidenza sono sotto
`/Users/salvatoredicara/Workspace/Codex/d20-studio-experience-evidence/`.
Le sintesi seguenti sono parafrasi; non viene duplicato il testo integrale.

This work includes material from the System Reference Document 5.2.1
(“SRD 5.2.1”) by Wizards of the Coast LLC, available at
<https://www.dndbeyond.com/srd>. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
<https://creativecommons.org/licenses/by/4.0/legalcode>.

## Vincoli da conservare nel codice dimostrativo

| Capacità                        | Regola verificata                                                                                                                                                                                                                                                 | Conseguenza per l'incremento                                                                                                                                                                                                                                                                                          | Pagine EN / IT                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Bastone ferrato / Quarterstaff  | Arma semplice da mischia, 1d6 contundenti; Versatile cambia il dado a 1d8 quando usato a due mani in mischia. Attacco ordinario con Forza; bonus di competenza solo se competente. Il danno aggiunge lo stesso modificatore di caratteristica, non la competenza. | Esporre una/due mani come scelta pertinente; non usare Destrezza solo perché più alta, né dedurre competenza da un nome di classe modificabile. Rovesciamento/Topple richiede il privilegio che sblocca la padronanza: non segue dal solo possesso del bastone.                                                       | 7, 16, 90–91 / 8, 18, 102–103   |
| Dardo di fuoco / Fire Bolt      | Trucchetto, azione, V/S, 120 piedi / 36 m. Attacco a distanza con incantesimo contro creatura oppure oggetto; 1d10 fuoco. A livello del personaggio 5/11/17 diventa 2/3/4d10. Nessun modificatore ordinario ai danni.                                             | Non consumare slot; usare bonus attacco da incantatore + competenza. Non applicare un TS. Gli oggetti infiammabili non indossati/trasportati colpiti prendono fuoco; un esempio limitato alle creature non deve dichiarare coperto questo ramo.                                                                       | 132; formula attacco 106 / 140  |
| Mani brucianti / Burning Hands  | 1° livello, azione, V/S, origine dall'incantatore; cono 15 piedi / 4,5 m. Ogni creatura nell'area effettua TS Destrezza: 3d6 fuoco se fallisce, metà per difetto se riesce. +1d6 per ogni livello dello slot sopra il primo.                                      | Un unico danno comune per il lancio; risultati dei TS distinti, anche per gli alleati inclusi. Aumentare lo slot non allarga il cono. Oggetti infiammabili non indossati/trasportati nell'area iniziano a bruciare.                                                                                                   | 114; danni 16 / 163; danni 18   |
| Dardo incantato / Magic Missile | 1° livello, azione, V/S, 120 piedi / 36 m. Tre dardi, ciascuno 1d4+1 forza, contro creature visibili. Si possono assegnare a una sola creatura oppure a più creature; colpiscono simultaneamente. Ogni livello superiore dello slot aggiunge un dardo.            | Nessun attacco, TS o critico. Conservare assegnazione e risultato di ogni dardo; non deduplicare i bersagli né applicare tutto il totale a ciascuno. Vedere la distinzione sui dadi sotto. Scudo resta un'eccezione specifica, non una regola di CA.                                                                  | 146; Scudo 161 / 140; Scudo 186 |
| Attacchi, 1/20 e critici        | Il totale del tiro per colpire deve raggiungere la CA. Il naturale 1 manca e il naturale 20 colpisce con critico. Il critico raddoppia i dadi di danno dell'attacco, non i modificatori fissi.                                                                    | Bastone: 2d6+Forza o 2d8+Forza; Fire Bolt al livello 3: 2d10. Non raddoppiare il totale già tirato. Non trasferire 1/20 automatici ai TS ordinari: il loro totale si confronta con la CD.                                                                                                                             | 7, 16 / 8, 18                   |
| Scatto / Dash                   | L'azione aggiunge movimento pari alla velocità attuale, dopo i modificatori, per il turno corrente. Può utilizzare la velocità speciale scelta se pertinente.                                                                                                     | Con velocità 9 m e residuo 3 m, Scatto porta il residuo a 12 m: non a 6 o 18. Non cambia la velocità base e non concede spostamento immediato. Il beneficio termina con il turno.                                                                                                                                     | 180 / 214                       |
| Disimpegno / Disengage          | L'azione impedisce che il proprio movimento provochi attacchi di opportunità per il resto del turno corrente.                                                                                                                                                     | Stato con scadenza di fine turno, non difesa generale e non immunità a tutte le reazioni. Se le reazioni non sono ancora risolte nel motore, il limite deve restare dichiarato.                                                                                                                                       | 181 / 207                       |
| Schivata / Dodge                | Fino all'inizio del proprio turno successivo, gli attacchi contro la creatura hanno svantaggio se essa vede l'attaccante; i suoi TS Destrezza hanno vantaggio. I benefici si perdono se incapacitata o con velocità 0.                                            | Non farla scadere alla fine del turno corrente. Velocità 0 e movimento residuo 0 sono diversi. Non subordinare il vantaggio ai TS Destrezza alla visibilità dell'attaccante. Visibilità e incapacità devono essere dati dichiarati dello scenario, non inferenze arbitrarie.                                          | 181 / 215                       |
| Turni e reazioni                | Nel proprio turno si dispone ordinariamente di movimento fino alla velocità e di un'azione; una capacità specifica autorizza l'azione bonus. Dopo l'uso, la reazione torna all'inizio del proprio turno successivo.                                               | Non recuperare la reazione di tutte le creature al cambio round o all'avvio dell'incontro. Tiro iniziativa, avvio, inizio turno e fine turno sono eventi distinti. L'assenza di una risoluzione non autorizza a saltarla.                                                                                             | 10, 13 / 11, 15                 |
| Uno slot per turno              | Nel medesimo turno un incantatore può spendere un solo slot per lanciare un incantesimo. Non è il divieto universale di lanciare due magie né il limite di uno slot per round.                                                                                    | Tracciare per incantatore e turno effettivo. Uno slot speso nel proprio turno può impedire un secondo lancio con slot come reazione nello stesso turno; una reazione in un altro turno è distinta. Trucchetti e lanci senza slot non consumano questo limite. Non usare un contatore unico per tutti gli incantatori. | 105 / 119                       |

Ulteriori condizioni già pertinenti: un attacco a distanza con incantesimo
come Fire Bolt ha svantaggio se l'incantatore si trova entro 5 piedi / 1,5 m
da un nemico che lo vede e non è incapacitato (EN p.15). Vantaggio e svantaggio
si annullano reciprocamente, senza sommare il numero di fonti (EN pp.7–8).
La CD e il bonus di attacco dipendono dalla capacità da incantatore realmente
registrata; non sono valori universali del nome della magia (EN p.106).

## Dardo incantato: separare testo certo e convenzione dei dadi

La regola del danno comune in SRD 5.2.1 EN p.16 / IT p.18 riguarda un effetto
che costringe simultaneamente almeno due bersagli a effettuare **tiri salvezza**.
Questo giustifica Mani brucianti, ma non Dardo incantato, che non impone TS.
Non trasferire automaticamente al 2024 il ragionamento storico «simultaneo,
quindi un unico d4 per tutti». La simultaneità dei dardi non è in dubbio.

**Lettura implementativa raccomandata:** un d4 distinto per ciascun dardo,
più 1 ciascuno; distribuzione dei dardi prima di vedere i danni e applicazione
simultanea. Conservare i singoli contributi anche quando la UI mostra il totale
per bersaglio. Questa è una lettura esplicita della formula per dardo e della
regola generale 2024, non un chiarimento editoriale separato sul numero di tiri.
La ricerca circoscritta non ha reperito tale chiarimento primario; discussioni
dei forum e vecchi pareri sul 2014 non sono assunti come autorità normativa.

Il testo non consente di colpire prima con un dardo, osservare i PF residui e
riassegnare gli altri come se fossero attacchi successivi. Se il DM adotta una
convenzione diversa sui dadi, la correzione conserva provenienza e log: non
diventa silenziosamente la baseline. Aggregare i PF non risolve da solo casi
ulteriori come concentrazione, danni a 0 PF o effetti per istanza, che richiedono
verifica specifica e non vengono attestati da questa ricerca.

## Interazioni: precedenti e adattamenti già registrati

- [Foundry dnd5e Activities](https://github.com/foundryvtt/dnd5e/wiki/Activities),
  [Save](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Save) e
  [Use/Utility](https://github.com/foundryvtt/dnd5e/wiki/Activity-Type-Utility)
  riaperte il 23/09/2026: intestazione 6.0.0, modifica 10/09/2026; wiki senza
  SHA fissato. Sono documentazione del sistema **dnd5e**, non del core Foundry.
  Attivazione, consumo, bersagli/area ed effetti sono distinti; Save separa
  caratteristica/CD e danni; Use ammette attività senza tiro obbligatorio.
  «Damage on Save» è presentato come testo informativo: non prova applicazione
  automatica dei danni a tutte le creature. Nessun runtime verificato.
- Riuso della ricerca primaria già salvata in
  [TABLE_ACTIONS](../../docs/interview/TABLE_ACTIONS.md),
  [SPELLCASTING_FLOW](../../docs/interview/SPELLCASTING_FLOW.md) e
  [audit BG3](../../docs/interview/reference-audits/bg3-solasta.md), senza
  dichiarare nuovamente provata la build corrente: Larian
  [CU11, 02/12/2020](https://baldursgate3.game/news/community-update-11-inspiration-freedom-pacifism_17)
  documenta varianti raccolte sotto l'icona; [Patch 1, 25/08/2023](https://baldursgate3.game/news/patch-1-now-live_87)
  documenta correzioni delle preview di area; [Patch 3, 22/09/2023](https://baldursgate3.game/news/patch-3-mac-support-magic-mirror-more_93)
  distingue l'avviso di concentrazione pertinente dalla consultazione durante
  l'avanzamento. Sono precedenti d'interazione storici, non regole 2024.

La scelta della mossa e la preview non spendono risorse; I-016 conserva il
clic diretto per l'attacco singolo, mentre l'area si prepara e poi si lancia.
Un dato fisico mancante non è uno zero né un successo. Lancio, richieste di TS,
danno e applicazione/correzione restano eventi distinguibili, senza doppio
consumo quando arrivano risposte successive. Questi raccordi derivano dalle
decisioni locali già acquisite, non sono attribuiti integralmente ai concorrenti.

## Casi attesi da trasformare in prove

1. Bastone a una/due mani cambia d6/d8; competenza modifica solo l'attacco.
   Critico con Forza +2 dà 2d6+2 oppure 2d8+2.
2. Fire Bolt al livello 3 usa 1d10; al 5 usa 2d10. Nat20 al livello 5 usa
   4d10; il trucchetto non consuma uno slot.
3. Mani brucianti: danno comune 11, CD14; TS10 riceve 11 danni, TS16 ne
   riceve 5. Il secondo TS non ritira il danno né spende un altro slot.
4. Dardo incantato: d4 naturali 1/2/4 producono 2/3/5. Assegnando i primi
   due ad A e il terzo a B, i contributi sono A5/B5; un solo lancio e slot.
5. Scatto da velocità9/residuo3 dà residuo12 e velocità9. Disimpegno termina
   a fine turno; Schivata resta fino all'inizio del successivo turno proprio.
6. Schivata perde efficacia con velocità0, non con solo residuo0; influisce
   su un TS Destrezza anche senza la condizione di vedere l'attaccante.
7. Una reazione consumata da B resta consumata mentre inizia il turno di A.
   Un secondo slot di A nello stesso turno è bloccato; un nuovo turno altrui
   può consentire una reazione con slot se innesco e reazione sono disponibili.
8. Preview, cambio impugnatura proposto, annullamento e input fisico invalido
   non cambiano PF o risorse. Dopo il lancio, l'attesa dei TS non è un nuovo
   lancio e una correzione non cancella eventi estranei.

Questi sono risultati attesi, **non test eseguiti**. Geometria completa, coperture,
oggetti incendiati, sensi, reazioni concatenate, eccezioni di capacità,
concentrazione e conseguenze a 0 PF conservano i rispettivi contratti e lacune.
Non sono tagli al Goal né capacità dimostrate da questo incremento.
