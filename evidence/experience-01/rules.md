# Regole, revisioni e limiti

> D-012, 12/09/2026: documento storico conservato. Fonti e ricerca restano utili; le proposte
> relative al guado non sono un piano da eseguire né risposte confermate all'intervista. Le mappe
> e i casi derivati sono ritirati. Seguire docs/NEXT.md e la nuova intervista completa di prodotto.

Verifica documentale: **12/09/2026**, baseline regole 2024 tramite **SRD 5.2.1**.
La [pagina ufficiale](https://www.dndbeyond.com/srd), aggiornata 02/03/2026, collega
[EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf)
(pubblicato 01/05/2025) e
[IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf)
(pubblicato 08/12/2025). Entrambi scaricati e confrontati nei passaggi indicati;
non letti integralmente. Nessuna regola del videogioco viene usata come fonte normativa.

## Copie fissate

| ID fonte | Kind, edizione, revisione immutabile SHA-256 del PDF                                   | Pagine |
| -------- | -------------------------------------------------------------------------------------- | ------ |
| SRD-EN   | `srd`, 2024, 5.2.1, `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` | 364    |
| SRD-IT   | `srd`, 2024, 5.2.1, `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` | 405    |

Un URL versionato non basta: al recupero si verifica il digest. Copie di verifica conservate
localmente in `~/Workspace/Codex/d20-studio-experience-evidence`, non dipendenza runtime né
contenuto da trasferire al client. Se il digest cambia, si conserva la versione precedente e si
rivedono i casi; non si aggiorna una regola in un incontro già registrato. Il prototipo dovrà
fissare fonte, ID regola, lingua e revisione anche per i testi. Pagine sotto: numerazione stampata
(coincide con l'indice PDF a partire da 1). I confini di Scudo, Prepararsi e ripristino coincidono nei passaggi confrontati.
È rilevata una discrepanza editoriale: IT p. 208, sotto «Incapacitato», introduce gli effetti
con la parola «paralizzato». Il titolo, gli effetti e EN p. 184 identificano Incapacitated:
R12 segue questa identità, senza estendere arbitrariamente il significato di Paralizzato.
La stringa italiana non va importata ciecamente; questa disposizione tecnica è esplicita e
non una nuova house rule. Nessuna certificazione dell’intera traduzione.

## Mappa delle regole esercitate

| ID  | Regola e comportamento atteso                                                                                                                                                                                                                                          | Fonte EN / IT                                                                                                                                                                                             | Esempi              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| R01 | D20 + modificatore + competenza quando pertinente; attacco raggiunge CA per colpire. 1 naturale manca e 20 naturale colpisce criticamente per un attacco, non successo/fallimento universale di ogni prova.                                                            | SRD-EN pp. 6–8; SRD-IT sezione Prove con d20 pp. 7–9                                                                                                                                                      | C01, C02            |
| R02 | Iniziativa e turno: movimento fino alla velocità e un'azione; azione bonus solo se una capacità la permette. La Schivata dura fino all'inizio del prossimo turno e ha condizioni proprie.                                                                              | EN pp. 9–10, 13–14; IT pp. 10–11, 15–16                                                                                                                                                                   | Sequenza 2–6, C03   |
| R03 | Sottrarre danni dai PF; critico raddoppia i dadi, non il modificatore. Tramortire con attacco in mischia porta a 1 PF e Privo di sensi, invece di 0; nessun generico «eliminato».                                                                                      | EN pp. 16–18; IT sezione Danni e guarigione pp. 18–20                                                                                                                                                     | C02, C09            |
| R04 | Reazione disponibile fino all'uso; dopo l'uso torna all'inizio del prossimo turno della creatura. Normalmente dopo il trigger, salvo descrizione specifica. Offerta e rinuncia non sono un uso.                                                                        | EN p. 10 e glossario Reaction; IT p. 11, p. 212 Reazione                                                                                                                                                  | C04–C07             |
| R05 | Scudo: quando colpiti da tiro per colpire o bersagliati da Dardo Incantato; +5 CA anche contro l'attacco innescante, fino all'inizio del proprio prossimo turno; nessun danno da Dardo Incantato. Componenti V/S. Uno slot di livello 1 e reazione nel caso ordinario. | EN pp. 161–162 Shield; IT p. 186 Scudo; lancio EN pp. 104–106 / IT pp. 118–120                                                                                                                            | C04, C05, C07       |
| R06 | Prepararsi: azione nel proprio turno, circostanza percettibile, azione scelta oppure movimento fino alla velocità. Reazione subito dopo che il trigger termina, oppure lo si ignora. Disponibile prima dell'inizio del proprio prossimo turno.                         | EN pp. 186–187 Ready; IT p. 211 Prepararsi                                                                                                                                                                | C06, C07            |
| R07 | Incantesimo preparato: tempo di lancio un'azione, risorse spese nel prepararlo, energia mantenuta con concentrazione fino all'inizio del prossimo turno; perderla disperde l'incantesimo senza effetto. Non rimborsare lo slot per trigger ignorato o mancato.         | EN pp. 186–187; IT p. 211; concentrazione EN p. 179 / IT p. 206                                                                                                                                           | C07                 |
| R08 | Opportunità: creatura visibile che lascia la portata, un attacco in mischia con arma o colpo senz'armi, **prima** che esca. Disimpegno, teletrasporto e movimento senza proprio movimento/azione/bonus/reazione non la provocano.                                      | EN p. 15; IT p. 17                                                                                                                                                                                        | C06                 |
| R09 | Lancia a una mano 1d6, pugnale 1d4 con accuratezza; competenza e modificatori delle fixture. Armatura, scudo e Difesa compongono la CA di Aldo.                                                                                                                        | EN pp. 89–93; IT pp. 99, 103–106, tabelle Armi/Armature                                                                                                                                                   | C01, schede         |
| R10 | Bandit/Bandito: CA12, PF11, DES+1, scimitarra +3 e 1d6+1.                                                                                                                                                                                                              | EN p. 261; IT p. 297                                                                                                                                                                                      | Sequenza, C04       |
| R11 | Snapshot PG: serie standard, background e competenza; guerriero1, mago1, umano e talenti indicati. Capacità fuori traccia sono inventariate, non dichiarate già automatizzate.                                                                                         | EN Creazione personaggio pp. 19–25, Fighter pp. 47–48, Wizard pp. 77–78, Sage/Soldier p. 83, Human p. 86, talenti pp. 87–89; IT sezioni omonime, Guerriero pp. 53–54, Sapiente/Soldato p. 93, Umano p. 97 | Schede precompilate |
| R12 | Incapacitato impedisce azioni, azioni bonus e reazioni e interrompe concentrazione. Danni durante concentrazione richiedono il TS previsto, CD maggiore fra 10 e metà danni (arrotondata per difetto), massimo 30.                                                     | EN p. 184 Incapacitated e p. 179 Concentration; IT p. 208 Incapacitato e p. 206 Concentrazione                                                                                                            | C07, C09            |
| R13 | Un solo slot speso per lanciare incantesimi in ciascun turno; Scudo nel turno avversario è distinto dal proprio turno. Non importare la vecchia formulazione dell'incantesimo con azione bonus.                                                                        | EN p. 105; IT p. 118                                                                                                                                                                                      | C07                 |

Esempi in `acceptance.md` (ritirato); traccia in `scenario.md` (ritirato).
Le formule non sostituiscono i testi completi: prerequisiti, componenti, gittate e condizioni
si verificano prima dell'applicazione. Una capacità non coperta va esplicitamente gestita dal DM
con fonte e risultato registrati; l'implementazione progressiva non cambia il default di automazione
completa del prodotto. Non dichiarare supportata tutta la scheda per aver provato due attacchi.

## Fonti originali e private

Le decisioni originali E-001–E-003 sono in `scenario.md` (ritirato), revisione e01-v1; il loro
contenuto diventa immutabile con il commit candidato approvato, che i consumatori devono fissare
esplicitamente. Sono decisioni autoriali per la prova, non nuovi ordini del proprietario e non SRD.
Nessuna house rule meccanica è introdotta. Nomi, testo della scena, medaglione e politica di
correzione citano quelle decisioni. Una futura regola originale avrà `kind=original`, decisione,
revisione fissata e casi; una estensione privata `kind=private-extension`, revisione e autorizzazione
nella sede privata. Nessuna credenziale, scheda reale o testo commerciale è incluso qui.

## Attribuzione del materiale SRD

Quest'opera include materiale tratto dal System Reference Document 5.2.1 ("SRD 5.2.1") di Wizards
of the Coast LLC, disponibile all'indirizzo https://www.dndbeyond.com/srd. Il SRD 5.2.1 è concesso
in licenza ai sensi della licenza di attribuzione 4.0 Internazionale di Creative Commons,
disponibile all'indirizzo https://creativecommons.org/licenses/by/4.0/legalcode.

Il materiale è riassunto e adattato in esempi sintetici; scena e politiche del prodotto sono
originali. Non sono riprodotti asset di D&D Beyond o BG3.
