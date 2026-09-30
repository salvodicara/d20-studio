# Censimento delle capacità — sintesi del mercato per il blueprint

**Direzione prevalente D-013/I-218, 23/09/2026:** l'owner valuta un unico
[blueprint visuale navigabile](BLUEPRINT_CONTRACT.md) completo; il Markdown
rimane sincronizzato per gli agenti, senza lettura obbligatoria dell'owner.
Questo documento non è un'approvazione, un ordine di rilascio o una prova di
parità: è la mappa di lavoro che collega ogni capacità pertinente trovata sul
mercato al suo stato nell'app e agli incrementi che la renderanno visitabile.

23/09/2026. Sintesi dei sette censimenti di capacità in
[market-census](../../changes/interview-01/market-census/). Estende
[REFERENCE_COVERAGE](REFERENCE_COVERAGE.md) (famiglie e GAP), non sostituisce
[COVERAGE](COVERAGE.md) (voci F interne), [NAVIGATION_COVERAGE](NAVIGATION_COVERAGE.md)
(ingressi) né [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md) (prove degli incrementi).

## a) Metodo, fonti e limiti

**Fonti sintetizzate (1477 righe sorgente, tutte con accesso 23/09/2026):**

| File                                                                                    | Righe | Prodotti e livelli                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------------------------------------------------------- | ----: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [foundry.md](../../changes/interview-01/market-census/foundry.md)                       |   208 | Foundry core V14 (14.359/14.368), sistema dnd5e 6.0.x, moduli di terze parti sempre distinti dal core (FVT-nnn)                                                                                                                                                                                                                     |
| [dndbeyond.md](../../changes/interview-01/market-census/dndbeyond.md)                   |   218 | D&D Beyond web/app, Maps, Encounters legacy, homebrew, marketplace; Avrae, Beyond20, ddb-importer (DDB-nnn)                                                                                                                                                                                                                         |
| [roll20-fgu.md](../../changes/interview-01/market-census/roll20-fgu.md)                 |   214 | Roll20 core, scheda D&D 2024, Mod, Dungeon Scrawl; Fantasy Grounds VTT, ruleset 5E, Forge (R20-nnn)                                                                                                                                                                                                                                 |
| [vtt-light.md](../../changes/interview-01/market-census/vtt-light.md)                   |   244 | Owlbear Rodeo 2 e 101 estensioni lette, Alchemy, Shard, Quest Portal, Let's Role, AboveVTT, Beyond20, Improved Initiative, TaleSpire, Tabletop Simulator, Tableplop, The Forge (VTL-nnn)                                                                                                                                            |
| [crpg.md](../../changes/interview-01/market-census/crpg.md)                             |   167 | Baldur's Gate 3 Patch 8, Solasta I e Dungeon Maker, Solasta II EA, Pathfinder Kingmaker/WotR, DOS2 GM Mode, NWN EE, XCOM 2, Into the Breach, Pillars II, Rogue Trader, CK3 (CRP-nnn)                                                                                                                                                |
| [campaign-tools.md](../../changes/interview-01/market-census/campaign-tools.md)         |   246 | World Anvil, Kanka, LegendKeeper, Scabard, Obsidian e plugin, Notion, Campfire, Chartopia, donjon, 5e.tools, Tetra-cube, Watabou, Azgaar, Fantasy Calendar, Kobold+ Fight Club, AideDD, Improved Initiative, Shieldmaiden, DiceCloud, Fight Club/Game Master 5e, Encounter+, Demiplane, Arkenforge, mappe, metodo Lazy DM (CMP-nnn) |
| [community-services.md](../../changes/interview-01/market-census/community-services.md) |   180 | LFG Roll20/DDB/Kanka, StartPlaying, Warhorn, Sesh, when2meet, Rallly, Discord, Avrae, Archivist, Saga20, LoreKeeper, Craig, strumenti di sicurezza, SRD 5.2.1, accessibilità (AFB), localizzazione (SVC-nnn)                                                                                                                        |

Gli audit per famiglie già registrati — [Foundry](reference-audits/foundry.md) (30),
[Beyond](reference-audits/beyond.md) (25), [BG3/Solasta](reference-audits/bg3-solasta.md)
(18+3) — e le ricerche R001–R194 in [RESEARCH](RESEARCH.md) restano validi con
le proprie date: i censimenti li estendono al livello di singolo comando.

**Che cosa è pubblicato e che cosa è osservato.** Quasi tutte le righe sono
capacità **pubblicate**: documentazione ufficiale, note di rilascio, pagine
store o marketing (dichiarazioni dell'autore). **Osservati** soltanto: la
scheda pubblica d'esempio di D&D Beyond in sola lettura, il codice sorgente
pubblico di Improved Initiative, Kobold+ Fight Club, Tetra-cube e Beyond20, la
pagina pubblica di Tableplop. Nessun account, acquisto, installazione, sessione
runtime dei concorrenti o playtest umano. Le opinioni della community sono
solo segnali di domanda. Le funzioni annunciate non sono contate come
disponibili. Accessi bloccati e sostituiti da estratti di ricerca: docs
Owlbear (Cloudflare), World Anvil e Scabard (403), 5e.tools (403: solo
changelog storico 2018–2020), wiki Fandom di DOS2/NWN (402), forum Solasta.

**Come è stata fatta la sintesi.** Una riga per capacità vista dall'utente,
deduplicata fra prodotti. Il "miglior pattern" è l'implementazione più
completa e meglio documentata; quando contrasta con la baseline 2024 o con una
decisione registrata la riga dice quale parte si copia (solo l'interazione) e
rinvia ai conflitti della sezione c. Nessuna regola di videogioco entra nella
baseline: ogni regola eseguibile va verificata su SRD 5.2.1 EN/IT con fonte e
revisione prima del contratto.

**Stato della candidata (sincronizzato il 30/09/2026 per la versione del 01/10/2026).** La
colonna «Stato» dà per ogni riga un solo stato, preso dall'ultimo controllo nell'app in esecuzione
che ne ha dato l'esito, e nomina il file di prova. La catena, dal più vecchio al più recente:

| File di prova (link nella colonna)                                            | Controllo                                                                                                         | Data     |
| ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| `audit/<area>` (14 file, per esempio [audit/home-creation][ev-home-creation]) | audit per area da utente alla prima visita, clic e tasti veri                                                     | 25–26/09 |
| [audit/reaudit][ev-reaudit]                                                   | re-audit dopo i pacchetti P1–P10                                                                                  | 27/09    |
| [audit/reaudit3-a][ev-reaudit3-a], [-b][ev-reaudit3-b], [-c][ev-reaudit3-c]   | re-audit 3 dopo i pacchetti R1–R8 e le consegne                                                                   | 29/09    |
| [final-review-completeness][ev-final-review]                                  | revisione finale di completezza (93 capacità in ogni area)                                                        | 30/09    |
| [final-fixes][ev-final-fixes]                                                 | correzioni finali: test rosso → verde e sonda nel browser del correttore, senza revisione indipendente successiva | 30/09    |

Valori:

- **PROVEN · file** — funziona nell'app, nel posto della colonna «Dove si trova», secondo quel
  controllo. «solo test Node» (13 righe): il re-audit l'ha data per buona su un test, senza
  guidarla nel browser. «simulazione» (15 righe): funziona con un servizio, un dispositivo o un
  contenuto simulato e dichiarato come tale ([I-233][i-233]: assistente, integrazioni, tavoli
  pubblici, catalogo pubblico dell'homebrew, dadi connessi, pacchetti di compatibilità); la
  decisione per il prodotto reale resta in [NEXT](../NEXT.md).
- **PARTIAL · motivo · file** — funziona in parte; il motivo dice che cosa manca.
- **OPEN-DECISION · riferimento · motivo** — manca o è ridotta perché aspetta una scelta
  dell'owner (domanda in [OPEN](OPEN.md), GAP o requisito legale). Non è una lacuna di costruzione.
- **EXCLUDED · decisione · che cosa** — esclusa dall'owner ([I-233][i-233] riepiloga le esclusioni).
  Non è una lacuna.

La colonna «Dove si trova» riporta il percorso come lo ha scritto il controllo (alcune righe in
inglese, come nei file d'audit). Per le 148 righe che non funzionavano al primo audit e sono state
corrette dopo, riporta la nota del controllo più recente (per le 13 «solo test Node», la correzione
descritta dal rapporto del pacchetto), non più il percorso fallito del primo audit. Dopo le
correzioni finali sono verdi la suite Node (2628/2628) e 70 percorsi del browser delle aree
toccate; l'ultima regressione di **tutti** i percorsi (188/188) è del 30/09, prima delle
correzioni finali ([BLUEPRINT_STATUS](BLUEPRINT_STATUS.md)).

**Legenda storica dello stato (23/09/2026, prima della costruzione del blueprint):**

- **PROVEN Inc.N** — il blueprint integrato offre comando e risultato visitabili,
  con prova browser registrata in [BLUEPRINT_STATUS](BLUEPRINT_STATUS.md) per
  quell'incremento. Quando è provata solo una parte, la riga è divisa: la parte
  provata e il resto hanno righe distinte.
- **CONTRACT (doc)** — definita nel Markdown (flusso, pagina, voce F, decisione)
  ma non ancora visitabile. `Inc.10 in corso` indica condizioni e sopravvivenza:
  dominio e API esistono, percorso UI non ancora verificato.
- **MISSING** — né provata né definita oltre al nome della famiglia. Deriva dai
  PARTIAL/NEW dei censimenti, controllati per parola chiave e contro gli
  incrementi, non da una rilettura integrale di ogni pagina.
- **EXCLUDED** — esclusa da una decisione owner registrata (F-017 chiamate,
  F-030 musica interna, ambienti 3D, meccaniche commerciali). Non è una lacuna.

Un menu, un'etichetta o un pulsante inerte non valgono PROVEN. Il numero di
righe non è una percentuale di completamento: le righe hanno granularità
diversa e alcune capacità di mercato sono varianti dello stesso compito.

## b) Elenco principale deduplicato

Colonne: identificativo di lavoro · capacità · miglior pattern (prodotto, dove e
come) · ID dei censimenti · stato della candidata con il file di prova · dove si trova nel
blueprint. Gli identificativi IN/PG/CA/PR/TV/BI/SV/X
sono nuovi e servono al backlog (sezione d); non sostituiscono F, NAV o GAP.

### Inizio

| ID    | Capacità                                                                | Miglior pattern di riferimento                                                                                     | ID censimento                      | Stato                                                 | Dove si trova (blueprint, 30/09)                                                                 |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| IN-01 | Ripresa rapida di personaggio e campagna con "Entra al Tavolo"          | DDB intestazione scheda con campagna e avvio; Foundry join page con titolo e sfondo                                | FVT-002, DDB-025, R20-001, CMP-01  | PROVEN · [audit/home-creation][ev-home-creation]      | Home › «Entra al Tavolo»                                                                         |
| IN-02 | Stato vuoto senza campagna: schede e note restano raggiungibili         | DDB stati vuoti con azione; Owlbear dock aperto solo se vuoto                                                      | DDB-008, VTL-009, CMP-243          | PROVEN · [audit/home-creation][ev-home-creation]      | Campaign › Gestione › Esci dalla campagna                                                        |
| IN-03 | Elenco di più campagne attive/archiviate, ultimo accesso, tag e filtri  | Roll20 My Games: ricerca per tag, Launch, avatar, ultimo gioco, badge DM; DDB attive/inattive                      | R20-001, DDB-071, FVT-003, CMP-03  | PROVEN · [final-review-completeness][ev-final-review] | Home › «Tutte le campagne»                                                                       |
| IN-04 | Prossima sessione con conto alla rovescia nell'ora locale               | Foundry join page con data; Roll20 "Next Game" convertito nel fuso del visitatore                                  | FVT-002, R20-049, SVC-047          | PROVEN · [audit/home-creation][ev-home-creation]      | Home › «Apri sessioni» › «Data già concordata» › «Salva bozza e aggiorna anteprima» › «Conferma» |
| IN-05 | Inviti in arrivo con Accetta/Rifiuta                                    | Quest Portal campanella con mittente e campagna                                                                    | VTL-007, SVC-013                   | PROVEN · [audit/home-creation][ev-home-creation]      | Set up by leaving the campaign and having the DM use «Invita una persona dell’app»               |
| IN-06 | Lavoro incompleto (bozze builder, homebrew, note) con "Riprendi"        | DDB bozza creata all'ingresso; Roll20 Charactermancer riprendibile                                                 | DDB-011, DDB-217, R20-036          | PROVEN · [audit/reaudit][ev-reaudit]                  | «Da riprendere» › «Riprendi»                                                                     |
| IN-07 | Primo avvio con tre strade: personaggio, campagna/mappa, esempio pronto | Roll20 Quick Start (carica mappa, avventura, sfondo); Alchemy rapido vs personalizzato; Foundry avventura iniziale | R20-002, VTL-005, FVT-004, FVT-005 | PROVEN · [audit/reaudit][ev-reaudit]                  | First steps fold with «Unisciti con un invito»; DM map path opens a new scene in Preparazione.   |
| IN-08 | Contenuto d'esempio "Inizia qui" modificabile, mai condiviso di default | Owlbear GM Vault "Start Here"; Alchemy demo per ruolo; vault Obsidian con mini-campagna                            | VTL-003, VTL-004, CMP-02, CMP-06   | PROVEN · [audit/home-creation][ev-home-creation]      | Home › «Prova l’esempio» › «Apri la nota «Inizia qui»»                                           |
| IN-09 | Novità nell'app in un pannello, non pop-up                              | Roll20 scheda Announcements con tour su richiesta; DDB "What's New"                                                | R20-003, DDB-007, CMP-05           | PROVEN · [final-review-completeness][ev-final-review] | Home right column, «Novità 7» tab                                                                |
| IN-10 | Prova senza account o sandbox usa e getta                               | DDB Quickbuilder senza login; Forge sandbox 60 min; Dungeon Scrawl senza registrazione                             | DDB-010, VTL-001, CMP-04           | PROVEN · [audit/reaudit][ev-reaudit]                  | «Prova senza account» sandbox banner with «Crea un account per salvare».                         |
| IN-11 | App installabile e accesso rapido ai personaggi recenti                 | Roll20 "Aggiungi a Home"; DDB widget dei recenti                                                                   | SVC-178, DDB-068                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Install card/iOS steps; palette «installa».                                                      |
| IN-12 | Segnale "puoi salire di livello" e coda per più personaggi              | BG3 barra XP che cambia stato; Level Up in coda                                                                    | CRP-005                            | PROVEN · [audit/home-creation][ev-home-creation]      | «Pronti a salire di livello» › «Avanza» or «Avanza tutti                                         |

### Personaggi — creazione e avanzamento

| ID    | Capacità                                                                 | Miglior pattern di riferimento                                                                      | ID censimento                               | Stato                                                 | Dove si trova (blueprint, 30/09)                                                                                                                                                                                    |
| ----- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-01 | Creazione per sezioni navigabili; riepilogo che applica una volta        | DDB ordine 2024 Classe→Background→Specie→Caratteristiche→Equipaggiamento; Foundry procedura a passi | DDB-009, DDB-013, R20-017, FVT-011, CRP-010 | PROVEN · [audit/home-creation][ev-home-creation]      | Home › «Crea un personaggio» › «Salva e avanti» through 11 sections › Riepilogo › «Crea scheda»                                                                                                                     |
| PG-02 | Bozza immediata, riprendi/scarta, uscita protetta, ricarica              | DDB bozza "per proteggere il lavoro"; Roll20 Salva ed esci/Scarta/Continua                          | DDB-011, DDB-217, R20-036                   | PROVEN · [audit/home-creation][ev-home-creation]      | Navigating away with unsaved edits asks «Conservare le modifiche alla bozza?» (Scarta solo le modifiche non salvate / Resta nella bozza…                                                                            |
| PG-03 | Scelte mancanti segnalate; riepilogo con aspetti da verificare           | DDB icona (!) per sezione e "Sheet Ready"; Roll20 slide di revisione                                | DDB-012, R20-036                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Empty +2/+1 is one (!) error; «Correggi sezione» focuses origin.backgroundBonuses.str (p1-builder-phone).                                                                                                           |
| PG-04 | Caratteristiche: serie, 27 punti, 4d6 digitale/fisico, manuale con fonte | DDB gruppi di tiri con dadi scartati in grigio; Solasta II tiro dei dadi                            | DDB-018, CRP-011                            | PROVEN · [audit/home-creation][ev-home-creation]      | Caratteristiche › Metodo                                                                                                                                                                                            |
| PG-05 | Origine 2024: background con talento e +2/+1 o +1/+1/+1, lignaggi        | DDB origine 2024 con sotto-scelta di lignaggio                                                      | DDB-020, R20-019                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Soldato shows only FOR/DES/COS with the reason, origin feat «Aggressore selvaggio», (!) da assegnare; Elf lineage choice listed.                                                                                    |
| PG-06 | Selettore contestuale bloccato sulla scelta; crea homebrew e torna       | dnd5e Compendium Browser in modalità bloccata                                                       | FVT-014, R20-017                            | PROVEN · [audit/reaudit3-a][ev-reaudit3-a]            | Player › Personaggi › «Crea personaggio» › «Classi e punti ferita» › «Sfoglia le classi…» › Mago › «Crea variante nell’editor homebrew…»                                                                            |
| PG-07 | Ricostruire una scheda con risorse già spese e storia ignota             | Roll20 import come istantanea (adattato: stato speso esplicito)                                     | R20-014                                     | PROVEN · [audit/home-creation][ev-home-creation]      | Personaggi › «Ricostruisci una scheda»                                                                                                                                                                              |
| PG-08 | Avanza/Rivedi con bozza, confronto e applicazione sullo stato attuale    | dnd5e procedura di avanzamento; Roll20 level-up salva o scarta                                      | FVT-012, FVT-013, R20-018, DDB-023, CRP-013 | PROVEN · [audit/reaudit][ev-reaudit]                  | «Avanza» › (opens on Identità) › rail Classi › level 2 typed by hand › Metodo PF › Riepilogo («PF massimi 13 → 22») › confirm › «Applica…                                                                           |
| PG-09 | Percorso rapido di livello 1 e personaggi pronti da reclamare            | DDB Quickbuilder e Premade "Claim"; Roll20 pronti con livelli già scelti; Alchemy premades          | DDB-004, DDB-009, DDB-010, R20-020, VTL-025 | PROVEN · [final-review-completeness][ev-final-review] | «Percorso rapido» (class, background and species cards, name, summary, «Crea personaggio») produced Pip, a level-1 Ladro                                                                                            |
| PG-10 | Suggerimenti di nome e caratteristiche "Aggiungi/Casuale"                | DDB generatore "Suggest More" senza sostituire il nome                                              | DDB-021, DDB-020                            | PROVEN · [final-review-completeness][ev-final-review] | name chips (Sefa, Marco, Ada …) and «Suggerisci altri»                                                                                                                                                              |
| PG-11 | Prerequisiti applicati con eccezione esplicita e segnalata               | DDB prerequisiti con bypass nelle preferenze; scelte fuori regola conservate con avviso             | DDB-016                                     | PROVEN · [audit/home-creation][ev-home-creation]      | Capacità e talenti › «Talenti bloccati dai requisiti» › «Consenti eccezione e scegli…» › reason › «Consenti eccezione»                                                                                              |
| PG-12 | Competenza duplicata liberata con avviso della nuova scelta              | DDB rilevamento competenze duplicate                                                                | DDB-017                                     | PROVEN · solo test Node · [audit/reaudit][ev-reaudit] | (correzione, provata da test) DDB duplicate-proficiency detection. A skill chosen both for the class and by the species is no longer cleared silently: the panel says «Percezione è scelta due volte: dalla classe… |
| PG-13 | Equipaggiamento iniziale: pacchetti classe/background o oro, riapribile  | DDB scelta pacchetti o oro, "Altri possedimenti" come testo                                         | DDB-019, FVT-015                            | PROVEN · [audit/home-creation][ev-home-creation]      | Equipaggiamento › «Scegli pacchetti iniziali…» › Fighter A/B/C (155 gp) and background A/B (50 gp) › «Usa questa dotazione»                                                                                         |
| PG-14 | Fonti del personaggio per categoria, con avviso di opzioni nascoste      | DDB categorie Core/Espansione/Legacy/Homebrew con descrizione                                       | DDB-015, DDB-165, R20-042                   | PROVEN · [audit/home-creation][ev-home-creation]      | Rail › Fonti                                                                                                                                                                                                        |
| PG-15 | Multiclasse con scelte per classe                                        | DDB/Roll20 aggiunta classe nel builder; incantesimi per classe                                      | DDB-023, R20-018                            | PROVEN · [audit/home-creation][ev-home-creation]      | «Avanza di livello» › Classi › «Aggiungi classe» › Mago › «Ordine dei livelli» (two selects) › Metodo PF                                                                                                            |
| PG-16 | Scendere di livello, modificare scelte passate, rifacimento completo     | dnd5e Level Down con rimozione concessioni; BG3 respec                                              | FVT-012, CRP-014                            | PROVEN · [final-review-completeness][ev-final-review] | «Rivedi scelte» › Classi › level 1 › Riepilogo › confirm › «Applica alla scheda»                                                                                                                                    |
| PG-17 | Gestione XP/traguardi                                                    | DDB "Manage Experience"; FG assegna XP da incontri/missioni                                         | DDB-024, R20-081                            | PROVEN · [final-review-completeness][ev-final-review] | DM › Gruppo › «Assegna PE e monete» opens a dialog with XP                                                                                                                                                          |
| PG-18 | Progressioni non di classe (doni, benedizioni, tracce)                   | BG3 albero separato con prerequisiti                                                                | CRP-019                                     | PROVEN · [audit/home-creation][ev-home-creation]      | Sheet › Capacità › «Doni» › choose a boon › «Sblocca                                                                                                                                                                |
| PG-19 | Co-costruzione DM+giocatore sulla stessa bozza                           | Quest Portal cursori multipli sulla scheda                                                          | VTL-022                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | Identità › «Costruisci con il DM…» › «Condividi con il DM» › edit › «Pubblica modifiche»                                                                                                                            |

### Personaggi — scheda

| ID    | Capacità                                                                       | Miglior pattern di riferimento                                                                  | ID censimento                               | Stato                                                 | Dove si trova (blueprint, 30/09)                                                                                                                                                                                            |
| ----- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-20 | Sezioni Azioni/Inventario/Magie/Capacità/Storia/Extra, stessa scheda al Tavolo | DDB schede della scheda e scheda dentro Maps; dnd5e scheda                                      | DDB-027, DDB-133                            | PROVEN · [audit/reaudit][ev-reaudit]                  | «Azioni della scheda» opens the sheet drawer over the map; URL stays #table; close returns focus.                                                                                                                           |
| PG-21 | Correzione dei PF motivata e conservata nel registro                           | (nostra) correzione con motivo; DDB widget PF                                                   | DDB-032                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «Danni, cure e condizioni» › «Correggi PF e stato» › PF attuali + «Motivo della correzione (obbligatorio)» › «Anteprima» › «Applica»                                                                                        |
| PG-22 | Un solo controllo PF: importo + Cura/Danno + temporanei, identico ovunque      | DDB stesso widget su scheda, tracker e pedina; Roll20 campo tra rosso e verde                   | DDB-032, DDB-142, R20-025                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Pedina: clic destro › «Punti ferita…»                                                                                                                                                                                       |
| PG-23 | Tiro dal numero con modificatori, digitale o fisico                            | DDB clic su ogni numero; Foundry evasione per dado                                              | DDB-150, FVT-153                            | PROVEN · [final-review-completeness][ev-final-review] | Fisici › «Tira»                                                                                                                                                                                                             |
| PG-24 | Modalità Gioco vs Modifica                                                     | dnd5e interruttore Play/Edit; Alchemy cursore di blocco; FG modalità Preparazione/Combattimento | FVT-008, VTL-026, R20-043                   | PROVEN · [final-review-completeness][ev-final-review] | Riquadro sotto la carta PF › «Gioco / Modifica»                                                                                                                                                                             |
| PG-25 | Valori derivati non scrivibili; override per componente con nota               | Roll20 ingranaggio per sezione con modale; DDB AC in componenti con nota                        | R20-024, DDB-029                            | PROVEN · [final-review-completeness][ev-final-review] | «CA 13» → «Classe armatura · Livia · Totale 13 · Base 12 · Destrezza +2 · Mantello della protezione +1», SRD pages, stacking order                                                                                          |
| PG-26 | Ordine di cumulo dei modificatori esplicito                                    | Roll20 Modifier Builder: base → somma → min/max → moltiplica → sostituisci                      | R20-023, FVT-016                            | PROVEN · [audit/sheet][ev-sheet]                      | Clic su «CA» (anche in Gioco) › «Modifiche nell'ordine di cumulo» + «Ordine di applicazione                                                                                                                                 |
| PG-27 | 0 PF: tiri salvezza contro morte, stabile, morte esplicita, ritorno in vita    | DDB riquadro PF che diventa TS morte; Roll20 Stabilizza/Ripristina 1 PF                         | DDB-033, R20-025, CMP-170                   | PROVEN · [audit/reaudit][ev-reaudit]                  | 0 HP death box, «Riporta a 1 PF», explicit «Morto» and «Riporta in vita…».                                                                                                                                                  |
| PG-28 | Condizioni e Indebolimento dalla scheda, con descrizione ed effetti            | DDB pannello condizioni e segmenti 1–6; Roll20 modale con effetti automatici elencati           | DDB-034, R20-027, FVT-030, R20-034          | PROVEN · [audit/reaudit][ev-reaudit]                  | «+ Condizione» › «Avvelenato»: 2 clicks; exhaustion segments 1–6.                                                                                                                                                           |
| PG-29 | Difese: resistenze, immunità, vulnerabilità con fonti e voci proprie           | DDB "Manage Defenses" con asterisco sulle personalizzate                                        | DDB-031                                     | PROVEN · [audit/sheet][ev-sheet]                      | Chip «Difese Nessuna» (o «Gestisci difese») › Tipo, Contro, Fonte «Personalizzata (accordo del tavolo)», Nome, Nota › «Aggiungi difesa»                                                                                     |
| PG-30 | Sensi e velocità personalizzati, scelta di quello mostrato                     | DDB finestra velocità e sensi                                                                   | DDB-030                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | One «Velocità e sensi» dialog with shown speed and shown sense.                                                                                                                                                             |
| PG-31 | Abilità e competenze con tiri                                                  | DDB elenco abilità; BG3 icone e stelle di competenza                                            | DDB-028, CRP-017, DDB-054                   | PROVEN · [audit/sheet][ev-sheet]                      | Elenco «Abilità» con pallino di competenza, caratteristica e valore                                                                                                                                                         |
| PG-32 | Abilità personalizzate e preferite in alto                                     | DDB "Additional Skills" e pin nell'app                                                          | DDB-028                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «Modifica» › nome, caratteristica, competenza/maestria, bonus, nota › «Aggiungi abilità»                                                                                                                                    |
| PG-33 | Ispirazione Eroica attivabile e visibile al DM                                 | DDB interruttore in testata e vista DM                                                          | DDB-036                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | Tavolo › «Riepilogo del gruppo» non la mostra                                                                                                                                                                               |
| PG-34 | Contatori e usi limitati con recupero breve/lungo                              | DDB "Limited Use" con pallini e pulsanti di reset                                               | DDB-038, VTL-030                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Limited uses with «Usa»; pips focusable (p2-focus).                                                                                                                                                                         |
| PG-35 | Recupero all'alba e cariche ricaricabili                                       | dnd5e recupero alba/tramonto dal calendario                                                     | FVT-061, DDB-050                            | PROVEN · solo test Node · [audit/reaudit][ev-reaudit] | (correzione, provata da test) dnd5e dawn recovery: the «Ricarica all'alba» re-render already worked (verified: it appears as soon as the clock passes 06:00); added dawn recovery for features: `rest-time.mjs` `dawnRows`… |
| PG-36 | Filtri economia d'azione e azioni generiche 2024 elencate                      | DDB chip Tutte/Attacco/Azione/Bonus/Reazione/Altro/Usi limitati                                 | DDB-039, R20-028                            | PROVEN · [audit/sheet][ev-sheet]                      | Chip «Tutte 20 / Attacco 3 / Azione 16 / Azione bonus 1 / Reazione 2 / Altro 1 / Usi limitati 5» + «Azioni in combattimento (2024)» +…                                                                                      |
| PG-37 | Armi con proprietà e Maestria                                                  | DDB righe arma con proprietà, maestria solo se concessa                                         | DDB-041, R20-028                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Bastone ferrato: «Versatile 1d8», «Maestria: Rovesciamento» chips.                                                                                                                                                          |
| PG-38 | Azioni personalizzate con tiro e danno                                         | DDB "Manage Custom"; Alchemy azioni componibili                                                 | DDB-040, VTL-028                            | PROVEN · [audit/reaudit][ev-reaudit]                  | «Azione personalizzata» on the sheet opens the quick-bar action dialog; list inclusion by p2-actions tests.                                                                                                                 |
| PG-39 | Striscia dei preferiti a un clic                                               | dnd5e Favourites conservati anche in trasformazione                                             | FVT-009                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | Favourite chip rolls with no dialog; Atletica appears on the Table «Barra rapida» page.                                                                                                                                     |
| PG-40 | Tooltip ricchi con spiegazione del valore                                      | dnd5e tooltip al passaggio; BG3 dettaglio fissabile                                             | FVT-010, CRP-129                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Every save/skill has «dettagli, clic per fissarli».                                                                                                                                                                         |
| PG-41 | Capacità e tratti con fonte e contatori in linea                               | DDB filtri e citazione libro+pagina                                                             | DDB-053                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «SRD 5.2.1 · p. 77–78» inline, filter chips Classe/Specie, «Recupero arcano» on Livia.                                                                                                                                      |
| PG-42 | Storia: aspetto, biografia, tratti, annotazioni distinte                       | DDB tratti/ideali/legami con "+ Aggiungi"                                                       | DDB-055, DDB-056, CMP-20                    | PROVEN · [audit/reaudit][ev-reaudit]                  | Storia › Personalità: four lists with «Aggiungi»/«Casuale», biography separate.                                                                                                                                             |
| PG-43 | Note della scheda per sezioni (alleati, nemici, organizzazioni)                | DDB Notes con chip per sezione                                                                  | DDB-056                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «Storia» › «Aggiungi nota» › Sezione «Alleati», titolo, testo, «Chi la legge» (scheda / solo io) › «Salva nota»                                                                                                             |
| PG-44 | Aspetto: ritratto, cornice, tema; ritratto usato come pedina                   | DDB anteprima immediata; Tokenizer strati e anelli; Quest Portal bordo pedina                   | DDB-058, FVT-038, FVT-039, VTL-024, DDB-108 | PROVEN · [audit/reaudit][ev-reaudit]                  | Storia › «Aspetto» › «Scegli dalla libreria» › «Livia                                                                                                                                                                       |
| PG-45 | Navigazione a sezioni su telefono con accessi persistenti                      | DDB scorrimento e salto rapido; Shard barra fissa di sezione                                    | DDB-060, VTL-016, DDB-067                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Phone: bar at 581 px in the first screen, sticky at 0 when scrolling.                                                                                                                                                       |
| PG-46 | Barra del personaggio al Tavolo con PF, risorse e azioni                       | Alchemy player bar; BG3 barra risorse                                                           | VTL-026, CRP-099                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Hotbar «Livia PF 18/22» opens the HP widget.                                                                                                                                                                                |
| PG-47 | Effetti temporanei attivabili che modificano i tiri (Benedizione, Ira)         | Beyond20 interruttori per personaggio; AboveVTT menu buff                                       | VTL-013, VTL-015                            | PROVEN · [final-review-completeness][ev-final-review] | Livia’s sheet › EFFETTI › toggle «Benedizione»                                                                                                                                                                              |
| PG-48 | Politica dei tiri: vantaggio chiedi/sempre, sussurro, spareggio, critico       | Roll20 Manage Sheet; Beyond20 "Type of Roll"                                                    | R20-032, VTL-012, VTL-014                   | PROVEN · [audit/reaudit][ev-reaudit]                  | «Politica dei tiri» from the sheet box; palette «tiro nascosto».                                                                                                                                                            |
| PG-49 | Controllo accessi: DM non legge la scheda privata                              | DDB privacy; nostra matrice privato/campagna                                                    | DDB-061, DDB-062, SVC-015                   | PROVEN · [final-review-completeness][ev-final-review] | DM › Personaggi                                                                                                                                                                                                             |

### Personaggi — magie

| ID    | Capacità                                                            | Miglior pattern di riferimento                             | ID censimento             | Stato                                                  | Dove si trova (blueprint, 30/09)                                                                                                       |
| ----- | ------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| PG-50 | Scheda Magie: CD e attacco, lancio dal repertorio                   | DDB intestazione con CD/attacco e Cast per riga            | DDB-042, R20-029          | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Inizio › carta «Livia» › scheda «Magie» (Attacco +5, CD 13 nell'intestazione) › «Lancia ▾» › «1° · 3/4» › «Lancia»                     |
| PG-51 | Slot per livello e slot del Patto separati                          | DDB pallini per livello, Patto consumato a parte           | DDB-044                   | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Magie › riga «Magia del Patto · livello 1: 1 / 1» (separata dagli slot normali) › «Lancia» su Charme su persone › la finestra propone… |
| PG-52 | Preparazione collegata al repertorio giocabile                      | dnd5e stato non preparato/preparato/sempre                 | FVT-021, CRP-018          | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Iria › Magie › «Gestisci magie» › pannello «Libro» › «Prepara» › «Modifiche non confermate +1» › «Conferma preparazione»               |
| PG-53 | Gestione incantesimi conosciuti/preparati con filtri di fonte       | DDB "Manage Spells" con versioni 2014/2024 affiancate      | DDB-043, CRP-018          | PROVEN · [final-review-completeness][ev-final-review]  | Livia’s sheet › Magie › «Gestisci magie» › «Lista di classe»                                                                           |
| PG-54 | Liste riutilizzabili di preparati                                   | (nostra F-044) richiamo come proposta                      | —                         | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Gestisci magie › «Liste salvate» › nome › «Salva le preparate come lista» › «Richiama»                                                 |
| PG-55 | Confronto fra incantesimi                                           | (nostra F-045) dettaglio → Confronta → ritorno alla scelta | —                         | PROVEN · [audit/spells-inventory][ev-spells-inventory] | «Confronta» su due righe (lista o pannello) › barra «Confronto (2)» › «Confronta» › tabella › «Torna alla scelta»                      |
| PG-56 | Lancio come rituale (+10 minuti)                                    | DDB "As Ritual"; BG3 marcatura rituali                     | DDB-042, CRP-018          | PROVEN · [final-review-completeness][ev-final-review]  | Riga › «Come rituale» › finestra già impostata «Come rituale: +10 minuti, nessuno slot» › «Lancia come rituale»                        |
| PG-57 | Varianti di livello raccolte in un'icona; dialogo d'uso con consumo | BG3 varianti espandibili; dnd5e conferma consumo e livello | CRP-100, FVT-018, R20-029 | PROVEN · [audit/spells-inventory][ev-spells-inventory] | «1° · 3/4 / 2° · 1/2» › «2°» › finestra «Consuma: Slot di livello 2: 1 → 0 · Livello 2 (base 1)» › «Lancia»                            |
| PG-58 | Lanciare da oggetti magici con cariche                              | dnd5e attività Cast sull'oggetto sintonizzato              | FVT-020                   | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Magie › «Incantesimi dagli oggetti» › «Lancia dall'oggetto» › cariche 1–3 › «Lancia»                                                   |
| PG-59 | Avviso che un nuovo incantesimo chiude la concentrazione attuale    | BG3 Patch 6; dnd5e promemoria                              | CRP-104, FVT-031          | PROVEN · [audit/spells-inventory][ev-spells-inventory] | «Lancia ▾» › «2°» › finestra: «Interromperà la concentrazione su Individuazione del magico» › «Lancia e termina la concentrazione»     |
| PG-60 | Trascrivere incantesimi nel libro del mago                          | BG3 "Learn Spells" sul personaggio giusto                  | CRP-018                   | PROVEN · [final-review-completeness][ev-final-review]  | Gestisci magie › «Trascrivi» › «Pergamene nell'inventario» › «Trascrivi dalla pergamena…» › «Trascrivi»                                |
| PG-61 | Componenti e focus                                                  | Solasta II opzione componenti                              | CRP-047                   | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Magie › «Focus e componenti» › «Riponi» il cristallo › «Lancia» Palla di fuoco › «M · materiale manca» con «Lancia» disattivato ›…     |

### Personaggi — inventario

| ID    | Capacità                                                                     | Miglior pattern di riferimento                                               | ID censimento             | Stato                                                  | Dove si trova (blueprint, 30/09)                                                                                                           |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PG-62 | Aggiungi, modifica, equipaggia; stessa quantità al Tavolo                    | DDB gestione inventario; dnd5e                                               | DDB-046, FVT-023          | PROVEN · [audit/reaudit][ev-reaudit]                   | Inventario › «Aggiungi oggetto» › nome, tipo, quantità, peso › «Salva oggetto» › «Equipaggia»                                              |
| PG-63 | Consumabile con anteprima, dado digitale/fisico, nessun doppio consumo, undo | (nostra) I-026–030                                                           | —                         | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Inventario › «Bevi» › anteprima «Finché non scegli Bevi, non cambia nulla» › «Dadi fisici» › «Bevi · esegui» › facce 3 e 1 › «Registra e…  |
| PG-64 | Ricerca, filtri, raggruppamenti e colonne                                    | dnd5e ricerca/gruppi/colonne per sezione; BG3 filtri rarità                  | FVT-023, CRP-025, DDB-045 | PROVEN · [audit/reaudit][ev-reaudit]                   | Sort by weight, value column.                                                                                                              |
| PG-65 | Contenitori annidati con capacità e peso escluso                             | dnd5e fino a 5 livelli; DDB contenitori; Shard "senza peso aggiuntivo"       | FVT-024, DDB-047, VTL-019 | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Riga › «Altro» › «Sposta, passa o copia…» › destinazione › «Conferma»                                                                      |
| PG-66 | Monete: gestione, conversione, per contenitore, trasferimento                | dnd5e dialogo trasferimento; DDB monete nei contenitori; Roll20 convertitore | FVT-025, DDB-048, R20-030 | PROVEN · [final-review-completeness][ev-final-review]  | Inventario › «Gestisci monete» › «Converti monete…» / «Metti o prendi da un contenitore…» / «Passa o offri a un'altra creatura…»           |
| PG-67 | Dividere una pila; spostare vs copiare fra attori con permessi               | dnd5e menu dividi; Shift sposta/Ctrl copia                                   | FVT-026, FVT-027          | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Altro › «Dividi la pila…» › «Dividi»                                                                                                       |
| PG-68 | Sintonia: tre posti e oggetti che la richiedono                              | DDB filtro Sintonia con tre posti                                            | DDB-049, CRP-027, R20-030 | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Carta «Sintonia 2/3» (tre rombi) › «Gestisci sintonia» (filtro e posti) › «Sintonizza» › riposo breve o «Registra come già avvenuto» con…  |
| PG-69 | Munizioni collegate all'attacco                                              | dnd5e munizione scelta nel dialogo d'attacco; Solasta seconda faretra        | FVT-140, CRP-024          | PROVEN · [audit/reaudit][ev-reaudit]                   | Bow outside combat rolls and spends an arrow; «Regola e calcolo» opens.                                                                    |
| PG-70 | Peso e ingombro facoltativi con varianti                                     | DDB off/standard/variante con spinta e sollevamento                          | DDB-051, FVT-029, CRP-026 | PROVEN · [audit/reaudit][ev-reaudit]                   | Movement shows the effective speed with «−3 m ingombro» (p4-inventory).                                                                    |
| PG-71 | Oggetti non identificati e identificazione                                   | Shard nascosto → Identifica; solo DM in campagna, proprietario fuori         | FVT-028, VTL-020, CRP-028 | PROVEN · [audit/spells-inventory][ev-spells-inventory] | «Oggetti non identificati» › «Identifica»                                                                                                  |
| PG-72 | Inventario del gruppo con chi ha equipaggiato cosa                           | DDB Party Inventory; BG3 indicatori "equipaggiato da"                        | DDB-052, CRP-020, CRP-156 | PROVEN · [audit/reaudit][ev-reaudit]                   | Torcia › «Equipaggiato da te»                                                                                                              |
| PG-73 | Restrizioni di equipaggiamento e avvisi                                      | BG3 rifiuto al trascinamento; Solasta avviso doppia arma                     | CRP-021, CRP-022          | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Inventario › «Equipaggia» su Bastone                                                                                                       |
| PG-74 | Set d'armi con cambio rapido                                                 | BG3 cambio mischia/distanza                                                  | CRP-023                   | PROVEN · [audit/reaudit][ev-reaudit]                   | «Cambia set» stows the blocker.                                                                                                            |
| PG-75 | Valute personalizzate con cambio                                             | Shard valuta come tipo di oggetto                                            | VTL-021                   | PROVEN · [audit/reaudit][ev-reaudit]                   | Palette «valuta» → campaign currencies.                                                                                                    |
| PG-76 | Personalizzare nome, peso, costo, materiale (argento, adamantio)             | DDB Customize oggetto                                                        | DDB-050                   | PROVEN · [audit/spells-inventory][ev-spells-inventory] | Riga › «Altro» › «Personalizza…» › nome mostrato, peso, costo, materiale (Normale / argento / adamantio), note › «Salva personalizzazione» |

### Personaggi — capacità, creature e attività

| ID    | Capacità                                                         | Miglior pattern di riferimento                                       | ID censimento                      | Stato                                      | Dove si trova (blueprint, 30/09)                                                                                                                                                         |
| ----- | ---------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PG-77 | Forma Selvatica: applica, ritorno, risorse vive, Undo distinto   | dnd5e Transformation con Revert; BG3 forme che conservano l'identità | FVT-034, CRP-032, CMP-171          | PROVEN · [audit/reaudit3-a][ev-reaudit3-a] | Player › Tavolo › Mira’s token › «Barra rapida» › slot «4: Forma Selvatica · capacità di classe · 1 di 2 usi» › Forme dialog › Lupo ›…                                                   |
| PG-78 | Compagni, famigli ed evocazioni come Extra con PF e collocazione | DDB Extras per categoria; dnd5e Summon; Shard compagno sulla scheda  | DDB-057, FVT-035, VTL-018          | PROVEN · [audit/reaudit][ev-reaudit]       | Companion token appears at the chosen point (p2-companion-2). The older p2-companion journey now picks a cell the map refuses («Questo spazio non è disponibile»), with a clear message. |
| PG-79 | Metamorfosi, cavalcature, altri compagni ed effetti              | dnd5e preset Keep/Merge                                              | FVT-034                            | PROVEN · [audit/reaudit3-a][ev-reaudit3-a] | DM › Doran’s token menu › Azioni › «Trasforma…» opens a dialog with creature                                                                                                             |
| PG-80 | Scelte da riselezionare dopo un riposo                           | Shard dialogo post-riposo                                            | VTL-017                            | PROVEN · [audit/reaudit][ev-reaudit]       | After a Long Rest: spells and masteries offered.                                                                                                                                         |
| PG-81 | Riposi breve e lungo, Dadi Vita uno a uno, riepilogo recuperi    | DDB dialoghi di riposo; Rest Recovery; Solasta Dadi Vita cliccabili  | DDB-037, FVT-032, FVT-033, CRP-154 | PROVEN · [audit/reaudit][ev-reaudit]       | Hit Dice at the start, HP from Hit Dice in the summary.                                                                                                                                  |
| PG-82 | Bastione dal livello 5: strutture, ordini, turno                 | dnd5e scheda Bastion con avanzamento dal calendario; Roll20 tracker  | FVT-037, R20-033                   | PROVEN · [audit/reaudit][ev-reaudit]       | Iria (level 5) has a top-level «Bastione» section; palette «bastione» finds it from the sheet or as the player. From the DM's Home the command is not offered.                           |
| PG-83 | Progetti duraturi e attività di tempo libero con progresso       | Crash's Tracking barra di progresso; LegendKeeper meter              | FVT-042, CMP-63                    | PROVEN · [audit/reaudit][ev-reaudit]       | Extra sub-pages «Creature e piani», «Progetti e tempo libero», «Ricettario». The progress meter cannot be seen with the sample data (no active project).                                 |
| PG-84 | Fabbricazione con ricette, tempo, costo, strumenti (2024)        | Mastercrafted ricettari; Solasta manuali e durata                    | FVT-043, CRP-030, CRP-029          | PROVEN · [audit/reaudit][ev-reaudit]       | «Ricettario» sub-page; palette «fabbrica», «ricetta».                                                                                                                                    |

### Personaggi — gestione, esportazione e condivisione

| ID    | Capacità                                                                          | Miglior pattern di riferimento                                                             | ID censimento                      | Stato                                                        | Dove si trova (blueprint, 30/09)                                                                                                        |
| ----- | --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| PG-85 | Collegamento esplicito personale → campagna con destinatari e consenso            | DDB "Join with this character"                                                             | DDB-073, SVC-013                   | PROVEN · [audit/reaudit3-a][ev-reaudit3-a]                   | Player › Campagne › Gruppo › «Aggiungi un mio personaggio»                                                                              |
| PG-86 | Elenco personaggi con ricerca, ordinamento e azioni Copia/Elimina/Lascia campagna | DDB My Characters con ordinamento persistente; oggi il blueprint ha solo l'elenco semplice | DDB-063, SVC-014, R20-013          | PROVEN · [final-review-completeness][ev-final-review]        | Personaggi › campo «Cerca per nome, livello, classe, specie o campagna» («druida» → 1 di 4) › «Ordina per»                              |
| PG-87 | Privacy: solo campagna / privato / pubblico via link in sola lettura              | DDB tre livelli; scheda pubblica leggibile per URL                                         | DDB-061, DDB-062, CMP-13           | PROVEN · [audit/features-management][ev-features-management] | Scheda › «Gestisci personaggio» › «Cambia privacy» › «Pubblica con link» › «Salva privacy» → dialogo «Condividi» con link e QR › «Apri… |
| PG-88 | Copia indipendente (anche come migrazione di edizione)                            | DDB guida "copia e cambia classe"; Roll20 Copy                                             | DDB-064, R20-014                   | PROVEN · [audit/reaudit][ev-reaudit]                         | Copy dialog: «Regole di destinazione» and «Cosa cambia».                                                                                |
| PG-89 | Libreria fuori campagna: collegamento vivo vs istantanea, rilascia, trasferisci   | Roll20 Characters: Add to Game, Import, Transfer, Release                                  | R20-013, R20-014, R20-015, CRP-012 | PROVEN · [audit/reaudit][ev-reaudit]                         | Link/copy through a campaign picker (only one sample campaign to pick).                                                                 |
| PG-90 | Esporta PDF compilabile e stampa                                                  | DDB Export to PDF con concentrazione e rituali; Fight Club                                 | DDB-065, CMP-11, CMP-15            | PROVEN · [final-review-completeness][ev-final-review]        | Scheda › «Gestisci personaggio» › «Scarica PDF»                                                                                         |
| PG-91 | Esporta/importa la scheda nel formato proprio                                     | Foundry Export/Import Data; FG /exportchar                                                 | FVT-205, R20-047                   | PROVEN · [audit/features-management][ev-features-management] | «Gestisci personaggio» › «Esporta dati                                                                                                  |
| PG-92 | Import da formati terzi documentati, mai scraping fragile                         | Avrae import con aggiornamento; ddb-importer; Shard che abbandona l'import DDB             | DDB-194, DDB-203, FVT-040, VTL-200 | PROVEN · [audit/reaudit][ev-reaudit]                         | Foundry actor preview (mapped/not imported) and import, level 3, 28 HP.                                                                 |
| PG-93 | Condivisione rapida al tavolo (link o QR)                                         | Demiplane QR del personaggio                                                               | CMP-14                             | PROVEN · [final-review-completeness][ev-final-review]        | «Gestisci Livia» › «Condividi (link e QR)», «Cambia privacy»                                                                            |
| PG-94 | DM che modifica la scheda di un giocatore autorizzato                             | World Anvil "Edit Sheet"; Demiplane permessi                                               | CMP-18, CMP-16                     | PROVEN · [audit/reaudit][ev-reaudit]                         | DM header «Scheda di Giocatore · il giocatore ti consente di modificarla»; player «Scheda controllata da te».                           |
| PG-95 | Storico delle revisioni del personaggio                                           | FG Character Vault con revisioni                                                           | R20-046                            | PROVEN · [final-review-completeness][ev-final-review]        | Scheda › «Note» › «Revisioni» › «Salva revisione» › nome › «Salva revisione»                                                            |
| PG-96 | Registro Adventurers League                                                       | FG scheda Log                                                                              | R20-044                            | PROVEN · [audit/features-management][ev-features-management] | Scheda › «Note» › «Registro» › «Aggiungi voce» › campi AL › «Aggiungi al registro»                                                      |

### Campagna — pannello, diario e mondo

| ID    | Capacità                                                                     | Miglior pattern di riferimento                                                                                 | ID censimento                                          | Stato                                                      | Dove si trova (blueprint, 30/09)                                                                                                         |
| ----- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| CA-01 | Panoramica: prossimo incontro, ultimo riepilogo, gruppo, entra al Tavolo     | Roll20 Game Details come prima pagina dopo l'invito; DDB barra laterale della campagna dalla scheda            | R20-049, SVC-024, DDB-082                              | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Inizio › Apri campagna → Panoramica                                                                                                      |
| CA-02 | Creare una campagna: nome, immagine, descrizione, regole 2024, prossima data | Foundry Create World con data prossima sessione; Roll20 profilo campagna; Alchemy rapido/personalizzato        | FVT-001, R20-009, SVC-025, VTL-005                     | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Inizio › Crea campagna → modulo                                                                                                          |
| CA-03 | Cruscotto con riquadri configurabili, anche diversi per ruolo                | Kanka widget (elenchi filtrati, calendario, anteprima) e cruscotti per ruolo; Obsidian "DM Screen"             | CMP-21, CMP-22, CMP-01                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | «Personalizza» offers «Elenco filtrato di voci», «Calendario delle sessioni», «Anteprima di una voce».                                   |
| CA-04 | Messaggio d'inizio sessione per i giocatori                                  | FG Message of the Day all'accesso                                                                              | R20-082                                                | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Panoramica › riquadro «✦ Messaggio d'inizio sessione» › Scrivi messaggio › spunta «Mostralo ai giocatori…» › Salva                       |
| CA-05 | Sezioni della campagna disattivabili se non usate                            | Kanka moduli disattivabili per campagna                                                                        | CMP-24                                                 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Gestione DM (apri) › Impostazioni › Sezioni › interruttore «Tempo libero»                                                                |
| CA-06 | Discussione asincrona della campagna                                         | Roll20 forum privato con fissa/affonda                                                                         | R20-062, SVC-083                                       | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Racconto (apri) › Discussioni › Nuova discussione › Pubblica                                                                             |
| CA-07 | Pagina pubblica della campagna in sola lettura                               | Kanka ruolo pubblico con avviso "non mostrerebbe nulla"; Roll20 accesso pubblico; LegendKeeper URL             | R20-063, SVC-032, SVC-042, CMP-53, CMP-58              | PROVEN · simulazione · [audit/reaudit][ev-reaudit]         | Poi Impostazioni › Permessi                                                                                                              |
| CA-08 | Diario: resoconti, note, sezioni, collegamenti, storico e ripristino         | Foundry voci a pagine; Kanka journal con autore                                                                | FVT-053, CMP-33, DDB-085                               | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Diario › Leggi › Modifica → titolo                                                                                                       |
| CA-09 | Destinatari espliciti con anteprima del destinatario                         | DDB due diari con pubblico esplicito; Foundry livelli di proprietà                                             | DDB-085, FVT-048, VTL-049, VTL-050                     | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Editor › «Chi può leggere» + «Destinatari effettivi» + «Come lo vedrà… Giocatore»                                                        |
| CA-10 | Modifiche concorrenti: bozza conservata, confronto, riapplicazione           | DDB blocco "in modifica"; Foundry/LegendKeeper coediting (vedi conflitti)                                      | DDB-087, FVT-055, CMP-55                               | PROVEN · [audit/reaudit3-a][ev-reaudit3-a]                 | DM › Mondo › «Nuova voce del mondo» › title and body › «Salva contenuto per questi destinatari» › «Modifica» › edit › «Salva bozza e…    |
| CA-11 | Annotazione dal Tavolo senza lasciare il gioco                               | DDB Quick Jot (J)                                                                                              | DDB-086                                                | PROVEN · [audit/reaudit][ev-reaudit]                       | Tavolo › Diario contiene solo Materiali/Missioni/Immagini                                                                                |
| CA-12 | Collegamenti fra voci e ritorno alla voce di partenza                        | Kanka @menzioni; Foundry link per trascinamento; Roll20 [Nome] che rispetta i permessi                         | CMP-25, FVT-056, R20-057                               | PROVEN · [audit/reaudit][ev-reaudit]                       | @ in a World entry links an Archive page.                                                                                                |
| CA-13 | Blocchi segreti in una pagina con rivelazione per blocco                     | LegendKeeper /secret; Foundry secret block con reveal; Kanka post con visibilità propria                       | FVT-054, CMP-56, CMP-26, CMP-85, R20-056               | PROVEN · [audit/reaudit][ev-reaudit]                       | Campagna › Archivio › pagina › Modifica › «Aggiungi blocco segreto»                                                                      |
| CA-14 | Retro-collegamenti e menzioni non collegate                                  | Obsidian pannello backlinks con contesto                                                                       | CMP-88                                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | Backlinks with context on a World entry.                                                                                                 |
| CA-15 | Suggerimento di collegamenti dai nomi riconosciuti, solo con conferma        | Obsidian menzioni non collegate; LegendKeeper sottolineatura; Scabard rilevatore al salvataggio                | CMP-59, CMP-84, CMP-88                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | Unlinked mention linked only after «Collega».                                                                                            |
| CA-16 | Nuova pagina annidata dal testo; sposta selezione in nuova pagina            | LegendKeeper `[[nome]]` e "Cut-to-New-Page"                                                                    | CMP-60                                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | Archivio › pagina › Modifica › [[Cantina di Oben]] › Salva pagina › link «pagina da creare» › «Crea la pagina annidata» › Crea pagina    |
| CA-17 | Modelli di pagina e kit di proprietà                                         | Kanka Property Kits; World Anvil 28 modelli; LegendKeeper modelli condivisibili                                | CMP-27, CMP-61, CMP-73                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | Kits, «Salva come modello»; palette «modello».                                                                                           |
| CA-18 | Tipi di voce: nota, luogo/mondo, missione, resoconto                         | Monk's Enhanced Journal pagine tipizzate; Kanka moduli                                                         | FVT-057, CMP-23                                        | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Missione in Racconto › Missioni o nell'Archivio                                                                                          |
| CA-19 | Tipi aggiuntivi: persona, organizzazione, negozio, evento, elenco            | Monk's Person/Place/Organization/Shop/Event/Checklist                                                          | FVT-057, CMP-23                                        | PROVEN · [audit/reaudit][ev-reaudit]                       | «Nuova voce del mondo» with every type.                                                                                                  |
| CA-20 | Schede aperte e segnalibri con avanti/indietro nel diario                    | Monk's schede tipo browser e barra segnalibri                                                                  | FVT-057                                                | PROVEN · [audit/reaudit][ev-reaudit]                       | Bookmark and shared tab bar across Mondo and Archivio.                                                                                   |
| CA-21 | Riepilogo di sessione preparato in automatico e modificabile                 | Quest Portal Session Stories (presenze, durata, scene); Shard "Finish encounter" scrive il registro            | VTL-054, VTL-155                                       | PROVEN · [audit/reaudit][ev-reaudit]                       | «Prepara bozza automatica» with play events only; Table end offers the draft (P10, not re-driven).                                       |
| CA-22 | Archivio di chat e registro fra le sessioni, con riservatezza dei sussurri   | Roll20 Chat Archive con "Hide Whispers"; BG3 storico dialoghi                                                  | R20-065, SVC-081, CRP-063                              | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Racconto › Archivio chat                                                                                                                 |
| CA-23 | Esportare o ripulire il registro                                             | Foundry esporta/pulisci chat; Roll20 conferma digitata                                                         | FVT-066, R20-207                                       | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Archivio chat › «Svuota l'archivio…» › scrivere «ELIMINA CHAT» › Svuota definitivamente                                                  |
| CA-24 | Viste salvate e filtrate sulle voci (tabella, schede, colonne)               | Obsidian Bases; Notion relazioni e gallerie filtrate; Kanka elenco filtrato                                    | CMP-91, CMP-95, CMP-96                                 | PROVEN · [audit/reaudit][ev-reaudit]                       | Saved cards view over World entries and Archive pages.                                                                                   |
| CA-25 | Allegati per voce con visibilità propria (immagini, PDF)                     | Kanka allegati con visibilità; Roll20 PDF nel diario                                                           | CMP-28, R20-061                                        | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Voce › Allega un file › Carica dal dispositivo (PDF) › Solo DM › Allega                                                                  |
| CA-26 | Testo eseguibile: prove, TS, danni, premi cliccabili nelle voci              | dnd5e enrichers `[[/check]]` con "request"; Quest Portal pulsanti di tiro; Roll20 pulsanti comando             | FVT-146, FVT-175, VTL-051, R20-058                     | PROVEN · [audit/reaudit][ev-reaudit]                       | Nell'Archivio [[/check Atletica 12]] e [[/save DES 13]] diventano link «pagina da creare»                                                |
| CA-27 | Voci del mondo con visibilità, collegate a scene e Tavolo                    | Kanka entità; FG Locations con note giocatore/DM                                                               | CMP-23, R20-071, R20-075                               | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Tavolo › Diario › Materiali › Spilli › Aggiungi spillo… collegato a «Osservatorio di Bruma», «Visibile ai giocatori»                     |
| CA-28 | Mappa del mondo con spilli collegati, gruppi, livelli, visibilità per spillo | Kanka Map Explorer senza modalità separata (spillo, testo, area, percorso, legenda); World Anvil; Foundry note | CMP-41–48, CMP-78, FVT-087                             | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Mondo (gruppo) › Mappa e calendario › Spillo › clic sulla mappa → modulo                                                                 |
| CA-29 | Mappe annidate mondo → regione → città → dungeon                             | LegendKeeper spilli che aprono mappe di altri elementi                                                         | CMP-64, CMP-65, CMP-67                                 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Dettagli dello spillo › «Apri la mappa «Cripte del faro»»                                                                                |
| CA-30 | Misurare distanze sulla mappa del mondo                                      | Kanka misura con tappe; LegendKeeper "fantasy navigation"                                                      | CMP-45, CMP-68                                         | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Misura › clic per tappe                                                                                                                  |
| CA-31 | Orologio comune della finzione avanzato dal DM                               | dnd5e HUD con avanzamento solo DM                                                                              | FVT-060, VTL-056                                       | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Calendario › Avanza il tempo › (Riposi e tempo) 3 Ore › Vedi conseguenze del tempo › Applica                                             |
| CA-32 | Calendario del mondo personalizzabile (mesi, lune, stagioni, ere)            | Fantasy Calendar; LegendKeeper lune; Calendaria                                                                | CMP-98, CMP-70, CMP-38, FVT-062                        | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Impostazioni del calendario: mesi (aggiunto «Tredicesima» e navigato fin lì), giorni della settimana, lune, stagioni, data iniziale con… |
| CA-33 | Eventi datati con visibilità, ricorrenza e promemoria                        | Calendaria note Visibili/Nascoste/Segrete; Kanka promemoria; FG registro per giorno                            | FVT-062, CMP-35, CMP-100, R20-077                      | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Nuovo evento: data e ora, «Si ripete: Ogni anno», «Chi lo vede: Solo DM (da rivelare)», luogo, «Promemoria: 1 giorno prima» → in elenco… |
| CA-34 | Cronologie con ere e viste cronaca/calendario                                | LegendKeeper timeline con viste; Kanka ere ed elementi                                                         | CMP-69, CMP-40, CMP-71                                 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Cronologia: eventi raggruppati per era, marcatore «Adesso», filtro per luogo, Modifica le ere                                            |
| CA-35 | Storia di un luogo aprendo lo spillo (eventi per luogo)                      | World Anvil Chronicles: corsie parallele e storia del marcatore                                                | CMP-79                                                 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Spillo › «Storia del luogo (2)» › Apri nella cronologia / Evento qui                                                                     |
| CA-36 | Relazioni fra voci e rappresentazione a grafo o lavagna                      | Kanka relazioni con "View web"; Obsidian Canvas; LegendKeeper Boards; alberi genealogici                       | CMP-29, CMP-30, CMP-72, CMP-80, CMP-81, CMP-89, CMP-90 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Voce › «Apri nel grafo delle relazioni» → Archivio › Relazioni                                                                           |
| CA-37 | Missioni con obiettivi, stato, ricompense, committente                       | Forien's Quest Log (In corso/Completate/Fallite, sotto-obiettivi); BG3 diario; Kanka Elements                  | FVT-058, CRP-062, CMP-32                               | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Racconto › Missioni                                                                                                                      |
| CA-38 | Fazioni e reputazione per personaggio o gruppo, con visibilità               | DOS2 GM schermata atteggiamenti; BG3 approvazione; Crash's Tracking                                            | CRP-061, CRP-060, FVT-042                              | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Archivio › Reputazione › casella Goblin × Livia › punteggio −4, motivo, «Condivisa: solo la fascia» › Registra                           |
| CA-39 | PNG importante con atteggiamento o lealtà                                    | dnd5e "important NPC" con lealtà e TS morte                                                                    | FVT-091                                                | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Archivio › pagina › Modifica › «PNG importante»                                                                                          |
| CA-40 | Connessioni segrete rivelabili                                               | Scabard connessioni segrete visibili al DM fino alla rivelazione                                               | CMP-83                                                 | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | Archivio › Relazioni › Aggiungi relazione con «Connessione segreta» spuntata                                                             |
| CA-41 | Generatori di mondo (città, locande, demografia)                             | donjon; Azgaar                                                                                                 | CMP-104, CMP-105                                       | PROVEN · [audit/campaign-hub-world][ev-campaign-hub-world] | «locanda» › «Genera per la preparazione» (Dungeon, Incontro, Locanda, Centro abitato, Nomi, Muri da mappa), con seme e tiri per campo ›… |

### Campagna — sessioni reali

| ID    | Capacità                                                                     | Miglior pattern di riferimento                                               | ID censimento             | Stato                                                                | Dove si trova (blueprint, 30/09)                                                                                                          |
| ----- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| CA-42 | Appuntamento diretto con ora locale e concordata, conferma, cambio, annullo  | Roll20 "Next Game" nel fuso del visitatore; Sesh fusi personali e ora legale | R20-049, SVC-047, SVC-060 | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Inizio › «Apri sessioni» › «Data già concordata» › data+fuso › «Salva bozza e aggiorna anteprima» › «Conferma»                            |
| CA-43 | Disponibilità Sì/Forse/No e sovrapposizioni                                  | Rallly "Se necessario"; when2meet mappa di calore                            | SVC-062, SVC-063, SVC-059 | PROVEN · [audit/reaudit][ev-reaudit]                                 | Heatmap, totals, best date, «Proposta», names.                                                                                            |
| CA-44 | Ricorrenza e pianificazione di più date insieme                              | StartPlaying cadenza e blocchi fino a 10; Discord eventi ricorrenti          | SVC-048, SVC-049, SVC-056 | PROVEN · [final-review-completeness][ev-final-review]                | Sessioni › «Nuova serie ricorrente…» (precompilata dalla sessione zero) › «Programma le date»                                             |
| CA-45 | Salto di una sessione distinto dall'uscita; dopo uno spostamento si richiede | StartPlaying "Skipping" e trappola delle assenze riportate                   | SVC-052, SVC-053          | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Sessioni › «Salto la prossima» / «Salto questa»                                                                                           |
| CA-46 | Posti limitati con lista d'attesa                                            | Sesh limite e attesa con avviso; Warhorn FIFO non riordinabile               | SVC-058, SVC-009          | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | «Mettimi in lista d'attesa» › «In lista d'attesa                                                                                          |
| CA-47 | Promemoria su richiesta e feed calendario                                    | Sesh promemoria opt-in e feed iCal                                           | SVC-064, SVC-065          | PROVEN · simulazione · [audit/reaudit][ev-reaudit]                   | Trovato solo così: campagna › «Gestione DM» (giocatore: «Strumenti») › «Integrazioni» › scheda «Calendario» › «Crea il mio link del…      |
| CA-48 | Presenze registrate per sessione                                             | Sesh registro; Quest Portal presenze nel riepilogo                           | SVC-061, VTL-054          | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Sessioni › «Registra partita giocata» › «Salva bozza…» › «Conferma» › «Registra presenze…» (anche nel riquadro «Presenze da registrare»)… |

### Campagna — membri, ruoli e permessi

| ID    | Capacità                                                                          | Miglior pattern di riferimento                                                                           | ID censimento                               | Stato                                                                | Dove si trova (blueprint, 30/09)                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-49 | Link d'invito con ruolo, scadenza e numero d'usi; cambia dopo un'espulsione       | Kanka invito con scadenza/usi/ruolo (mai admin); Roll20 link che cambia al kick, link co-GM monouso 48 h | SVC-038, SVC-028, SVC-029, R20-050, DDB-072 | PROVEN · [final-review-completeness][ev-final-review]                | Membri › Inviti: role, expiry, uses → «Link creato: 2X4U-LM9X-J95D»                                                                                                                         |
| CA-50 | Approvazione della richiesta d'ingresso                                           | Owlbear sala d'attesa con approvazione del creatore                                                      | VTL-036, SVC-035                            | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Inviti › «Approva ogni ingresso dal link…»                                                                                                                                                  |
| CA-51 | Pagina d'ingresso con quattro strade per il personaggio                           | DDB: crea, pronto, reclama non assegnato, "Join with this character"                                     | DDB-073, SVC-013, VTL-025                   | PROVEN · [final-review-completeness][ev-final-review]                | Link › «Come vuoi entrare?» con 4 strade (Crea, Da un personaggio pronto, Reclama, Entra con un tuo personaggio) › scelta › «Controlla…                                                     |
| CA-52 | Personaggi non assegnati e "Reclama"; più personaggi per giocatore                | DDB Unassign/Claim; FG Release e AFK                                                                     | DDB-074, R20-045                            | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | DM: campagna › Membri › «Personaggi» › «Rendi non assegnato»                                                                                                                                |
| CA-53 | Ruoli: DM, co-DM con elenco dei poteri, giocatore, osservatore                    | Roll20 co-GM con poteri pubblicati; Foundry Assistant GM/Trusted; TTS spettatore                         | R20-051, SVC-030, FVT-046, SVC-044, VTL-046 | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | «Gestione DM» › «Membri» › «Promuovi a co-DM» (il dialogo elenca i poteri) › «Conferma ruolo»                                                                                               |
| CA-54 | Espellere, lasciare, disattivare o riassegnare un personaggio                     | Roll20 Kick/Leave; DDB Deactivate; lacuna DDB sulla riassegnazione                                       | SVC-031, DDB-075, R20-070, VTL-039          | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Membri › «Espelli…»                                                                                                                                                                         |
| CA-55 | Trasferire la proprietà della campagna con accettazione                           | Quest Portal trasferimento con stato in attesa e revoca                                                  | VTL-040, R20-069                            | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Membri › scheda «Gestione» › «Trasferisci la proprietà…» › «Proponi trasferimento»                                                                                                          |
| CA-56 | Elenco membri con stato online e ordinamento                                      | Owlbear roster online/offline; Roll20 ordinamento per ultimo accesso                                     | SVC-037, R20-052                            | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | «Strumenti» › «Membri»                                                                                                                                                                      |
| CA-57 | Cedere il ruolo di DM per una sessione                                            | Owlbear passaggio del ruolo GM                                                                           | SVC-036                                     | PROVEN · [final-review-completeness][ev-final-review]                | hand-off dialog reads «Livia, Mira · Giocatore»                                                                                                                                             |
| CA-58 | Revoca: il gruppo sparisce da elenchi e ricerca, le note proprie restano          | (nostra) Inc.7                                                                                           | —                                           | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Inizio: «Nessuna campagna accessibile»                                                                                                                                                      |
| CA-59 | Diritti per oggetto: lettura, modifica, delega, senza onniscienza sul "Solo io"   | Foundry None/Limited/Observer/Owner (copiati i livelli, non l'onniscienza)                               | FVT-048, R20-054, VTL-052                   | PROVEN · [final-review-completeness][ev-final-review]                | Appunti › «Nuovo appunto» › «Chi può leggere» (Solo io / Io e i DM / Persone scelte con Legge o Modifica / Gruppo) › «Salva bozza…» ›…                                                      |
| CA-60 | Vedere la campagna come un membro per verificare i permessi                       | Kanka "View as" con barra "Torna al mio utente"; Roll20 Player View                                      | SVC-040, CMP-52, R20-128, VTL-041, VTL-044  | PROVEN · [audit/reaudit][ev-reaudit]                                 | «Vedi come» on the member row.                                                                                                                                                              |
| CA-61 | Pannello semplice di permessi (disegnare, ping, muovere mostri, bloccare, gruppi) | DDB Game Settings con 6–7 interruttori; Owlbear permessi per livello                                     | DDB-128, SVC-105, VTL-037, SVC-109, FVT-047 | PROVEN · [audit/reaudit3-c][ev-reaudit3-c]                           | Impostazioni › Permessi › «Ruolo: Giocatore»: pointer and signals, drawing, templates, «muovere e far agire le creature del DM», lock, «I giocatori possono raggruppare le proprie pedine»… |
| CA-62 | Ultimo accesso visibile solo su consenso                                          | Kanka opt-in disattivato di default                                                                      | SVC-043                                     | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Account e profilo › «Privacy» › «Mostra il mio ultimo accesso…»                                                                                                                             |

### Campagna — sicurezza del tavolo

| ID    | Capacità                                                          | Miglior pattern di riferimento                                                                             | ID censimento                          | Stato                                                                | Dove si trova (blueprint, 30/09)                                                                                                      |
| ----- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| CA-63 | Accordi della campagna e aspettative con traccia facoltativa      | DMG 2024 foglio aspettative con limiti; StartPlaying almeno uno strumento                                  | SVC-074, SVC-070, SVC-072              | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | «Gioco» › «Sicurezza» › «Modifica aspettative» › «Condividi con il gruppo» (+ «Ricorda prima di ogni sessione») › «Salva aspettative» |
| CA-64 | Linee e veli nel profilo, anonimi, validi per ogni campagna       | Alchemy scheda Sicurezza con elenco combinato senza nomi                                                   | VTL-058, SVC-073                       | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Account › Privacy › «Apri il mio profilo di sicurezza» › «Nuova linea»/«Nuovo velo» › «Aggiungi»                                      |
| CA-65 | Avvisi di contenuto e argomenti ricordati prima della sessione    | Let's Role promemoria pre-sessione; Alchemy avvisi prima dell'ingresso                                     | VTL-059, SVC-010, SVC-071              | PROVEN · [audit/sessions-members-safety][ev-sessions-members-safety] | Il DM compila «Avvisi per la prossima sessione» e «Ricorda prima di ogni sessione»                                                    |
| CA-66 | Segnale in gioco: Stop/X anonimo, rallenta, alza la mano con coda | Rumble! anonimato graduato; Alchemy X-Card al centro dello schermo DM; Foundry Safety & Communication coda | SVC-110–113, R20-150, R20-147, FVT-069 | PROVEN · [final-review-completeness][ev-final-review]                | il DM vede lo Stop al centro dello schermo con «Ricevuto»                                                                             |
| CA-67 | Stelle e desideri dopo la sessione                                | StartPlaying                                                                                               | SVC-076                                | PROVEN · [final-review-completeness][ev-final-review]                | Card della sessione giocata › «Chiedi stelle e desideri…» › Sicurezza › «Chiedi stelle e desideri»                                    |
| CA-68 | Filtri personali di contenuto                                     | BG3 interruttore contenuti; filtro volgarità                                                               | CRP-183                                | PROVEN · [audit/reaudit][ev-reaudit]                                 | Profile filter with «Sfuma le immagini…» and «Filtro delle parolacce».                                                                |

### Campagna — impostazioni, gruppo e dati

| ID    | Capacità                                                                           | Miglior pattern di riferimento                                                                 | ID censimento                               | Stato                                                              | Dove si trova (blueprint, 30/09)                                                                                                                                                       |
| ----- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CA-69 | Regole della tavola: preset + interruttori, blocco dopo l'avvio, storico dei cambi | BG3 Custom Mode con blocchi; Solasta preset poi singoli valori; WotR campagna marcata "Custom" | CRP-040, CRP-045, CRP-046, CRP-050, R20-180 | PROVEN · [audit/reaudit][ev-reaudit]                               | Preset picker; no census IDs.                                                                                                                                                          |
| CA-70 | Livello di automazione della campagna (assistito/automatico)                       | dnd5e assistito vs Midi-QOL completo (scelta nella sezione c)                                  | FVT-138, FVT-141                            | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | Gestione DM › Impostazioni › Regole › «Assistito»                                                                                                                                      |
| CA-71 | Politiche di divulgazione: PF nemici, CD, nomi, prove passive fallite              | FG salute per pubblico; BG3 interruttori CD e prove passive; Improved Initiative player view   | R20-167, CRP-041, CRP-042, CRP-043, VTL-128 | PROVEN · [final-review-completeness][ev-final-review]              | Impostazioni › Regole › «PF esatti / A parole / Nascosta»                                                                                                                              |
| CA-72 | Abilitare in campagna una revisione esatta di un contenuto                         | DDB Content Management; FG accesso moduli Block/Allow                                          | DDB-080, R20-190                            | PROVEN · [audit/reaudit][ev-reaudit]                               | Gestione DM › Impostazioni › Fonti › «Gestisci in Biblioteca» → Biblioteca «Campagna» tab says «Contenuti (0)… Crea il primo oppure…                                                   |
| CA-73 | Fonti della campagna con stati chiari (disponibile, condiviso, bloccato)           | Roll20 Compendium Selection; Kobold+ Sources                                                   | R20-183, CMP-109, DDB-079                   | PROVEN · [audit/reaudit][ev-reaudit]                               | Fonti › «Homebrew, voce per voce» with revision and «mancante» rows (empty with the sample data).                                                                                      |
| CA-74 | Predefiniti di scene e pedine applicabili alle esistenti con conteggio d'impatto   | Roll20 "Apply Default Settings" con numero di pagine/pedine toccate                            | R20-087, SVC-101                            | PROVEN · [audit/reaudit][ev-reaudit]                               | Scene and token defaults with «Applica alle esistenti».                                                                                                                                |
| CA-75 | Verifica delle dipendenze all'ingresso (homebrew/pacchetti mancanti)               | BG3 finestra di verifica mod con un'azione per voce                                            | CRP-171                                     | PROVEN · [final-review-completeness][ev-final-review]              | DM «Crea link» (role, expiry, uses) → player «Ho un link d’invito» → «Sei invitato… Entri come Giocatore · Scade … · Usi rimasti 1/1 · Come vuoi entrare?» with the four paths         |
| CA-76 | Riepilogo del gruppo per il DM (PF, CA, passive, lingue, TS)                       | Party Overview; FG Party Sheet; Shieldmaiden pannello giocatori                                | FVT-071, R20-078, CMP-180                   | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | Overview › «Apri il riepilogo del gruppo»                                                                                                                                              |
| CA-77 | Riposo di gruppo avviato dal DM con partecipanti                                   | dnd5e richiesta di riposo con avanzamento; Rest Recovery                                       | FVT-148, FVT-050                            | PROVEN · [audit/reaudit][ev-reaudit]                               | «Riposi» › Contesto / Tipo › Partecipanti › «Vedi inizio del riposo» › «Avvia riposo»                                                                                                  |
| CA-78 | Magie condivise del gruppo                                                         | (nostra F-046)                                                                                 | —                                           | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | Overview › «Apri il riepilogo del gruppo» › «Magie condivise» (or sidebar Gruppo › Magie condivise)                                                                                    |
| CA-79 | Assegnare XP e monete al gruppo con divisione                                      | dnd5e `/award` e pulsante Award; FG XP da incontri e missioni; Monk's TokenBar                 | FVT-051, FVT-052, R20-081                   | PROVEN · [final-review-completeness][ev-final-review]              | Gioco (expand) › Tesoro › «Assegna PE e monete» › PE / mo / Modalità «Da dividere» / Destinatari / Motivo › «Assegna»                                                                  |
| CA-80 | Basi e proprietà del gruppo                                                        | dnd5e Bastion; Roll20 tracker                                                                  | FVT-037, R20-033                            | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | «Basi e ordini» › «Apri le basi» › «Nuova base del gruppo» › «Crea base» › «Aggiungi struttura»                                                                                        |
| CA-81 | Veicoli del gruppo con velocità e carico                                           | dnd5e veicolo primario del gruppo                                                              | FVT-050                                     | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | «Carro» › «Apri i veicoli» › Personaggio/Posto › «Sali a bordo»                                                                                                                        |
| CA-82 | Storico delle modifiche per voce con ripristino come nuova revisione               | Kanka "View changes"; Obsidian diff                                                            | CMP-211, CMP-221                            | PROVEN · [audit/reaudit][ev-reaudit]                               | «Cronologia» in the header with diff and «Ripristinata da…».                                                                                                                           |
| CA-83 | Copia della campagna scegliendo i componenti                                       | Roll20 Copy Game con caselle per componente                                                    | R20-066, SVC-077, VTL-040                   | PROVEN · [final-review-completeness][ev-final-review]              | Gestione DM › Dati della campagna › «Copia la campagna…» › untick «Giocatori e ruoli» and «Tesoro e scorta» › «Copia la campagna»                                                      |
| CA-84 | Archivio/stato dormiente e ripristino                                              | Roll20 cold storage con elenco di cosa resta bloccato                                          | R20-206, SVC-080                            | PROVEN · [final-review-completeness][ev-final-review]              | Dati della campagna: «Archivia…», «Elimina…», «Crea istantanea…», «Copia la campagna…» open their dialogs                                                                              |
| CA-85 | Eliminazione con conferma digitata e cestino recuperabile                          | Foundry titolo da digitare; Kanka recupero 30 giorni; Roll20 ripristino 6 mesi                 | FVT-003, CMP-212, SVC-079, R20-207          | PROVEN · [final-review-completeness][ev-final-review]              | Dati della campagna: «Archivia…», «Elimina…», «Crea istantanea…», «Copia la campagna…» open their dialogs                                                                              |
| CA-86 | Istantanee e ripristino come copia                                                 | FG "Restore previous" come copia; LegendKeeper istantanee giornaliere; Roll20 rollback         | R20-083, CMP-216, R20-068, SVC-078          | PROVEN · [final-review-completeness][ev-final-review]              | Dati › «Crea istantanea…» › Nome › «Crea istantanea» › «Ripristina come copia…» (components chosen) › «Ripristina come copia»                                                          |
| CA-87 | Esportazione della campagna JSON reimportabile e Markdown leggibile                | Kanka export con notifica di pronto; World Anvil export completo                               | SVC-084, CMP-210, CMP-217, CMP-220          | PROVEN · [audit/campaign-settings-data][ev-campaign-settings-data] | Dati › «Esporta e importa» › JSON or Markdown › «Prepara l’esportazione»                                                                                                               |
| CA-88 | Copiare elementi fra le proprie campagne                                           | Roll20 Transmogrifier con avviso di sovrascrittura                                             | R20-067                                     | PROVEN · [audit/reaudit3-c][ev-reaudit3-c]                         | «Copia in un’altra campagna…» found in: a handout's «Altro» (Preparazione › Materiali), a Diary entry's «Altro», an Archive page, a scene's «Altre azioni», the creature token menu ›… |

### Preparazione — scene, mappe, muri e luci

| ID    | Capacità                                                                    | Miglior pattern di riferimento                                                       | ID censimento                      | Stato                                                 | Dove si trova (blueprint, 30/09)                                                                                                                                                            |
| ----- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-01 | Scena vuota/preset/file con nome, note private e pubbliche, dimensioni      | Foundry configurazione scena; Owlbear scena infinita                                 | FVT-072, VTL-068                   | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Apri campagna → Preparazione → Nuova scena → nome → Crea bozza → (Descrizione per il gruppo, Note riservate ai DM, Larghezza/Altezza) →…                                                    |
| PR-02 | Griglia, scala e scostamento; calibrazione a due punti con misura nota      | Owlbear allineamento; Roll20 Align to Grid; DDB cerchio Medium e marcatori           | VTL-063, R20-088, DDB-106, FVT-073 | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | …→ Modifica scena → Calibra scala → clic punto A → clic punto B → scorrere sotto la mappa → «Distanza nota (m)» = 3 → Applica scala alla…                                                   |
| PR-03 | Allineamento guidato in tre passi con lente che si sposta dal dito          | Owlbear 2026: ancora, cella, rifinitura, "Avanti" sotto il cursore                   | VTL-063, R20-088                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Preparazione → Scene avanzate → Capitolo 1 → Apri scena → scheda Griglia e vista → «Allinea la griglia…» → 1                                                                                |
| PR-04 | Salva, Rivela e Attiva distinti, con anteprima                              | Foundry View/Activate/Preload; DDB Display/Hide Map                                  | FVT-074, DDB-111                   | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Editor → Salva preparazione → scheda Anteprima («Contenuto da rivelare al gruppo») → Rivela contenuto… → Tutto il gruppo → Salva…                                                           |
| PR-05 | Copia di una scena ed eliminazione protetta; Indietro protegge la bozza     | Roll20 duplica/archivia/elimina bloccata sulla pagina con giocatori                  | R20-085, CRP-070                   | PROVEN · [audit/reaudit][ev-reaudit]                  | «Scene e mappe» / Indietro del browser con modifiche non salvate → «Scartare le modifiche?»                                                                                                 |
| PR-06 | Cartelle o capitoli di scene, ricerca, archivio                             | Roll20 Page Menu con cartelle e breadcrumb; Monk's Scene Navigation per capitoli     | R20-084, FVT-107, DDB-102          | PROVEN · [final-review-completeness][ev-final-review] | Tutte le scene › Capitolo 2»)                                                                                                                                                               |
| PR-07 | Scena senza mappa (teatro della mente) con materiali e note                 | DDB Theater of the Mind organizer; Alchemy scena narrativa con mappa tattica interna | DDB-101, VTL-078                   | PROVEN · [audit/reaudit][ev-reaudit]                  | «Teatro della mente (senza mappa)»; palette «teatro»; no scale label at the Table.                                                                                                          |
| PR-08 | Varianti della stessa scena (giorno/notte, crollo)                          | Shard immagini alternative con spilli ancorati; Quest Portal switcher di varianti    | VTL-075, VTL-077, VTL-101          | PROVEN · [audit/reaudit][ev-reaudit]                  | «Varianti» tab in the editor.                                                                                                                                                               |
| PR-09 | Livelli 2D di un edificio con cambio piano                                  | Foundry V14 Scene Levels; XCOM rotella per piano                                     | FVT-080, FVT-081, CRP-118          | PROVEN · [audit/reaudit][ev-reaudit]                  | Scene avanzate → Apri scena → Livelli → Crea edificio a più piani… → Crea edificio → Aggiungi piano… → «Una scena esistente: La cripta»…                                                    |
| PR-10 | Oggetti di scena (adesivi, tile) con blocco, visibilità, tetti che sfumano  | Foundry tile con occlusione; DDB Sticker Browser; Roll20 Foreground                  | FVT-078, DDB-107, R20-097          | PROVEN · [audit/reaudit][ev-reaudit]                  | «Oggetti» tab in the editor.                                                                                                                                                                |
| PR-11 | Prefabbricati: salvare una selezione riusabile                              | Owlbear Prefabs (a loro volta scene modificabili); Token Attacher                    | VTL-081, FVT-085                   | PROVEN · solo test Node · [audit/reaudit][ev-reaudit] | (correzione, provata da test) `buildPrefab` keeps each object's lock; an inserted prefab keeps it (Owlbear Prefabs). Prefabs are in the Oggetti tab; editing a prefab returns to its scene. |
| PR-12 | Modifica in blocco ed elenco degli elementi della scena                     | Foundry V14 Placeables Palette e scheda; Owlbear Outliner                            | FVT-079, VTL-107                   | PROVEN · [audit/reaudit][ev-reaudit]                  | «Elenco della scena» with kind chips.                                                                                                                                                       |
| PR-13 | Area fuori mappa visibile solo al DM                                        | Roll20 oggetti fuori dai bordi                                                       | R20-091                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Off-map staging with «Dal bestiario (SRD 5.2.1)».                                                                                                                                           |
| PR-14 | Vista iniziale della scena                                                  | Owlbear Default View                                                                 | VTL-109                            | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Tavolo → zoom → pannello Scena → «Viste» → Imposta questa come vista iniziale                                                                                                               |
| PR-15 | Importare mappe UVTT/dd2vtt con muri, porte e luci modificabili             | Roll20 UVTT sul livello luci; Smoke & Spectre; Dungeondraft export                   | R20-089, R20-124, VTL-071, CMP-147 | PROVEN · [audit/reaudit][ev-reaudit]                  | «Nuova scena › Importa Universal VTT»; 3 lights editable; palette «dd2vtt».                                                                                                                 |
| PR-16 | Limite e validazione del file mappa con errore specifico                    | Owlbear WebP e avviso >20 MB; DDB contatore spazio                                   | VTL-064, SVC-174, DDB-106          | PROVEN · [audit/reaudit][ev-reaudit]                  | Size and limit named; «Riduci e converti in WebP» → 844 KB.                                                                                                                                 |
| PR-17 | Generazione procedurale di dungeon e arredo automatico                      | donjon, Watabou, Owlbear Crawl, Dungeon Alchemist                                    | CMP-137–142, CMP-148, VTL-102      | PROVEN · [audit/reaudit][ev-reaudit]                  | Preparazione → Genera… → scheda Dungeon (seme, dimensione, stanze, corridoi, porte, porte segrete) → Apri come bozza di scena                                                               |
| PR-18 | Rilevamento assistito di muri e nebbia                                      | Owlbear Forecast con strumento di correzione                                         | VTL-065                            | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Editor della torre → Rileva i muri… (accanto alla mappa) → Rileva i muri → Conferma ×2 → Aggiungi 2 muri confermati alla bozza → Salva…                                                     |
| PR-19 | Muri, porte e terreno difficile espliciti: clic-clic, drag, tastiera, undo  | Foundry Walls; Roll20 barriere                                                       | FVT-075, R20-092                   | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Editor → Muro → clic-clic (o trascina) · tastiera: frecce + Invio ×2 · Terreno difficile: trascina rettangolo · «Annulla ultima modifica…                                                   |
| PR-20 | Porte a chiave e segrete, stato e costo d'interazione                       | Foundry porte con icona solo se non segrete; DOS2 CD serratura                       | FVT-076, CRP-078                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Door lock DC, key, cost; «Scassina (CD 14)».                                                                                                                                                |
| PR-21 | Estremi modificabili e catene di segmenti                                   | Foundry Ctrl+clic a catena; AboveVTT estremi                                         | FVT-075, VTL-073                   | PROVEN · [audit/reaudit][ev-reaudit]                  | Wall chain; tool stays selected.                                                                                                                                                            |
| PR-22 | Tipi di barriera: unidirezionale, finestra, trasparente, terreno, illusoria | Foundry restrizioni per movimento/luce/vista/suono; FG LOS; Smoke                    | FVT-075, R20-120, VTL-071, VTL-073 | PROVEN · [audit/reaudit3-b][ev-reaudit3-b]            | I tipi sono al Tavolo → Nebbia e visione → Barriere: Muro, Finestra, Unidirezionale (con «Inverti lato»), Illusoria, Invisibile                                                             |
| PR-23 | Luci: raggio luminoso/fioco, colore, cono, accensione                       | Foundry Lighting; Roll20 luci pedina; Owlbear Dynamic Fog                            | FVT-077, R20-094, R20-121, VTL-070 | PROVEN · [audit/reaudit][ev-reaudit]                  | Trovate al Tavolo → occhio → lampadina (solo icona) → «Luce da posare» → clic → Luce intensa/fioca, Direzione (lanterna a lente), Colore…                                                   |
| PR-24 | Oscurità magica come fonte                                                  | Foundry darkness source                                                              | FVT-077                            | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Tavolo → Nebbia e visione → Luci → Oscurità (incantesimo) · 4,5 m → clic                                                                                                                    |
| PR-25 | Luce ambientale e ciclo giorno/notte                                        | Foundry transizioni sincronizzate; FG preset con maschere                            | FVT-159, R20-121, R20-095          | PROVEN · [audit/reaudit][ev-reaudit]                  | Tavolo → Scena → Visione → «Momento del giorno»: Giorno/Crepuscolo/Notte/Alba, «Passa al momento successivo»                                                                                |
| PR-26 | Diagnostica dell'illuminazione e "anteprima come pedina"                    | Roll20 pannello luci con conteggio fonti e anteprima                                 | R20-093                            | PROVEN · [audit/prep-scenes][ev-prep-scenes]          | Tavolo → pannello Scena → Visione → «Diagnostica luci» (pedine con visione, fonti 4/3 accese, oscurità 1, «Doran è al buio…») → «Vedi…                                                      |

### Preparazione — regioni, incontri, PNG, materiali, tesori, tabelle

| ID    | Capacità                                                                                                      | Miglior pattern di riferimento                                                          | ID censimento                               | Stato                                                 | Dove si trova (blueprint, 30/09)                                                                                                                              |
| ----- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PR-27 | Regioni con forma, eventi (entra/esce/inizio o fine turno) e visibilità                                       | Foundry Scene Regions con comportamenti                                                 | FVT-082, FVT-117                            | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Preparazione → chip «Regioni e trappole» → Disegna regione → trascina → configura → Salva regione                                                             |
| PR-28 | Elenco curato di azioni: costo movimento, testo, TS, condizione, teletrasporto, porta; probabilità; una volta | Monk's Active Tile Triggers; Roll20 Reactions con "Reaction ready"                      | FVT-084, R20-098, VTL-099, VTL-100          | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Finestra regione → «Azioni (in quest'ordine)»: Tiro salvezza, Danni, Condizione, Porta, Messaggio, Scale o passaggio                                          |
| PR-29 | Trappole riutilizzabili con rilevamento e disinnesco                                                          | (nostra F-036) su regioni                                                               | —                                           | PROVEN · [audit/reaudit][ev-reaudit]                  | Regione → Salva come trappola riutilizzabile → cambio scena → «Piazza in questa scena» → Salva                                                                |
| PR-30 | Scale e passaggi collegati fra scene                                                                          | Stairways; Owlbear Portals con conferma                                                 | FVT-086, VTL-100, VTL-073                   | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Trascino Doran su «Scale per la cripta» → pannello Creatura «Prendi il passaggio»                                                                             |
| PR-31 | Effetti ambientali applicati a ogni turno                                                                     | FG global effects                                                                       | R20-164                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «Condizioni della scena…» Bufera region over the map; palette «bufera».                                                                                       |
| PR-32 | Incontro preparato: PNG, posizioni, iniziativa; salvataggio distinto dall'avvio                               | DDB incontro per mappa; FG pedine di posizionamento                                     | DDB-097, R20-111                            | PROVEN · [audit/reaudit3-b][ev-reaudit3-b]            | Al Tavolo: Avvia combattimento → finestra «Prepara l'iniziativa» con il solo «Apri preparazione» → pagina della scena → Avvia incontro…                       |
| PR-33 | Difficoltà 2024 in tempo reale (Bassa/Moderata/Alta) con budget XP e gruppo                                   | Kobold+ strategia 2024 e pannello gruppo; DDB Maps; dnd5e Encounter actor               | CMP-106, CMP-107, DDB-097, FVT-089          | PROVEN · [final-review-completeness][ev-final-review] | Costruttore: pannello «Difficoltà 2024» con il gruppo della campagna o un gruppo tipo                                                                         |
| PR-34 | Catalogo di creature filtrabile con anteprima del blocco                                                      | DDB Monster picker (GS, tipo, taglia); Kobold+ filtri e scorciatoie                     | DDB-091, CMP-108, DDB-115, FVT-090          | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | «▸ nome» apre l'anteprima                                                                                                                                     |
| PR-35 | Quantità con iniziativa condivisa o individuale                                                               | DDB contatore +/- che condivide l'iniziativa                                            | DDB-093                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | «Iniziativa condivisa» switch in the encounter builder.                                                                                                       |
| PR-36 | Gruppi in attesa e rinforzi attivabili                                                                        | Battle Board gruppi "Staged"                                                            | VTL-085                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Costruttore: + Gruppo → «Rinforzi», In attesa → «Aggiungi al gruppo» = Rinforzi → aggiungi                                                                    |
| PR-37 | Libreria incontri: duplica, riavvia, riprendi                                                                 | DDB My Encounters; Kobold+ storico                                                      | DDB-095, DDB-096, CMP-111, CMP-118          | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | I miei incontri → Altre azioni → Duplica («Agguato al pozzo (copia)»)                                                                                         |
| PR-38 | Note, lettura ad alta voce e tesoro dell'incontro                                                             | DDB Summary/Treasure; Shieldmaiden promemoria bottino                                   | DDB-094, CMP-120                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Riassunto then Tesoro, 3 times: no character lost.                                                                                                            |
| PR-39 | Incontro dalle pedine già sulla mappa                                                                         | DDB "Add All Tokens" con lati automatici                                                | DDB-134                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Al Tavolo, in combattimento: pannello Incontro → «Aggiungi tutte le pedine»                                                                                   |
| PR-40 | Incontro casuale scalato sul gruppo                                                                           | FG `N*$PC`; Kobold+ genera                                                              | R20-112, CMP-110, CMP-117                   | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Genera incontro… → scheda Incontro (seme, gruppo, difficoltà, tipo, GS) → «Adatta a «Media»» → Salva come nuovo incontro                                      |
| PR-41 | PNG: crea, duplica, attacco, disposizione separata dai permessi                                               | (nostra) Inc.3                                                                          | —                                           | PROVEN · [audit/reaudit][ev-reaudit]                  | Palette «Crea PNG…».                                                                                                                                          |
| PR-42 | Blocco statistiche 2024 completo con modifica in linea e tiri cliccabili                                      | Roll20 NPC Stat Block 2024; DDB blocco con tiri; dnd5e habitat e tesoro                 | R20-102, DDB-146, DDB-168, FVT-090          | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Costruttore: ▸ Ogre → blocco 2024 (CA, Iniziativa, PF, TS, Equipaggiamento, Sensi, GS con PE e BC) → clic «Colpire +6» → Registra tiro                        |
| PR-43 | Testo del blocco convertito in azioni cliccabili                                                              | FG parser del testo; Shard monster actions                                              | R20-113, VTL-089                            | PROVEN · [audit/reaudit][ev-reaudit]                  | «Incolla riga del blocco» in the Table creature panel.                                                                                                        |
| PR-44 | Pedine numerate, PF tirati, nomi nascosti                                                                     | Token Mold; Clash! aggettivi al posto dei numeri                                        | FVT-094, VTL-120                            | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Costruttore «Al tavolo»: Numeri/Aggettivi, «Nascondi i nomi ai giocatori», PF «Tirati con dadi digitali» → Prepara nella scena                                |
| PR-45 | Pedina predefinita del personaggio vs servitore non collegato                                                 | Roll20 barre collegate/non collegate e "Apply Token Defaults"                           | R20-101, VTL-082                            | PROVEN · solo test Node · [audit/reaudit][ev-reaudit] | (correzione, provata da test) A unique linked creature reuses the same NPC across encounters; one already on the scene keeps its token (Roll20 linked token). |
| PR-46 | Pedina che carica il blocco salvato dal nome                                                                  | Clash! caricamento automatico; Game Master's Grimoire                                   | VTL-083, VTL-084                            | PROVEN · [audit/reaudit][ev-reaudit]                  | «Carica statistiche» on the Esploratore.                                                                                                                      |
| PR-47 | Equipaggiamento PNG che non porta bonus nel bottino                                                           | dnd5e "Gear" con copia pulita                                                           | FVT-092                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Incontro «Al tavolo» → Prepara il bottino → Tesori                                                                                                            |
| PR-48 | Materiale consultabile rivelato senza note del DM                                                             | (nostra) Inc.1                                                                          | —                                           | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Materiali → Mostra… → Mostra                                                                                                                                  |
| PR-49 | Handout: testo/immagine, parte per giocatori e parte per il DM                                                | Alchemy handout a schermo intero; Roll20 GM Notes                                       | VTL-080, R20-056                            | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Materiali → Nuovo handout (Titolo, Immagine, Testo per i giocatori, «Nota del DM                                                                              |
| PR-50 | Spilli sulla mappa collegati a voce o intestazione, nascosti di default                                       | Roll20 Map Pins con estratto per giocatori; DDB spilli DM semitrasparenti; Foundry note | R20-099, DDB-099, FVT-087, FVT-088, VTL-090 | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Materiali → Spilli → Nuovo spillo… (posizione, etichetta, tipo, «Collega a una voce o a un'intestazione», estratto dall'intestazione) →…                      |
| PR-51 | Spilli come promemoria del DM (negozio, trappola, stranezza)                                                  | DDB Scene Prep                                                                          | DDB-100                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Nuovo spillo → Tipo (Luogo, Negozio, Trappola, Stranezza, Tesoro), «Nessun collegamento (promemoria del DM)»                                                  |
| PR-52 | Scheda di preparazione della sessione con segreti riportati                                                   | Lazy DM otto passi (minimo tre); Notion modello a un clic; Kanka percorso di 30 minuti  | CMP-124–128, CMP-94, CMP-34                 | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Preparazione → Sessioni e avventure → Sessione (8 passi numerati, «Solo i passi essenziali») → Rivelato su un segreto → Chiudi la…                            |
| PR-53 | Schede di scelta narrative con immagine e opzioni                                                             | DOS2 GM Vignettes                                                                       | CRP-072                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Materiali → vignetta «Il carro rovesciato» → Mostra… → Mostra                                                                                                 |
| PR-54 | Pacchetti di tesoro (monete, oggetti, non identificati)                                                       | FG Parcels; Owlbear Loot!                                                               | R20-117, VTL-094                            | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Preparazione → Tutte → Tesori → Nuovo pacchetto → Oro 50 → Salva monete → Anello di protezione + Non identificato + nome apparente →…                         |
| PR-55 | Tesoro per incontro e tesoro accumulato                                                                       | AideDD; donjon                                                                          | CMP-116, CMP-135                            | PROVEN · [audit/reaudit][ev-reaudit]                  | Tesori: «Tesoro della campagna: da trovare 292 mo · già al gruppo 0 mo»                                                                                       |
| PR-56 | Mercante preparato con prezzi, scorte, sconto                                                                 | Roll20 Shop sheet; Monk's Shop; Shard negozio da elenco del libro                       | R20-103, FVT-095, VTL-097, CMP-136          | PROVEN · [audit/reaudit][ev-reaudit]                  | «Compra» ×3 → bar «3» in view at once.                                                                                                                        |
| PR-57 | Tabelle casuali: pesi, intervalli, sottotabelle, con o senza reinserimento                                    | Foundry Roll Tables con Normalize e blocchi; Chartopia intervalli impliciti             | FVT-097, CMP-129, CMP-130                   | PROVEN · [final-review-completeness][ev-final-review] | Preparazione → Materiali → Tabelle e mazzi → tabella → Estrai con dadi digitali                                                                               |
| PR-58 | Esito della tabella verso chat, diario, bottino o incontro                                                    | FG destinazione dell'esito; Better Rolltables                                           | R20-115, FVT-098                            | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Dopo l'estrazione: Invia in chat… / Aggiungi al diario… / Aggiungi al bottino… / Aggiungi a un incontro…                                                      |
| PR-59 | Tabelle a colonne, filtri e variabili d'ingresso                                                              | Chartopia filter e form; Owlbear Tables+                                                | CMP-131, CMP-132, VTL-092                   | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Estrazione: variabile «Stagione», «Filtra per testo» = goblin → Estrai                                                                                        |
| PR-60 | Generatori di testo da modelli                                                                                | FG Story Templates                                                                      | R20-116                                     | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Tabelle e mazzi → Modelli di testo → «Spunto per la palude» → Genera con dadi digitali                                                                        |
| PR-61 | Mazzi: crea, distribuisci, pesca, mani, scarti, mescola, mostra                                               | Foundry Cards; Roll20 decks e carte al tavolo                                           | FVT-099, R20-105, R20-149, VTL-098          | PROVEN · [audit/prep-encounters][ev-prep-encounters]  | Tavolo → Tabelle e mazzi → Mazzi → Mescola → Pesca per Doran → Pesca una carta → Gioca scoperta                                                               |
| PR-62 | Pedina a più facce generata da una tabella                                                                    | Roll20 multi-sided token                                                                | R20-104                                     | PROVEN · [audit/reaudit][ev-reaudit]                  | Tavolo: Strumenti del DM → Pedina a più facce (mostra solo un suggerimento in basso) → pannello Tabelle e mazzi → Tabelle → «Estrai da»…                      |

### Tavolo — strumenti della mappa e pedine

| ID    | Capacità                                                                           | Miglior pattern di riferimento                                                                        | ID censimento                               | Stato                                                  | Dove si trova (blueprint, 30/09)                                                                                                      |
| ----- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| TV-01 | Muovere con drag, clic o tastiera: anteprima gratuita, Esc, arresto al budget      | Foundry ruler con tappe e colori; BG3 linea del percorso                                              | FVT-108–111, CRP-114                        | PROVEN · [audit/reaudit][ev-reaudit]                   | Walls block drag, routes through the open door, empty drag pans, empty click deselects.                                               |
| TV-02 | Tappe private modificabili ed eseguibili; costo del terreno distinto               | Foundry Ctrl+clic tappa, clic destro rimuove; Roll20 Q tappa                                          | FVT-110, R20-135                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Seleziona e muovi» › «Pianifica percorso»                                                                                            |
| TV-03 | Avvicinamento automatico al bersaglio in mischia, senza Scatto implicito           | Arms Reach (portata); nostro percorso+attacco                                                         | FVT-115                                     | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Bastone ferrato» › clic sull'Esploratore                                                                                             |
| TV-04 | Porte al Tavolo: portata, stato, costo della prima interazione                     | Foundry porte con permesso; Arms Reach                                                                | FVT-076, FVT-115                            | PROVEN · [audit/reaudit][ev-reaudit]                   | «Porta · Chiusa · Distanza 1,1 m · Portata 1.5 m» › «Apri con Livia»                                                                  |
| TV-05 | Pan, zoom, centra scena; tocco su telefono                                         | DDB pan/zoom con widget e pinch                                                                       | DDB-120                                     | PROVEN · [audit/reaudit][ev-reaudit]                   | «Seleziona e muovi» › «Sposta vista» sposta la vista                                                                                  |
| TV-06 | Pinch, rotazione e gesti touch completi                                            | TouchVTT; Roll20 Table on Tablet (pressione lunga = menu)                                             | FVT-200, R20-211, SVC-115                   | PROVEN · [audit/reaudit][ev-reaudit]                   | Phone: one-finger pan, tokens one cell, status above the bar.                                                                         |
| TV-07 | Righello a due livelli: entro velocità e con Scatto                                | dnd5e verde/giallo/rosso; XCOM contorno blu/giallo                                                    | FVT-111, CRP-113                            | PROVEN · [final-review-completeness][ev-final-review]  | Stato: «Righello: blu con il movimento, giallo con lo Scatto, rosso fuori portata»                                                    |
| TV-08 | Storico del movimento nel turno e "ultima mossa"                                   | Foundry Clear Movement Histories; Roll20 X richiama l'ultimo movimento                                | FVT-112, FVT-113, R20-135                   | PROVEN · [audit/reaudit][ev-reaudit]                   | «Movimenti di questo turno (1) · Nuoto · 6,1 m · costo 9 m» › «Mostra l'ultima mossa»                                                 |
| TV-09 | Movimento fuori turno bloccato o su approvazione del DM (modalità della mappa)     | Not Your Turn; FG Token Locking con pannello di approvazione                                          | FVT-114, R20-168                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Livia propone un movimento · 3,4 m» › «Approva»                                                                                      |
| TV-10 | Geometria a griglia: diagonali, taglie, esagoni                                    | Roll20 regola diagonale; Solasta II esagoni con percorsi naturali                                     | R20-086, CRP-121                            | PROVEN · [audit/reaudit][ev-reaudit]                   | SRD grid default; rule links to «Griglia e misure».                                                                                   |
| TV-11 | Tenere premuto per mostrare etichette ed evidenziare pedine                        | BG3 Alt e backtick; Foundry Alt                                                                       | CRP-148, FVT-108                            | PROVEN · [audit/reaudit][ev-reaudit]                   | «?» shortcut guide lists Alt; status hint «tieni premuto Alt per le etichette».                                                       |
| TV-12 | Centrarsi sulle proprie pedine all'arrivo; Home ricentra                           | Roll20 QoL (richiesta più votata)                                                                     | R20-152, R20-214                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Il DM può impostare una «vista iniziale»                                                                                              |
| TV-13 | Posizioni di camera salvate                                                        | AboveVTT F1–F4; TTS numeri                                                                            | VTL-165                                     | PROVEN · [final-review-completeness][ev-final-review]  | Pannello Scena › «Viste personali                                                                                                     |
| TV-14 | Selezionare una pedina e aprirne scheda o dettagli                                 | Foundry clic seleziona, C apre la scheda; DDB clic sulla pedina                                       | FVT-108, DDB-116, DDB-133                   | PROVEN · [final-fixes][ev-final-fixes]                 | Tavolo: doppio clic sulla pedina apre la scheda completa (o la scheda Creatura se non la controlli)                                   |
| TV-15 | Selezione multipla a riquadro e con Shift, filtri per tipo                         | Roll20 riquadro con Ctrl/Alt/Shift per tipo; DDB strumento Select                                     | R20-130, DDB-118, FVT-108                   | PROVEN · [audit/reaudit][ev-reaudit]                   | Box select only enemies, all listed.                                                                                                  |
| TV-16 | Menu contestuale etichettato della pedina (clic destro, pressione lunga, tastiera) | DDB menu pedina ordinato con scorciatoie; Foundry Token HUD; FG menu etichettati al posto dei radiali | DDB-117, FVT-119, R20-129, R20-203, VTL-232 | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Clic destro: menu etichettato con campo PF, sottomenu numerati (Azioni 2, Aspetto 7, Visibilità 6, Strumenti DM 5) e scorciatoie      |
| TV-17 | PF in linea con aritmetica (+5, -3, =15)                                           | Roll20 bolle con valore relativo; Owl Trackers "=" per impostare                                      | R20-131, VTL-234, VTL-126                   | PROVEN · [final-review-completeness][ev-final-review]  | Ogni volta compare «PF 18 → 13 · Annulla»                                                                                             |
| TV-18 | Nascondi/rivela pedina (il DM la vede sbiadita)                                    | DDB Shift+H con occhio barrato; Owlbear icona occhio                                                  | DDB-117, VTL-145                            | PROVEN · [final-review-completeness][ev-final-review]  | Il DM la vede sbiadita con l'occhio barrato                                                                                           |
| TV-19 | Rinomina, nascondi nome, colore del bordo, taglia, blocco maniglie                 | DDB menu pedina; Quest Portal blocco ridimensiona/ruota                                               | DDB-117, VTL-150                            | PROVEN · [audit/reaudit][ev-reaudit]                   | Resize handle, fixed-size name.                                                                                                       |
| TV-20 | Raggruppare, bloccare, copiare e incollare elementi                                | DDB Shift+L/Shift+G e copia/incolla fra mappe                                                         | DDB-118, DDB-119                            | PROVEN · [audit/reaudit][ev-reaudit]                   | Ctrl+C/V after a click; grouped tokens move together.                                                                                 |
| TV-21 | Aggiungere e togliere pedine; togliere la pedina conserva la scheda                | (nostra) Inc.2; DDB Token Browser                                                                     | DDB-115                                     | PROVEN · [audit/reaudit][ev-reaudit]                   | Ho trovato la strada solo con Cerca › «goblin» › Goblin guerriero (apre la Biblioteca) › «Aggiungi a una scena…» › «Continua» › clic… |
| TV-22 | Visibilità per singolo giocatore                                                   | Smoke & Spectre "Spectre"; TTS zone per colore                                                        | VTL-143, VTL-187                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Visibilità › «Visibile solo a…» › «Solo alcuni personaggi» › Doran › «Applica» → «Visibile solo a Doran»                              |
| TV-23 | Aure ed emanazioni che seguono la pedina                                           | Auras and Emanations a griglia; Roll20 due aure                                                       | VTL-140, R20-133                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Aspetto › «Aura…»                                                                                                                     |
| TV-24 | Icone di condizione sulla pedina, sincronizzate con la scheda                      | DDB condizioni su pedina ↔ scheda; Roll20 Condition Sync; Condition Markers                           | DDB-145, R20-034, VTL-141, VTL-185          | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Clic destro › Condizioni › Avvelenato → «Applicata · Annulla»                                                                         |
| TV-25 | Stati visivi Sanguinante/Morto con opzione di nasconderli ai giocatori             | DDB effetto automatico a 50% e 0 PF; dnd5e anelli dinamici                                            | DDB-143, FVT-122, FVT-125, R20-178          | PROVEN · [audit/reaudit][ev-reaudit]                   | Enemy health hidden from players.                                                                                                     |
| TV-26 | Trovare la propria pedina; riga dell'elenco ↔ pedina                               | Monk's Find my token; Clash! doppio clic sulla riga                                                   | FVT-120, VTL-235                            | PROVEN · [audit/reaudit][ev-reaudit]                   | «Trova la mia pedina» → «Pedina trovata: Livia».                                                                                      |
| TV-27 | Scorrere le pedine da tastiera con nomi accessibili solo per il DM                 | Owlbear 2.1 Tab/Invio/frecce e nomi accessibili riservati                                             | SVC-167                                     | PROVEN · [audit/reaudit][ev-reaudit]                   | Il nome nascosto si legge «Creatura sconosciuta 1»                                                                                    |
| TV-28 | Immagini alternative della pedina                                                  | Changr; Token Variant Art anche per stato                                                             | VTL-104, FVT-105                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Aspetto › «Immagini della pedina…» › «Ferita»                                                                                         |
| TV-29 | Pedine controllate sempre sopra oscurità e oggetti                                 | Roll20 V o impostazione                                                                               | R20-153                                     | PROVEN · [audit/reaudit][ev-reaudit]                   | Own tokens keep initial and name above darkness.                                                                                      |

### Tavolo — visione, misura e sagome

| ID    | Capacità                                                                         | Miglior pattern di riferimento                                                                              | ID censimento                               | Stato                                                  | Dove si trova (blueprint, 30/09)                                                                                                |
| ----- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| TV-30 | Nebbia manuale: copri tutto, rivela a pennello o poligono, anteprima giocatore   | DDB Fog (taglie del pennello come le creature); Owlbear modalità Fit/Join/Trim e anteprima; Roll20 maschera | DDB-121, VTL-066, VTL-067, R20-096, FVT-101 | PROVEN · [audit/reaudit][ev-reaudit]                   | Fog polygon closes on double-click with no leftover outline; panel folds.                                                       |
| TV-31 | Visione dinamica dai muri con i sensi della scheda                               | FG visione dai sensi e effetti VISION; Foundry modalità di visione                                          | R20-122, FVT-121, VTL-142                   | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Scena › Visione                                                                                                                 |
| TV-32 | Memoria dell'esplorato per giocatore, modificabile e azzerabile                  | Roll20 Explorer Mode; Smoke persistenza con reset                                                           | R20-095, VTL-142                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Aree esplorate»: Livia 64% → «Azzera» → 31% (resta ciò che vede ora)                                                           |
| TV-33 | Visione di gruppo condivisa o per giocatore                                      | Shard opzione; FG party vision; Foundry V14 shared fog                                                      | VTL-074, R20-169, FVT-160                   | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Con «Visione condivisa dal gruppo» accesa la vede                                                                               |
| TV-34 | Aggiornare la visione solo al rilascio (un teletrasporto non rivela il percorso) | Roll20 "update on drop"                                                                                     | R20-095                                     | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Con l'opzione spenta l'esplorato di Livia va da 31% a 64%, con «Aggiorna la visione solo all'arrivo» accesa va a 60%            |
| TV-35 | Il DM controlla che cosa vede una pedina                                         | AboveVTT Shift+V; Roll20 "preview as token"                                                                 | VTL-144, R20-093                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Banner «Vista di Doran: nebbia opaca come per il giocatore · Torna alla vista del DM»                                           |
| TV-36 | Misura separata dal movimento, privata                                           | DDB righello privato; Owlbear temporaneo vs fissato                                                         | DDB-124, VTL-135                            | PROVEN · [audit/reaudit][ev-reaudit]                   | Finger measure label above the finger.                                                                                          |
| TV-37 | Misura con forme e condivisione attivabile; righello a segmenti                  | Roll20 Measure (cono, cerchio, broadcast); Quest Portal; Segmentable Ruler                                  | R20-136, VTL-148, VTL-134                   | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Solo per te» diventa «Condivisa con il tavolo»: il DM vede «Livia: 15,2 m · 2 tratti»                                          |
| TV-38 | Anelli di gittata con temi per daltonismo                                        | Owlbear Ranges                                                                                              | VTL-136                                     | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]  | «Tema dei colori»: Deuteranopia, Protanopia, Tritanopia                                                                         |
| TV-39 | Elenco delle distanze con elevazione                                             | Battle Board; Character Distances                                                                           | VTL-137                                     | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Pannello Creatura › «Distanze»                                                                                                  |
| TV-40 | Area d'effetto: posiziona, orienta, conferma, alleati inclusi                    | Foundry template; BG3; DDB Overlays                                                                         | FVT-116, DDB-123                            | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Cono che segue il cursore, «Creature note coinvolte: Doran» (alleato incluso), «Riorienta area»                                 |
| TV-41 | Sagome persistenti con colore e motivo del tipo di danno, nascoste o bloccate    | DDB Overlays con 15 motivi e visibilità; Foundry template che si attacca alla pedina                        | DDB-123, DDB-118, FVT-116, VTL-139          | PROVEN · [audit/table-map-vision][ev-table-map-vision] | «Motivo» per tipo di danno (fiamme per il Fuoco), colore, «Nuove nascoste ai giocatori»                                         |
| TV-42 | Area che applica effetti a chi entra o esce                                      | dnd5e 6.0 aree con comportamenti                                                                            | FVT-117                                     | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Configurazione: «Quando» (entra, esce, inizio o fine del turno), chi, probabilità, una volta sola, azioni (TS, danni con tipo,… |
| TV-43 | Anteprima di copertura e fiancheggiamento alla destinazione                      | XCOM scudi di copertura (adattato a ½, ¾, totale 2024)                                                      | CRP-116                                     | PROVEN · [audit/table-map-vision][ev-table-map-vision] | Durante il trascinamento: «Copertura qui · Sentinella: ½ · Esploratore: scoperta»                                               |
| TV-44 | Verifica della linea di vista con copertura parziale                             | Peekaboo linee bianca/gialla/rossa, privata o pubblica                                                      | VTL-138                                     | PROVEN · [final-review-completeness][ev-final-review]  | «Misura e sagome»: Misura, «Righello a due livelli», «Linea di vista», Sagoma                                                   |

### Tavolo — combattimento, azioni e reazioni

| ID     | Capacità                                                                              | Miglior pattern di riferimento                                                               | ID censimento                      | Stato                                                       | Dove si trova (blueprint, 30/09)                                                                                                                                                                                             |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-45  | Avvio/fine combattimento, turni, round, termina turno                                 | Foundry Combat Tracker; DDB Next e undo                                                      | FVT-127, DDB-137                   | PROVEN · [final-review-completeness][ev-final-review]       | «Avvia combattimento» › «Tira tutti» › «Inizia combattimento» → combat active, order sorted                                                                                                                                  |
| TV-46  | Iniziativa digitale o fisica, ordina, rilancia, scarta, annulla, registro             | DDB iniziativa dalla scheda che riordina; Foundry Roll All                                   | DDB-135, DDB-136, FVT-127          | PROVEN · [final-review-completeness][ev-final-review]       | «Avvia combattimento» › «Tira tutti» › «Inizia combattimento» → combat active, order sorted                                                                                                                                  |
| TV-47  | Ritratti dell'ordine d'iniziativa in alto                                             | BG3 barra dei ritratti; DDB bandiere; Carousel                                               | CRP-090, DDB-137, FVT-134          | PROVEN · [audit/table-combat][ev-table-combat]              | Barra dei ritratti sopra la mappa, con «Turno attuale» evidenziato                                                                                                                                                           |
| TV-48  | Combattenti nascosti che non trapelano mai                                            | DDB: l'ordine dei giocatori resta sul precedente; Monk's nemici nascosti fino al primo turno | DDB-138, FVT-128, FVT-133          | PROVEN · [audit/reaudit][ev-reaudit]                        | Hidden goblin's end of turn DM-only.                                                                                                                                                                                         |
| TV-49  | Lettere automatiche per i duplicati                                                   | DDB A–Z a inizio combattimento; Roll20 Enumerate                                             | DDB-139, R20-134                   | PROVEN · [audit/table-combat][ev-table-combat]              | Clic destro sulla pedina › «Strumenti DM» › «Copia» › «Incolla qui»                                                                                                                                                          |
| TV-50  | Arrivi a metà combattimento in corsia d'attesa                                        | DDB Pending lane; Shieldmaiden lista inattivi                                                | DDB-140, CMP-168                   | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]       | (correzione, provata da test) `encounter-builder-domain.joinCombat` reads the latest initiative row (`findLast`, like `initiativeOf`) and inserts by total. Test: Sentinella A corrected to 20 stays before Sentinella B 11. |
| TV-51  | Togliere dal combattimento vs eliminare; sconfitto                                    | DDB Remove from Combat; Foundry defeated                                                     | DDB-141, FVT-128                   | PROVEN · [final-review-completeness][ev-final-review]       | Tracker › «⋯» › «Segna sconfitta»                                                                                                                                                                                            |
| TV-52  | Iniziativa di gruppo per PNG uguali come opzione con fonte                            | dnd5e raggruppamento; Improved Initiative; DDB copie condivise                               | FVT-130, CMP-158, VTL-121, DDB-093 | PROVEN · [final-review-completeness][ev-final-review]       | «Goblin guerriero A, B · Un solo tiro per il gruppo» splits and joins (`residuals-b`)                                                                                                                                        |
| TV-53  | Avvisi "tocca a te/sei il prossimo" e indicatore sotto la pedina                      | Monk's Combat Details; Foundry marker animato; TTS suono e stella                            | FVT-129, FVT-133, CRP-093, VTL-188 | PROVEN · [final-fixes][ev-final-fixes]                      | Tavolo: all'inizio del turno la barra e la scheda Creatura passano alla creatura di turno che controlli                                                                                                                      |
| TV-54  | Azioni e resistenze leggendarie con promemoria                                        | dnd5e ricarica e pulsante di spesa sul TS fallito                                            | FVT-131, CRP-143                   | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]       | (correzione, provata da test) `D.blockLegendary` prefills Legendary Actions and Legendary Resistance in «Leggendarie e ricarica…» from the linked block's traits («Legendary Resistance (3/Day)», «Legendary Action Uses:…   |
| TV-55  | Ricarica dei PNG a inizio turno e azioni di tana                                      | dnd5e ricarica automatica; DDB voci manuali nel tracker                                      | FVT-132, DDB-147                   | PROVEN · [audit/table-combat][ev-table-combat]              | «Voce del tracker…» › «Promemoria a ogni round» al conteggio 20                                                                                                                                                              |
| TV-56  | Voci personalizzate nel tracker (conti alla rovescia, eventi)                         | Roll20 voci con formula per round                                                            | R20-141, DDB-147                   | PROVEN · [final-review-completeness][ev-final-review]       | Tracker › «Voce del tracker…» › nome, conteggio, «Conto alla rovescia», «Fra quanti round», «Chi la vede» › «Salva la voce»                                                                                                  |
| TV-57  | Automatismi del turno: salta morti/nascosti, ferma a inizio round, suono              | FG Options Combat                                                                            | R20-165, CMP-161                   | PROVEN · [audit/table-combat][ev-table-combat]              | Tracker › «Impostazioni» › «Salta le creature sconfitte»                                                                                                                                                                     |
| TV-58  | Reset vs Svuota e procedura di fine incontro (XP, tesoro, registro)                   | Clash! Reset/Clear; Shard Finish encounter                                                   | VTL-117, VTL-155                   | PROVEN · [final-review-completeness][ev-final-review]       | Tracker › «Reimposta…»                                                                                                                                                                                                       |
| TV-59  | Attacchi di più creature con un comando                                               | Mob Attack Tool; Shard gruppi di selezione                                                   | FVT-137, VTL-123, CMP-174          | PROVEN · [final-review-completeness][ev-final-review]       | group turn enabled mid-turn lists both goblins; one «Turno successivo» passes the group                                                                                                                                      |
| TV-60  | Timer facoltativo del turno                                                           | Improved Initiative; AboveVTT                                                                | VTL-128, VTL-166                   | PROVEN · [final-review-completeness][ev-final-review]       | Tracker › «Impostazioni» › «Timer del turno»                                                                                                                                                                                 |
| TV-61  | Politica delle reazioni per personaggio: attiva, Chiedi o Automatico                  | BG3 scheda Reazioni con "Ask"                                                                | CRP-138, CRP-044                   | PROVEN · [audit/table-combat][ev-table-combat]              | Tracker › «Le tue reazioni» › «Cambia nella scheda» (si esce dal Tavolo) › in fondo alla scheda: sezione «Reazioni» con «Attiva» e…                                                                                          |
| TV-62  | Arma o trucchetto: anteprima, bersaglio, tiro digitale al clic o fisico dichiarato    | BG3 anteprima; dnd5e CA del bersaglio sulla carta                                            | CRP-126, FVT-140                   | PROVEN · [audit/table-combat][ev-table-combat]              | Barra › «Dardo di fuoco» › pannello «Preparazione privata» (costo, gittata, dadi, circostanze) › passaggio sul bersaglio: «Mezza…                                                                                            |
| TV-63  | Più bersagli con assegnazione (Dardo incantato)                                       | (nostra) Inc.2                                                                               | —                                  | PROVEN · [audit/table-combat][ev-table-combat]              | «Dardo incantato» › clic sulle creature (± per ciascuna) › «Lancia Dardo incantato»                                                                                                                                          |
| TV-64  | Scatto, Schivata, Disimpegno                                                          | Solasta conferma con descrizione; anteprima dello Scatto                                     | CRP-111, CRP-112                   | PROVEN · [audit/reaudit][ev-reaudit]                        | Dodge icon and effects list.                                                                                                                                                                                                 |
| TV-65  | Carta di risultato con passo successivo, critici e dettaglio                          | dnd5e chat card; Shard roll card con Vantaggio/Critico/Danno                                 | FVT-138, VTL-152, VTL-153          | PROVEN · [audit/table-combat][ev-table-combat]              | «[20] + 2 = 22 Colpo critico» › prossimo passo «Risolvi tiro» con i dadi di danno raddoppiati (2d6) › dettaglio in «Tiri e risultati»                                                                                        |
| TV-66  | Correzione che restituisce le conseguenze e riapre la richiesta                       | Damage Log; Shieldmaiden undo dell'ultima voce                                               | FVT-144, CMP-175                   | PROVEN · [audit/table-combat][ev-table-combat]              | «Tiri e risultati» › «Annulla» (la Sentinella torna viva, la richiesta si riapre) › «Riapplica risultato noto» › «Correggi una…                                                                                              |
| TV-67  | Barra delle azioni per tema e risorsa                                                 | BG3 hotbar raggruppata; Argon Combat HUD; Token Action HUD                                   | CRP-098, CRP-099, FVT-135, FVT-136 | PROVEN · [audit/reaudit][ev-reaudit]                        | Action bar grouped ARMI / INCANTESIMI / COMUNI with cost filter.                                                                                                                                                             |
| TV-68  | Anteprima dei danni per bersaglio con resistenze/immunità attivabili e moltiplicatori | dnd5e damage tray (chip per difesa, ×¼ ½ 1 2); Shieldmaiden colpito/metà/doppio              | FVT-139, CMP-172, CMP-173, VTL-164 | PROVEN · [audit/reaudit][ev-reaudit]                        | Oppure se Impostazioni della campagna › «Livello di automazione» = «Assistito»                                                                                                                                               |
| TV-69  | I giocatori propongono danni o condizioni, il DM accetta                              | Improved Initiative suggerimenti; Effective Tray                                             | VTL-129, CMP-163, FVT-143          | PROVEN · [audit/reaudit][ev-reaudit]                        | Bell «Accetta e applica» in one click (Sentinella 7 → 4).                                                                                                                                                                    |
| TV-70  | Oggetto con più attività e dialogo d'uso (consumo, livello, sagoma)                   | dnd5e Activities con Shift per la primaria                                                   | FVT-017, FVT-018                   | PROVEN · [audit/reaudit][ev-reaudit]                        | Wand usable from the Table creature panel and the quick bar.                                                                                                                                                                 |
| TV-71  | Afferrare, spingere, saltare con anteprima, lanciare, arrampicarsi, volare, cadere    | BG3 anteprima di spinta e salto; dnd5e caduta                                                | CRP-107, CRP-108, CRP-109, FVT-145 | PROVEN · [audit/reaudit][ev-reaudit]                        | «Cadere» in Mosse speciali.                                                                                                                                                                                                  |
| TV-72  | Aiutare, Nascondersi, Cercare, Studiare, Influenzare, Usare                           | DDB azioni generiche 2024; BG3 ricerca con elenco                                            | DDB-039, CRP-133                   | PROVEN · [final-review-completeness][ev-final-review]       | «Mosse» › «Azioni generiche 2024» › «Cerca» › tabella «Percezione» › «Esegui: Cerca» › «Registra tiro» › «Non trova nulla di nascosto…                                                                                       |
| TV-73  | Knock-out non letale a 0 PF                                                           | BG3 interruttore (adattato alla scelta 2024)                                                 | CRP-105                            | PROVEN · [audit/table-combat][ev-table-combat]              | «Bastone ferrato» › casella «Colpo non letale…» › clic sul bersaglio › «Knockout                                                                                                                                             |
| TV-74  | Motivo per cui un'azione non è disponibile                                            | BG3 messaggi di indisponibilità                                                              | CRP-103                            | PROVEN · [audit/reaudit][ev-reaudit]                        | Solo dopo il clic, nel pannello, compare «Azione già spesa.»                                                                                                                                                                 |
| TV-75  | Modificatori situazionali elencati sotto il bersaglio                                 | BG3 modificatori sotto la barra PF; FG preset di modificatori                                | CRP-119, R20-126                   | PROVEN · [audit/table-combat][ev-table-combat]              | Mentre punto: chip «Mezza copertura · CA +2» sotto la pedina ed elenco «Motivi del tiro»                                                                                                                                     |
| TV-76  | Probabilità di successo, solo se la campagna lo consente                              | BG3 % al passaggio; XCOM anteprima                                                           | CRP-126, CRP-128, CRP-127          | PROVEN · [audit/reaudit][ev-reaudit]                        | Sta in Preferenze (icona in alto) › «Conoscenza e probabilità (divulgazione)» › «Sempre (come BG3)» › «Salva preferenze»                                                                                                     |
| TV-77  | Opportunità lungo il percorso con richiesta al controllore                            | BG3 freccia sul percorso; nostra richiesta                                                   | CRP-115                            | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]       | «Apri richieste · 1» › «Scegli» › «Effettua attacco»                                                                                                                                                                         |
| TV-78  | Scudo dopo il colpo, con rinuncia e costi solo all'uso                                | BG3 prompt di reazione                                                                       | CRP-138, CRP-139                   | PROVEN · [audit/table-combat][ev-table-combat]              | «Apri richieste · 1» › «Scegli» › «Livia · Scudo» (slot, «Rinuncia per questa occasione» che non spende) › «Usa Scudo» › «Livia · Mancato»                                                                                   |
| TV-79  | Concentrazione su danno con TS                                                        | dnd5e richiesta con CD; FG effetti (C)                                                       | FVT-031, R20-163                   | PROVEN · [audit/reaudit3-b][ev-reaudit3-b]                  | «Condizioni e stato» › «Aggiungi condizione» non offre «Concentrazione»                                                                                                                                                      |
| TV-80  | Occasioni simultanee ordinate e risolte una alla volta                                | BG3 prompt raggruppato                                                                       | CRP-139                            | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]       | (correzione, provata da test) «Reazioni da scegliere» shows one reaction at a time; the simultaneous ones wait in line, named (DDB). Reach follows the scene's distance rule like every range check: on the SRD grid a…      |
| TV-81  | Nessun timeout implicito delle reazioni                                               | BG3 senza timer vs Solasta clessidra                                                         | CRP-140                            | PROVEN · [audit/table-combat][ev-table-combat]              | «Esc o Riduci conserva la richiesta senza rispondere»                                                                                                                                                                        |
| TV-82  | Preparare un'azione (Ready) con innesco                                               | Solasta II Ready                                                                             | CRP-141                            | PROVEN · [audit/reaudit][ev-reaudit]                        | Ready Magic Missile with a slot and Concentration.                                                                                                                                                                           |
| TV-83  | Finestre pre-tiro e post-tiro per bonus (Ispirazione, Fortuna)                        | BG3 "Add Bonus" prima e "Roll Again" dopo (tempistica della singola capacità)                | CRP-131, CRP-031                   | PROVEN · [audit/reaudit3-b][ev-reaudit3-b]                  | «Aggiungi bonus» before; with Heroic Inspiration the attack stops at «Usa Ispirazione eroica: ritira il d20» / «Continua»; reroll spends it, «Continua» keeps it.                                                            |
| TV-84  | Durate degli effetti con scadenza e avviso a tutti                                    | FG ancore di durata; Clash! avviso alla scadenza                                             | R20-161, VTL-118, FVT-167          | PROVEN · [audit/reaudit][ev-reaudit]                        | Dodge expires at the next turn with a log line.                                                                                                                                                                              |
| TV-85  | Pannello effetti attivi della pedina selezionata                                      | Visual Active Effects; BG3 icone con durata                                                  | FVT-165, CRP-198                   | PROVEN · [audit/reaudit][ev-reaudit]                        | Effects list in the creature panel.                                                                                                                                                                                          |
| TV-149 | Sorpresa a inizio combattimento: il sorpreso tira l'iniziativa con svantaggio         | BG3 e Solasta agguati; SRD 5.2.1 «Surprise» EN 189 / IT 216                                  | revisione finale B1                | PROVEN · [final-fixes][ev-final-fixes]                      | Tavolo › «Avvia combattimento» › «Sorpreso» su ogni riga (anche nell'incontro salvato)                                                                                                                                       |
| TV-150 | Bersaglio persistente visibile al gruppo, riusato da attacco, danno e aree            | Foundry «Target» (tasto T) con i segnali nel colore del giocatore                            | revisione finale B2                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Oggi il bersaglio esiste solo dentro un attacco in preparazione                                                                                                                                                              |
| TV-151 | Tiri dentro i messaggi di chat «[[1d8+3]]»                                            | Roll20 e Foundry tiri inline                                                                 | revisione finale B3                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Chat: «/r» apre il vassoio dei dadi; il testo «[[…]]» resta testo                                                                                                                                                            |
| TV-152 | Barre di risorse sulla pedina oltre ai PF                                             | Foundry barra 1/2 legate a un attributo; Roll20 tre barre                                    | revisione finale B4                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Menu della pedina › Aspetto non ha barre; le risorse sono nella hotbar                                                                                                                                                       |

### Tavolo — dadi, registro, chat e presentazione

| ID     | Capacità                                                                        | Miglior pattern di riferimento                                                                       | ID censimento                                        | Stato                                                    | Dove si trova (blueprint, 30/09)                                                                                                                                                                                          |
| ------ | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| TV-86  | Dado digitale o faccia fisica + modificatore, correzione motivata               | Foundry per dado: digitale, manuale o Bluetooth; FG Manual Dice Entry                                | FVT-153, R20-173, VTL-031                            | PROVEN · [final-review-completeness][ev-final-review]    | Tavolo › «Tira i dadi» (icona d20 nella barra) › «Dadi: Fisici» › «Arcano +3» › finestra «Facce del dado fisico» › 14 › «Registra il tiro»                                                                                |
| TV-87  | Registro persistente con dettaglio per dado e provenienza                       | DDB Game Log unificato; BG3 registro con dettaglio al passaggio                                      | DDB-148, CRP-129, CRP-130, SVC-107                   | PROVEN · [audit/reaudit][ev-reaudit]                     | Log card keeps rule, strikes dropped die, «Dettagli» with Ritira.                                                                                                                                                         |
| TV-88  | Vassoio dadi libero con formula, vantaggio, modificatori                        | DDB dice tray; Dice Tray; Roll20 roller con ultimi 10                                                | DDB-151, FVT-156, R20-142, VTL-113                   | PROVEN · [final-review-completeness][ev-final-review]    | «Tira i dadi» › Formula (pulsanti d4…d100, −1/+1, Svuota) › Modalità Normale/Vantaggio/Svantaggio/Critico › «Tira …» oppure Invio                                                                                         |
| TV-89  | Menu del tiro: vantaggio, svantaggio, piatto, critico, con alternativa visibile | DDB clic destro/pressione lunga; Alchemy d20 trascinato su/giù                                       | DDB-150, VTL-163, VTL-032                            | PROVEN · [final-review-completeness][ev-final-review]    | right-click «Dardo di fuoco» → vantaggio/svantaggio/normale/«Danno critico», «Chi vede» with 4 audiences                                                                                                                  |
| TV-90  | Destinatari del tiro: tutti, io, DM, io+DM, predefinito e per singolo tiro      | DDB selettore nel registro; Dice+ icona persona; Foundry quattro modalità                            | DDB-149, VTL-173, FVT-150, R20-143                   | PROVEN · [audit/reaudit][ev-reaudit]                     | «…» › «Tira per                                                                                                                                                                                                           |
| TV-91  | Tiro nascosto che si annuncia; rivelazione successiva a tutti o a uno           | Bones!; FG trascina il risultato su un giocatore; Foundry "reveal"                                   | VTL-172, R20-172, FVT-150                            | PROVEN · [final-review-completeness][ev-final-review]    | «…» › «Solo il DM»                                                                                                                                                                                                        |
| TV-92  | Richiesta di tiro del DM (prova/TS/CD) come carta con riepilogo dei risultati   | dnd5e enricher "request"; Monk's TokenBar; FG tiri di gruppo contro CD                               | FVT-146, FVT-147, R20-078, VTL-164                   | PROVEN · [final-review-completeness][ev-final-review]    | «Tira i dadi» › «Richieste» › «Al gruppo», TS, Destrezza, CD 13, destinatari › «Invia la richiesta»                                                                                                                       |
| TV-93  | Tiri contrapposti                                                               | Monk's TokenBar                                                                                      | FVT-147                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Richieste › «Contrapposto» › prima e seconda creatura con le abilità › «Invia la richiesta»                                                                                                                               |
| TV-94  | Dadi animati condivisi e disattivabili; versione 2D leggera                     | DDB Shared Dice "un tiro = un risultato"; Shard 2D solo per chi tira; Dice So Nice                   | DDB-152, VTL-157, FVT-155, SVC-172                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Dadi › «Aspetto e prova» › «3D condivisi / 2D leggeri                                                                                                                                                                     |
| TV-95  | Dadi intelligenti Bluetooth                                                     | Pixels; Foundry provider esterno                                                                     | VTL-176, FVT-153                                     | PROVEN · simulazione · [audit/reaudit3-b][ev-reaudit3-b] | Simulated Pixels pairing, per-die method, tray roll and attack «Dado connesso» wait and land as a physical die named in the Registro (real Bluetooth: owner).                                                             |
| TV-96  | Pila di modificatori situazionali preimpostati dal DM                           | FG Standard Modifiers con visibilità                                                                 | R20-126, R20-174                                     | PROVEN · [audit/reaudit][ev-reaudit]                     | Hidden prepared modifier logged for the DM only.                                                                                                                                                                          |
| TV-97  | Sintassi dei dadi avanzata (tieni/scarta, esplode, successi)                    | Foundry dice modifiers                                                                               | FVT-152                                              | PROVEN · [final-review-completeness][ev-final-review]    | «10d6cs>=5» › Invio                                                                                                                                                                                                       |
| TV-98  | Avviso dei tiri altrui a registro chiuso                                        | DDB notifica; Quest Portal annuncio                                                                  | DDB-153, VTL-147                                     | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Arrivano le notifiche «Novità nel registro» («Livia · Prova di Saggezza… 13 · Apri il registro») e un numero sull'icona della chat                                                                                        |
| TV-99  | Messaggi in personaggio, fuori personaggio, azioni; parlare come personaggio    | Foundry /ic /ooc /em con fumetti; Roll20 speak-as; Quest Portal ritratto                             | FVT-065, R20-145, VTL-171                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Chat › «Dialogo / Azione / Fuori personaggio» + «Personaggio                                                                                                                                                              |
| TV-100 | Sussurri a un utente o a un personaggio                                         | Foundry /w con permesso; Roll20 whisper al personaggio; Alchemy carta privata                        | FVT-065, R20-146, VTL-170                            | PROVEN · [final-review-completeness][ev-final-review]    | Chat › «A: Sussurro a DM / Doran / Mira» › Invia                                                                                                                                                                          |
| TV-101 | Lingue: testo illeggibile a chi non le conosce                                  | Polyglot; Roll20 sussurro al personaggio                                                             | FVT-067, R20-146                                     | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Parla come: Doran» › «Lingua                                                                                                                                                                                             |
| TV-102 | Immagini in chat e condivisione di una voce come carta                          | Chat Images; Shard "share to chat"                                                                   | FVT-068, VTL-158                                     | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Chat › «Immagine» (file o incolla) › Invia · «Condividi» › voce della scheda › destinatari › «Condividi»                                                                                                                  |
| TV-103 | Narrazione del DM e dialoghi dei PNG                                            | Roll20 /desc e /as; Theatre Inserts; Owlbear Theatre! con raggio udibile                             | R20-145, FVT-070, VTL-168                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Chat DM › «Narrazione» (predefinita) oppure «Dialogo» › «Parla come: … / PNG con nome…» › «Si sente                                                                                                                       |
| TV-104 | Il DM nasconde o elimina messaggi                                               | Roll20; Alchemy                                                                                      | R20-145, VTL-170                                     | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «⋯» sul messaggio › «Nascondi ai giocatori» / «Elimina…»                                                                                                                                                                  |
| TV-105 | Voto rapido e stato d'animo                                                     | FG /vote e /mood; Solasta II voto di gruppo (facoltativo)                                            | R20-171, CRP-053                                     | PROVEN · [audit/reaudit][ev-reaudit]                     | «Tono» selector beside the message type.                                                                                                                                                                                  |
| TV-106 | Attivare la scena per i giocatori separatamente dal salvataggio                 | Foundry Activate; DDB Display Map                                                                    | FVT-074, DDB-111                                     | PROVEN · [audit/reaudit][ev-reaudit]                     | «Altre azioni» › «Attiva al Tavolo…» › «Attiva per il gruppo»                                                                                                                                                             |
| TV-107 | Cancello di presentazione: messaggio d'attesa, pausa, fine                      | DDB Start/Pause/End con messaggi distinti e consigli d'attesa                                        | DDB-111, SVC-103, DDB-006                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Sessione» › messaggio d'attesa › «Salva messaggio» › «Avvia sessione» › «Metti in pausa» / «Termina sessione…»                                                                                                           |
| TV-108 | Mostrare un'immagine o un handout a tutti o a scelti; riaprirlo dopo            | Foundry Show Players; DDB Reveals Browser e drop; Alchemy pannello handout; Roll20 trascina sul nome | FVT-162, DDB-129, DDB-131, VTL-162, R20-055, R20-139 | PROVEN · [final-review-completeness][ev-final-review]    | Barra laterale › Diario › «Materiali» › «Mostra…» › «Solo alcuni personaggi: Livia» › «Mostra»                                                                                                                            |
| TV-109 | Rivelare l'arte di una creatura dalla sua pedina                                | DDB Reveal accanto al blocco statistiche                                                             | DDB-130                                              | PROVEN · [audit/reaudit][ev-reaudit]                     | Own art preselected, shared and revealed in one step.                                                                                                                                                                     |
| TV-110 | Vista spettatore o schermo condiviso senza interfaccia                          | DDB Spectator View; Monk's Common Display; Owlbear Cast; Encounter+ AirPlay                          | DDB-132, FVT-163, VTL-159, CMP-187, CMP-189          | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Sessione» › «Apri vista spettatore»                                                                                                                                                                                      |
| TV-111 | Nascondere tutta l'interfaccia                                                  | Owlbear scorciatoia; BG3 F10                                                                         | VTL-191, CRP-196                                     | PROVEN · [final-review-completeness][ev-final-review]    | il nome «Nascondi interfaccia (Ctrl+Maiusc+H)» appare solo come descrizione) › «Mostra interfaccia» o la stessa scorciatoia                                                                                               |
| TV-112 | Il DM vede e agisce come un giocatore specifico, con etichetta nel registro     | Roll20 Player View con banner e reset dell'esplorato; Alchemy "play as"                              | R20-128, VTL-044                                     | PROVEN · [audit/reaudit][ev-reaudit]                     | «Gioca per un giocatore assente» → banner «Giochi per Livia».                                                                                                                                                             |
| TV-113 | Giocatori connessi e presenza (qui, assente, messaggio)                         | DDB Connected Players; Alchemy stati di presenza                                                     | DDB-114, VTL-043, SVC-104, SVC-108                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Gruppo ●●» sulla mappa › «Assente» + messaggio › «Aggiorna il mio stato»                                                                                                                                                 |
| TV-114 | Pausa del gioco che blocca i movimenti                                          | Foundry Space con indicatore centrale; Short Rest! con elenco "pronto"                               | FVT-158, VTL-177                                     | PROVEN · [final-review-completeness][ev-final-review]    | Sessione › «Metti in pausa»)                                                                                                                                                                                              |
| TV-115 | Gruppo diviso fra scene con nastri e "riunisci"                                 | Roll20 party ribbons e Regroup                                                                       | R20-140                                              | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]    | (correzione, provata da test) Roll20 party ribbons: while the party is split every group has a ribbon on the map (scene, «scena del gruppo», «al Tavolo», «tu», the characters); players see where the others are, and a… |
| TV-116 | Posizionare il gruppo mantenendo la formazione                                  | Roll20 Place Party; FG icone fazione                                                                 | R20-064, R20-158                                     | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Esplorazione › «Viaggio e accampamento» › Marcia › «Posiziona il gruppo sulla mappa» › clic                                                                                                                               |
| TV-117 | Vista bloccata per schermo fisico con griglia in scala                          | Lock View                                                                                            | FVT-164                                              | PROVEN · [audit/reaudit][ev-reaudit]                     | Screen diagonal/resolution and «Area della mappa mostrata».                                                                                                                                                               |
| TV-118 | Richiamo della vista altrui solo su scelta esplicita                            | Pulpscape Shift+clic; Foundry Shift-ping del GM                                                      | VTL-183, FVT-157, R20-137                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Puntatore» › «Proponi la vista» (oppure Maiusc+clic) › clic sulla mappa                                                                                                                                                  |
| TV-119 | Avviso d'inattività per sessioni lasciate aperte                                | DDB keep-alive dopo 55 minuti                                                                        | DDB-112                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Dopo 55 minuti senza attività (orologio simulato): «Sei ancora al tavolo? … entro 5 minuti risulterai assente»                                                                                                            |
| TV-120 | Puntatore sulla mappa                                                           | Owlbear pointer con freccia fuori schermo                                                            | VTL-146                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Strumento «Puntatore» (icona a bandierina) › tieni premuto e trascina                                                                                                                                                     |
| TV-121 | Ping col colore dell'utente, ping d'allerta, freccia fuori schermo              | Foundry pings; DDB Point & Ping                                                                      | FVT-157, DDB-125, VTL-147, CRP-149                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Puntatore › «Segnale» / «Allerta» (oppure Alt+clic) › clic                                                                                                                                                                |
| TV-122 | Disegno libero, forme, testo; autore proprietario, "cancella i miei"            | Foundry Drawings; DDB Draw; Roll20 disegno e testo                                                   | FVT-100, DDB-122, R20-138, R20-170                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | «Disegna» › mano libera / freccia / rettangolo / ellisse / testo / gomma, colore, spessore › «Cancella i miei»                                                                                                            |
| TV-123 | Note-suggerimento attaccate alle pedine                                         | Owlbear Tooltips                                                                                     | VTL-106                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Clic destro sulla pedina › «Nota sulla pedina…» › «Chi la vede: Tutto il tavolo / Solo io» › «Salva nota»                                                                                                                 |
| TV-124 | Memoria degli strumenti (ultimo colore, forma, motivo)                          | DDB tool memory                                                                                      | DDB-126                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Disegna, anche dopo aver ricaricato la pagina                                                                                                                                                                             |
| TV-125 | Effetti visivi degli incantesimi, disattivabili                                 | Automated Animations; Embers; Roll20 FX                                                              | FVT-102, FVT-103, VTL-180, R20-106                   | PROVEN · [audit/reaudit][ev-reaudit]                     | Fire Bolt at the Sentinella outside combat draws a map effect ([data-dtray-fx-kind]).                                                                                                                                     |
| TV-126 | Istantanea della scena per il resoconto                                         | BG3 Photo mode                                                                                       | CRP-165                                              | PROVEN · [audit/table-dice-time][ev-table-dice-time]     | Chat › «Istantanea» › didascalia › «Condividi l'istantanea»                                                                                                                                                               |

### Tavolo — tempo, esplorazione, audio

| ID     | Capacità                                                         | Miglior pattern di riferimento                                                                  | ID censimento                      | Stato                                                       | Dove si trova (blueprint, 30/09)                                                                                                         |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| TV-127 | Orologio della finzione, round di 6 secondi, requisiti di riposo | dnd5e HUD del calendario                                                                        | FVT-060                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | «Tempo» › «Avanza di 10 Minuti» › «Vedi conseguenze del tempo» › «Applica»                                                               |
| TV-128 | Riposi di gruppo con partecipanti, attività, interruzione        | dnd5e rest request; Rest Recovery                                                               | FVT-148, FVT-033                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | «Riposi» › «Nuovo riposo» › Tipo, partecipanti › «Vedi inizio del riposo» › «Avvia riposo»                                               |
| TV-129 | Turni facoltativi fuori combattimento                            | BG3 Shift+Space; Owlcat passaggio al volo                                                       | CRP-095, CRP-096                   | PROVEN · [audit/reaudit][ev-reaudit]                        | Shift+Space turn-based mode; palette «Modalità a turni».                                                                                 |
| TV-130 | Conto alla rovescia reale facoltativo (enigmi, pause)            | Owlbear Ticker; AboveVTT /timer                                                                 | VTL-178                            | PROVEN · [audit/reaudit][ev-reaudit]                        | «Sessione» › «Conto alla rovescia» › +1m › Titolo › «Salva» › «Avvia»                                                                    |
| TV-131 | Orologi di progresso fissati sugli schermi                       | Owlbear Count!                                                                                  | VTL-179                            | PROVEN · [final-review-completeness][ev-final-review]       | «Sessione» menu: Pausa, Nascondi scena, Conto alla rovescia, Orologi di progresso, Gruppo                                                |
| TV-132 | Ordine di marcia e formazione                                    | FG griglia di formazione; BG3 catena di ritratti                                                | R20-080, CRP-123, CRP-125          | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Esplorazione › «Viaggio e accampamento» › Marcia › «Livia» › casella «Coda»                                                              |
| TV-133 | Turni di guardia con verifiche                                   | WotR ruoli d'accampamento; FG ordine di guardia                                                 | CRP-155, R20-080                   | PROVEN · [audit/reaudit][ev-reaudit]                        | Camp at 20:00; watch Perception logged.                                                                                                  |
| TV-134 | Viaggio: passo, distanza, marcia forzata, eventi                 | Solasta II mappa a esagoni; dnd5e abilità di viaggio del gruppo                                 | CRP-065, CRP-067, FVT-050          | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Esplorazione › Viaggio e accampamento › «Viaggio» › Passo, «Ore di viaggio» (anche «9 h · prolungato») › «Viaggia» › «Tira un evento» ›… |
| TV-135 | Meteo per clima e stagione                                       | Simple Weather; Fantasy Calendar; Owlbear Weather                                               | FVT-064, CMP-99, VTL-181, FVT-104  | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Viaggio › «Genera il meteo» (clima, stagione) › «Tira» › «Mostra ai giocatori»                                                           |
| TV-136 | Provviste di cibo e acqua con consenso al consumo                | Rest Recovery; Solasta razioni                                                                  | FVT-033, CRP-066                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | DM: «Proponi il consumo di oggi»                                                                                                         |
| TV-137 | Luce portatile con durata e scorte                               | FG effetto LIGHT che segue l'attore; BG3 tooltip fonte di luce                                  | R20-121, CRP-147                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Creatura › «Luce e ricerca» › «Accendi una torcia»                                                                                       |
| TV-138 | Cercare con elenco dei ritrovamenti                              | BG3 Search con icone e contenitori vuoti                                                        | CRP-133                            | PROVEN · [audit/reaudit][ev-reaudit]                        | Finds kept in «Trovato»; log «Cerca · Percezione».                                                                                       |
| TV-139 | Furtività e nascondersi con chi ti vede                          | BG3 coni di visione e perdita spiegata                                                          | CRP-144, CRP-145                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Creatura › «Conoscenza e furtività» › Furtività                                                                                          |
| TV-140 | Conoscenza graduata delle creature ed Esamina                    | Solasta bestiario a quattro livelli; WotR conoscenza condivisa; BG3 Examine (esposizione piena) | CRP-135, CRP-136, CRP-134          | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | Clic destro sulla pedina › «Esamina»                                                                                                     |
| TV-141 | Identità nascosta dei PNG ("creatura non identificata")          | FG ID toggle; Anonymous; Beyond20 nome sostituito; Token Anonymizer                             | R20-155, FVT-126, VTL-223, VTL-105 | PROVEN · [final-review-completeness][ev-final-review]       | DM token menu › Visibilità › «Nascondi identità…»                                                                                        |
| TV-142 | Borseggio e scambi di nascosto con decisione del DM              | BG3 pickpocket e reverse-pickpocket                                                             | CRP-151                            | PROVEN · [audit/reaudit][ev-reaudit]                        | Poi: seleziona il bersaglio › Creatura › «Borseggi» › «Decidi…» › CD › «Conferma»                                                        |
| TV-143 | Bottino dopo lo scontro e distribuzione                          | BG3 finestra di bottino; Game Master's Grimoire "Loot Money"                                    | CRP-157, VTL-095                   | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | DM: clic destro › «Bottino» › monete e oggetti SRD › «Salva monete» › «Mostra ai giocatori»                                              |
| TV-144 | Mercante al Tavolo: carrello, contrattazione, riacquisto         | BG3 schermata con tutto il gruppo e buyback; GMG carrello con prezzo modificabile dal DM        | CRP-159, VTL-096, CRP-160          | PROVEN · [audit/reaudit][ev-reaudit]                        | Oggetti › «Bottega» › «Apri bottega»                                                                                                     |
| TV-145 | Volume per categoria (dadi, interfaccia)                         | Foundry cursori per categoria                                                                   | SVC-124                            | PROVEN · [audit/table-dice-time][ev-table-dice-time]        | «Preferenze» › «Suoni» › cursori «Volume dei dadi digitali», «Volume dell'interfaccia»                                                   |
| TV-146 | Musica e ambienti sonori condivisi                               | Roll20 Jukebox; Syrinscape; Kenku FM                                                            | R20-108, SVC-123–127, VTL-182      | EXCLUDED · [I-233][i-233] · musica ospitata (F-030)         | La ricerca «musica» non trova niente                                                                                                     |
| TV-147 | Voce e video integrati                                           | Roll20 voice/video                                                                              | R20-154                            | EXCLUDED · [I-233][i-233] · voce e video (F-017)            | Nessun comando                                                                                                                           |
| TV-148 | Vista 3D della scena                                             | FG camera 3D; Sigil                                                                             | R20-179, DDB-206                   | EXCLUDED · [I-233][i-233] · vista 3D (I-137)                | La ricerca «3D» trova solo aiuto e novità                                                                                                |
| TV-153 | Sfondi di scena animati (video)                                  | Foundry sfondi WebM/MP4                                                                         | revisione finale B5                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Caricamento della mappa: png, jpeg, webp                                                                                                 |
| TV-154 | Meteo animato sulla mappa                                        | Foundry «Weather Effect» della scena                                                            | revisione finale B7                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Il meteo esiste come dato (Esplorazione › Mondo), senza livello visivo                                                                   |
| TV-155 | Gioco su un solo dispositivo condiviso (a turno)                 | BG3 cooperativa locale a schermo diviso                                                         | revisione finale B6                | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento | Solo «Visita come» della dimostrazione cambia identità                                                                                   |
| TV-156 | Dadi «karmici» che correggono la sfortuna                        | BG3 impostazione «Karmic Dice»                                                                  | revisione finale B9                | OPEN-DECISION · [Q166][q166] · raccomandazione: escluderli  | —                                                                                                                                        |

### Biblioteca — compendio, homebrew, materiali e pacchetti

| ID    | Capacità                                                                        | Miglior pattern di riferimento                                                                         | ID censimento                               | Stato                                                               | Dove si trova (blueprint, 30/09)                                                                                                                                                                                       |
| ----- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BI-01 | Contenuti disponibili, personali e di campagna in viste distinte                | DDB My Library (Posseduti e condivisi, Preferiti); dnd5e browser                                       | DDB-161, FVT-170                            | PROVEN · [audit/reaudit][ev-reaudit]                                | «Dardo» in Disponibili finds Dardo di fuoco (SRD).                                                                                                                                                                     |
| BI-02 | Fonte e revisione di ogni voce                                                  | dnd5e fonte per voce SRD 5.2; nostra revisione esatta                                                  | FVT-172                                     | PROVEN · [audit/library][ev-library]                                | Biblioteca › Compendio SRD › voce, oppure Cerca globale «Dardo di fuoco» › risultato SRD                                                                                                                               |
| BI-03 | Sfogliare per tipo con filtri a faccette (incantesimi, mostri, oggetti, regole) | DDB elenchi con filtri (livello, scuola, classe, concentrazione, GS, rarità); dnd5e Compendium Browser | DDB-162, FVT-170, R20-181, CMP-108          | PROVEN · [final-review-completeness][ev-final-review]               | Biblioteca › Compendio SRD › caselle Livello 1 + Mago + Concentrazione                                                                                                                                                 |
| BI-04 | Lettore con indice, posizione corrente, precedente/successivo, segnalibri       | DDB reader con barra che segue la lettura; FG Books; app DDB segnalibri e modalità notte               | DDB-159, R20-191, DDB-208, R20-192          | PROVEN · [audit/library][ev-library]                                | Compendio SRD › «Regole: lettore» › indice › «3                                                                                                                                                                        |
| BI-05 | Tooltip di riferimento e glossario annidato con "Applica" per le condizioni     | DDB tooltip ovunque; dnd5e `&Reference` con Apply; CK3/Rogue Trader tooltip annidati bloccabili        | DDB-166, FVT-176, CRP-172, CRP-173          | PROVEN · [audit/reaudit][ev-reaudit]                                | Scelgo la creatura › Continua › si apre il pannello Condizioni con la condizione già scelta                                                                                                                            |
| BI-06 | Etichette edizione 2024/legacy e versione delle regole                          | DDB 5e/5.5e e Legacy; FG "2024"/"Legacy" a piè di finestra                                             | DDB-165, R20-042, FVT-171, DDB-214          | PROVEN · [audit/library][ev-library]                                | Ogni voce e ogni riga mostrano il badge «Regole 2024 · SRD 5.2.1»                                                                                                                                                      |
| BI-07 | Attribuzione SRD 5.2.1 EN e IT in una pagina legale                             | SRD CC-BY con frase d'attribuzione per lingua                                                          | SVC-128                                     | PROVEN · [final-review-completeness][ev-final-review]               | Compendio SRD › «Fonti e attribuzione»                                                                                                                                                                                 |
| BI-08 | Contenuti ufficiali in italiano con fonte IT                                    | SRD IT_SRD_CC_v5.2.1; Babele traduce il compendio senza toccare l'originale                            | SVC-128, SVC-129, SVC-157, SVC-180          | PROVEN · [audit/library][ev-library]                                | Voce › badge «Traduzione italiana ufficiale                                                                                                                                                                            |
| BI-09 | Pagine riassunto di classe e liste d'incantesimi                                | dnd5e pagine Class Summary e Spell List                                                                | FVT-173, FVT-174                            | PROVEN · [audit/reaudit][ev-reaudit]                                | Mago page: «Privilegi di classe» filled for levels 1–20.                                                                                                                                                               |
| BI-10 | Blocchi incorporati nel testo (statistiche, tabelle tirabili)                   | dnd5e `@Embed`                                                                                         | FVT-175                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | Rumours table rolls inside the note and the log.                                                                                                                                                                       |
| BI-11 | Viste stampabili                                                                | DDB print views                                                                                        | DDB-160                                     | PROVEN · [audit/library][ev-library]                                | Voce › «Vista stampabile» › «Stampa»                                                                                                                                                                                   |
| BI-12 | Schermo del DM di riferimento componibile                                       | 5e.tools griglia di pannelli; GM Screen; Owlbear DM Screen                                             | CMP-181, FVT-106, VTL-193, CMP-180          | PROVEN · [audit/library][ev-library]                                | Tavolo › icona libro della barra destra («Consultazione»), oppure «Tutti i pannelli» › «Schermo del DM»                                                                                                                |
| BI-13 | Errata e revisioni delle regole visibili                                        | DDB errata applicata e registrata                                                                      | DDB-169                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | «Cosa è cambiato» on Fire Bolt.                                                                                                                                                                                        |
| BI-14 | Pronuncia dei nomi                                                              | DDB audio di pronuncia                                                                                 | DDB-167                                     | PROVEN · [audit/library][ev-library]                                | Icona altoparlante accanto al titolo della voce                                                                                                                                                                        |
| BI-15 | Creare homebrew in bozza privata, condividere, abilitare una revisione esatta   | DDB My Creations e collezione; Shard Create; Let's Role crafts                                         | DDB-171, DDB-175, VTL-111                   | PROVEN · [audit/reaudit][ev-reaudit]                                | One structured editor, one «Salva», author reason beside the field.                                                                                                                                                    |
| BI-16 | Nuove revisioni senza toccare le copie; confronta e applica sulla scheda        | DDB "Create New Version" e scelta dell'utente; Foundry copia indipendente                              | DDB-176, FVT-204                            | PROVEN · [audit/reaudit][ev-reaudit]                                | Le mie creazioni › Apri › «Nuova versione» › aggiungo il modificatore Saggezza +1 e un'attività › Salva contenuto › condivide e abilita                                                                                |
| BI-17 | Partire da un modello o da zero                                                 | DDB template da contenuto posseduto                                                                    | DDB-172                                     | PROVEN · [audit/library][ev-library]                                | Biblioteca › Le mie creazioni › «Incantesimo» › Modello «Palla di fuoco                                                                                                                                                |
| BI-18 | Comportamento strutturato: prerequisiti, opzioni, modificatori, scalature       | DDB sotto-moduli dopo il primo salvataggio; Roll20 Modifier Builder                                    | DDB-173, R20-023                            | PROVEN · [audit/reaudit3-a][ev-reaudit3-a]                          | Biblioteca › «Crea contenuto» › Talento › name › Modificatori › «Aggiungi modificatore» › Valore «Prove di Percezione · manuale»,…                                                                                     |
| BI-19 | Editor di attività (attacco, TS, cura, danno, evoca, trasforma, utilità)        | dnd5e Activities: Identità, Attivazione, Effetto                                                       | FVT-180                                     | PROVEN · [audit/library][ev-library]                                | Attività: tipo (TS, attacco, danno, cura, evoca, trasforma, utilità) › Identità / Attivazione                                                                                                                          |
| BI-20 | Editor di effetti come modulo, con durate e ancore di turno                     | Foundry Active Effects 6.0; FG ancore (espresse come scelte, non codice); DAE autocompletamento        | FVT-182, FVT-183, R20-161, R20-162          | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]               | (correzione, provata da test) Foundry Active Effects durations with FG anchors as choices: a modifier's «Durata» is always on, N rounds, start/end of your next turn, end of this turn, short or long rest, or until…  |
| BI-21 | Editor di avanzamenti (ASI, concessioni, scelte, valori di scala)               | dnd5e Advancement editor                                                                               | FVT-181                                     | PROVEN · solo test Node · [audit/reaudit][ev-reaudit]               | (correzione, provata da test) dnd5e Advancement tied to level-up. A homebrew class's advancement is applied by the builder: grants become features at their level, scale values show their current value («Dado della… |
| BI-22 | Classi e sottoclassi homebrew complete                                          | Roll20 classe personalizzata nel builder; Shard (DDB non le supporta)                                  | R20-022, DDB-171                            | PROVEN · [audit/reaudit3-a][ev-reaudit3-a]                          | Biblioteca › «Crea contenuto» › Sottoclasse › «Crea bozza privata» › name and author › Avanzamento: Classe Mago, Livello 3, «Aggiungi…                                                                                 |
| BI-23 | Creatore di mostri con sezioni attivabili e blocchi tirabili                    | DDB monster creator; DDB `[rollable]`; Tetra-cube preset e sezioni                                     | DDB-174, DDB-110, CMP-152, CMP-153, CMP-122 | PROVEN · [final-review-completeness][ev-final-review]               | Biblioteca › pulsante dorato «Crea contenuto» › Creatura › editor di solo testo                                                                                                                                        |
| BI-24 | Oggetti magici da oggetto base + modello                                        | FG Forge; dnd5e Enchant                                                                                | R20-118, FVT-036                            | PROVEN · [final-review-completeness][ev-final-review]               | DM › Biblioteca › «Crea contenuto» › «Oggetto magico · Forgia: oggetto di base + modello» opens the Forge (base object SRD 5.2.1 Spada…                                                                                |
| BI-25 | Pubblicazione, moderazione, valutazioni, segnalazioni, etichetta AI             | DDB coda di moderazione e versioni; DMs Guild metodo di creazione AI                                   | DDB-175, DDB-177, DDB-178, SVC-136, SVC-137 | PROVEN · simulazione · [audit/library][ev-library]                  | Le mie creazioni › Apri › «Pubblica questa revisione…» › «Metodo di creazione (obbligatorio)»: persone / assistito da IA / generato da…                                                                                |
| BI-26 | Copia modificabile da contenuto bloccato e "ripristina alla fonte"              | FG copia dal modulo e Revert                                                                           | R20-114                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | Da Le mie creazioni › Incantesimo › Modello invece compare «Fonte della copia                                                                                                                                          |
| BI-27 | Disattivare homebrew o automazioni per trovare un problema                      | Foundry safe mode; Find the Culprit                                                                    | FVT-198                                     | PROVEN · [audit/library][ev-library]                                | Campagna › barra laterale GIOCO › «Homebrew» › «Disattiva tutto l'homebrew»                                                                                                                                            |
| BI-28 | Livello di automazione dichiarato per fonte                                     | Roll20 elenco dei libri completamente automatizzati                                                    | R20-185                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | «rev. 2 · Automazione completa», «Livia (rev. 2)».                                                                                                                                                                     |
| BI-29 | Libreria multimediale con cartelle, tag, ricerca e caricamento                  | Foundry File Picker; Roll20 Art Library; Owlbear dock con badge; LegendKeeper assets                   | FVT-185, R20-189, VTL-061, CMP-207, R20-193 | PROVEN · [audit/library][ev-library]                                | Biblioteca › Immagini e file › «Carica file» › «Che cos'è test-map.png?» Mappa / Pedina / Ritratto / Oggetto di scena                                                                                                  |
| BI-30 | Selettore negli editor e "usato in"                                             | Kanka uso nella galleria                                                                               | CMP-208                                     | PROVEN · [audit/library][ev-library]                                | Scheda › Storia › Aspetto › «Scegli dalla libreria»                                                                                                                                                                    |
| BI-31 | Avviso di risorsa mancante invece di un vuoto silenzioso                        | Owlbear notifica; Scene Packer Asset Report                                                            | VTL-240, FVT-179                            | PROVEN · [audit/library][ev-library]                                | Tavolo › «File mancante» › «Scegli un'altra immagine / Togli il riferimento / Più tardi»                                                                                                                               |
| BI-32 | Ritaglio o generazione della pedina dal ritratto                                | Tokenizer; Tabletop Tokens                                                                             | FVT-039, VTL-108                            | PROVEN · [audit/reaudit][ev-reaudit]                                | Header portrait crop, token menu Aspetto, palette «ritaglia ritratto».                                                                                                                                                 |
| BI-33 | Tipo scelto al rilascio del file (mappa, pedina, oggetto)                       | Owlbear ruota d'importazione                                                                           | VTL-062                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | Dropped images become a token and an object at the drop point.                                                                                                                                                         |
| BI-34 | Provenienza e licenza degli asset                                               | Roll20 dichiarazione di proprietà e riconoscimenti                                                     | SVC-138                                     | PROVEN · [audit/library][ev-library]                                | Dettaglio del file › «Provenienza e licenza»                                                                                                                                                                           |
| BI-35 | PDF personali con annotazioni                                                   | Owlbear PDF!; Roll20 PDF nel diario                                                                    | VTL-194, R20-061, FVT-041                   | PROVEN · [audit/library][ev-library]                                | Biblioteca › Immagini e file › «Appunti di Livia» › «Mostra il PDF qui» (visore in linea) › «Le mie annotazioni · Solo io» › Pagina 2 +…                                                                               |
| BI-36 | Avventura riutilizzabile con scene, PNG, testi e dipendenze                     | Foundry Adventure; FG export di modulo; Module Maker                                                   | FVT-177, FVT-178, R20-125                   | PROVEN · [audit/library][ev-library]                                | Biblioteca › «Avventure» (solo per il DM) › «Il faro sommerso»                                                                                                                                                         |
| BI-37 | Importare in campagna scegliendo i tipi, con avviso di sovrascrittura           | Foundry dialogo di import; dnd5e azioni facoltative (scena iniziale, introduzione)                     | FVT-177, FVT-005                            | PROVEN · [audit/library][ev-library]                                | Avventura › «Importa in una campagna» › tipi (Scene, PNG, Materiali, Tabelle) › azioni facoltative (scena iniziale, introduzione) ›…                                                                                   |
| BI-38 | Aggiornamenti con differenze che rispettano le modifiche locali                 | Foundry Rebuild (rosso/verde); Roll20 patch in coda annullabile                                        | FVT-177, R20-186, SVC-132                   | PROVEN · [audit/library][ev-library]                                | Autore: avventura › «Nuova versione» › pannello «Rispetto alla versione 1                                                                                                                                              |
| BI-39 | Riconnessione dei riferimenti all'import                                        | Scene Packer                                                                                           | FVT-179                                     | PROVEN · [audit/library][ev-library]                                | Anteprima dell'import › «Collegamenti ricostruiti                                                                                                                                                                      |
| BI-40 | Contenuti riusabili dell'universo vs contenuti della sola partita               | Alchemy Universe vs in-game                                                                            | VTL-079, VTL-204                            | PROVEN · [audit/reaudit][ev-reaudit]                                | Library › Avventure has «Universo»; palette «universo».                                                                                                                                                                |
| BI-41 | Avviare una campagna da un'avventura                                            | Roll20 "Create game with module"; Foundry quickstart                                                   | R20-187, FVT-004                            | PROVEN · [audit/reaudit][ev-reaudit]                                | «Crea campagna» offers «Parti da un’avventura: Il faro sommerso».                                                                                                                                                      |
| BI-42 | Import/export nel formato proprio con anteprima; errori senza effetti           | Foundry JSON per documento                                                                             | FVT-205, FVT-169                            | PROVEN · [audit/library][ev-library]                                | Voce › «Esporta revisione e dipendenze» (d20-library.json, formato d20-studio-library v1) · Biblioteca › «Importa file JSON»                                                                                           |
| BI-43 | Importare mostri da CSV/JSON con esempio                                        | Kobold+ importer; Clash! JSON                                                                          | CMP-112, VTL-083, VTL-226                   | PROVEN · [final-review-completeness][ev-final-review]               | Le mie creazioni › «Importa mostri (CSV o JSON)» › «Inserisci l'esempio» (o «Scarica l'esempio CSV» / file) › «Controlla le righe» (2 ·…                                                                               |
| BI-44 | Esportare un libro in HTML stampabile; importare DOCX                           | Shard export/import                                                                                    | VTL-199                                     | PROVEN · [audit/reaudit][ev-reaudit]                                | «Importa documento…» in Library › Avventure.                                                                                                                                                                           |
| BI-45 | Pacchetti di compatibilità con sole meccaniche                                  | Shard (dopo l'abbandono dell'import DDB)                                                               | VTL-200                                     | PROVEN · simulazione · [final-review-completeness][ev-final-review] | Biblioteca › «Pacchetti di compatibilità» › «Prova il pacchetto di esempio» shows «Valle di Bruma · esempio                                                                                                            |
| BI-46 | Marketplace, abbonamenti, collezioni di dadi a pagamento                        | DDB Marketplace e livelli; Roll20 wishlist                                                             | DDB-181–185, DDB-154, DDB-218, R20-188      | EXCLUDED · [I-233][i-233] · marketplace e acquisti                  | Cerca «marketplace» e «acquista» non trovano niente                                                                                                                                                                    |

### Servizi e impostazioni

| ID    | Capacità                                                                   | Miglior pattern di riferimento                                                        | ID censimento                                  | Stato                                                                                                                           | Dove si trova (blueprint, 30/09)                                                                                                                                                                                       |
| ----- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| SV-01 | Ricerca nell'app su personaggi e voci accessibili                          | (nostra) rispetta le revoche                                                          | —                                              | PROVEN · [audit/services][ev-services]                                                                                          | Lente in alto (o ⌘K) › «livia» › Invio › scheda di Livia                                                                                                                                                               |
| SV-02 | Palette di comandi con prefissi, filtro contestuale, inserimento           | Quick Insert (Ctrl+Spazio, `@`, `>`, `=`); Alchemy OmniSearch; Kanka K                | FVT-187, VTL-211, CMP-237                      | PROVEN · [final-fixes][ev-final-fixes]                                                                                          | Intestazione › «Cerca» (⌘K): comandi, pagine e sinonimi naturali (bottino, segreto, sintonia, sondaggio…)                                                                                                              |
| SV-03 | Ricerca con tolleranza ai refusi, gruppi per categoria, filtri             | DDB ricerca semantica annunciata; TaleSpire live search                               | DDB-164, VTL-203, CMP-242                      | PROVEN · [final-fixes][ev-final-fixes]                                                                                          | Intestazione › «Cerca» (⌘K): risultati per tipo con filtri; sinonimi naturali per ogni funzione                                                                                                                        |
| SV-04 | Creazione rapida di qualsiasi voce                                         | Kanka Quick creator (N)                                                               | CMP-238                                        | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | K › Creazione rapida) › Persona › Titolo › Crea                                                                                                                                                                        |
| SV-05 | Appunti personali per identità, anche senza campagna                       | (nostra) Inc.1/Inc.7                                                                  | —                                              | PROVEN · [final-review-completeness][ev-final-review]                                                                           | «Appunti personali» › Nuovo appunto › Contesto (predefinito «Le lanterne di Bruma», da cambiare in «Personale · senza campagna») ›…                                                                                    |
| SV-06 | Richieste pendenti sempre raggiungibili                                    | (nostra NAV-09)                                                                       | —                                              | PROVEN · [audit/services][ev-services]                                                                                          | Da Campagne: campanella («4 notifiche») › «Richieste in attesa: 3 richieste…» › «Apri tiri e risultati» › Tavolo con «Risolvi tiro» per…                                                                               |
| SV-07 | Centro notifiche per categoria (inviti, sessioni, esportazioni, richieste) | FG toast per categoria; Kanka notifiche d'appartenenza; StartPlaying email di annullo | R20-176, SVC-153, SVC-154, CMP-228, FVT-193    | PROVEN · [audit/services][ev-services]                                                                                          | Campanella › chip per categoria (Tutte, Non lette, Inviti, Richieste di tiro, Attività del gruppo, Chat e discussioni, Altre aree) ›…                                                                                  |
| SV-08 | Avvisi di attività del gruppo                                              | BG3 notifiche di scambio e ricompense                                                 | CRP-055                                        | PROVEN · [audit/services][ev-services]                                                                                          | Giocatore: scheda › Inventario › Scorta del gruppo › Torcia «Prendi» › Conferma                                                                                                                                        |
| SV-09 | Lingua IT/EN dell'interfaccia                                              | Roll20 preferenza di lingua; Foundry client                                           | SVC-156, SVC-157, R20-198                      | PROVEN · [audit/services][ev-services]                                                                                          | «Preferenze» › Lingua: English › Salva preferenze                                                                                                                                                                      |
| SV-10 | Preferenze con ambito dichiarato: dispositivo, personale, campagna         | Foundry Client/User/World; FG opzioni per utente e bloccate per giocatori             | FVT-188, SVC-163, R20-201                      | PROVEN · [audit/services][ev-services]                                                                                          | Preferenze: blocchi «Su questo dispositivo», «Personali · Il mio account», «Campagna · Questa campagna»                                                                                                                |
| SV-11 | Tema chiaro, scuro o di sistema                                            | Foundry V13 segue il sistema; Roll20 modalità colore                                  | FVT-189, SVC-158, SVC-159, DDB-059             | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › Tema: Chiaro › Salva                                                                                                                                                                                      |
| SV-12 | Dimensione del testo e scala dell'interfaccia                              | Foundry font e scala; FG `/scaleui`; BG3 anteprima dal vivo                           | FVT-189, R20-202, CRP-181, SVC-160, SVC-170    | PROVEN · [audit/services][ev-services]                                                                                          | Preferenze › Dimensione del testo 125% (si vede subito) › Scala 110% › Salva                                                                                                                                           |
| SV-13 | Movimento ridotto e modalità fotosensibile                                 | Foundry photosensitive; Owlbear rispetta Reduce Motion; Alchemy                       | SVC-161, SVC-166, SVC-167, VTL-212             | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › Movimento ridotto «Sempre attivo» e «Modalità fotosensibile» › Salva                                                                                                                                      |
| SV-14 | Segnali mai solo colore; modalità per daltonismo                           | Owlbear Ranges con tre temi; BG3 modalità; Battle Board parole di stato               | VTL-243, CRP-180, SVC-171                      | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › Colori adatti a «Deuteranopia» e «Parole sulla mappa» › Salva                                                                                                                                             |
| SV-15 | Carattere per dislessia e contrasto elevato                                | Roll20 font e barre ad alto contrasto                                                 | SVC-165, R20-196                               | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › Carattere «Alta leggibilità (dislessia)» e Contrasto «Elevato» › Salva                                                                                                                                    |
| SV-16 | Unità metriche o imperiali, coerenti con la lingua                         | BG3 unità scelte; manuali italiani in metri                                           | CRP-184                                        | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › Distanze e pesi «Piedi e libbre» › Salva                                                                                                                                                                  |
| SV-17 | Scorciatoie ricollegabili con conflitti e ripristino                       | Foundry Configure Controls; BG3 categorie e reset                                     | FVT-191, CRP-182, SVC-162                      | PROVEN · [final-review-completeness][ev-final-review]                                                                           | «?» › «Modifica le scorciatoie» › cerca «notifiche» › pulsante «—» › premo N                                                                                                                                           |
| SV-18 | Guida alle scorciatoie generata dal registro dei comandi                   | Kobold+ modale; DDB elenco scorciatoie                                                | CMP-239, DDB-127, R20-197                      | PROVEN · [audit/services][ev-services]                                                                                          | Tasto «?» sul Tavolo: guida generata dai comandi registrati, divisa in Ricerca, Ovunque e Sul Tavolo, con i conflitti e «55 comandi non…                                                                               |
| SV-19 | Modalità prestazioni o solo scheda per dispositivi deboli                  | Foundry Disable Game Canvas; indicazioni Roll20 per il giocatore più debole           | FVT-190, SVC-164, SVC-173, VTL-242             | PROVEN · [audit/services][ev-services]                                                                                          | Preferenze › «Modalità solo scheda» › Salva                                                                                                                                                                            |
| SV-20 | Schermo sempre acceso con la scheda aperta                                 | DDB app                                                                               | DDB-069                                        | PROVEN · [audit/services][ev-services]                                                                                          | Preferenze › «Tieni lo schermo acceso» › Salva                                                                                                                                                                         |
| SV-21 | Il DM aiuta a configurare le preferenze di un giocatore                    | Monk's Player Settings                                                                | FVT-192, VTL-224                               | PROVEN · [audit/services][ev-services]                                                                                          | Preferenze › «Proponi preferenze a un giocatore…» › Dimensione 125% e nota › Invia                                                                                                                                     |
| SV-22 | Ritardo dei tooltip e opacità dei pannelli                                 | BG3 ritardo 200 ms e sfondo del testo                                                 | CRP-181                                        | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | Preferenze › «Opacità dei pannelli» 60% › Salva                                                                                                                                                                        |
| SV-23 | Tastiera nei percorsi, focus visibile, Esc coerente                        | Owlbear 2.1; DDB tabindex; Alchemy Esc chiude la modale in cima                       | SVC-167, SVC-168, VTL-211, VTL-216             | PROVEN · [audit/services][ev-services]                                                                                          | Il focus è sempre visibile (contorno oro di 3 px)                                                                                                                                                                      |
| SV-24 | Prove con lettore di schermo (menu a frecce, caselle etichettate)          | Rapporto AFB 2026 come test d'accettazione                                            | SVC-169                                        | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | Menu con role=menu e navigazione a frecce                                                                                                                                                                              |
| SV-25 | Profilo: nome visualizzato e avatar                                        | DDB avatar multipli                                                                   | DDB-189                                        | PROVEN · [audit/services][ev-services]                                                                                          | Icona persona › Account e profilo › Profilo › «Salvo» › Salva nome                                                                                                                                                     |
| SV-26 | Metodi d'accesso e servizi collegati, distinti dal login                   | DDB accessi; collegare Discord non è un login                                         | DDB-186, SVC-147, VTL-214, CMP-219             | PROVEN · [audit/services][ev-services]                                                                                          | Account › Accesso e servizi                                                                                                                                                                                            |
| SV-27 | Esportare i propri dati; cancellare l'account con avviso delle conseguenze | DDB modulo con verifica; perdita dei contenuti spiegata prima                         | DDB-188, SVC-143, SVC-144, SVC-145             | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Account › I miei dati › «Esporta i miei dati» scarica un JSON solo con i miei dati                                                                                                                                     |
| SV-28 | Politica d'età e consenso dei genitori                                     | DDB con k-ID; Roll20 13/16; StartPlaying 18+                                          | SVC-139–142, DDB-187                           | OPEN-DECISION · requisito legale ([I-233][i-233]); oggi età dichiarata negli annunci e filtro 18+ · [audit/reaudit][ev-reaudit] | Negli annunci pubblici c'è «Età: Nessun limite dichiarato dal DM» e il filtro «Mostra annunci per adulti (18+)»                                                                                                        |
| SV-29 | Segnalare, bloccare, codice di condotta                                    | Roll20 Report/Block e scala delle sanzioni; DDB Report Image                          | SVC-148–150, DDB-157, SVC-114                  | PROVEN · simulazione · [audit/services][ev-services]                                                                            | Tavoli pubblici › annuncio › «Segnala annuncio» (motivi, screenshot facoltativo) › Invia                                                                                                                               |
| SV-30 | Offline simulato: privato locale, condiviso bloccato, stato visibile       | DDB banner e ultima versione; Notion                                                  | DDB-066, CMP-222                               | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Preferenze › «Simula assenza di rete»                                                                                                                                                                                  |
| SV-31 | Scegliere che cosa è disponibile offline                                   | Notion "Available offline" con elenco; DDB download dei libri                         | CMP-222, DDB-207, CMP-224                      | PROVEN · [audit/services][ev-services]                                                                                          | Icona nuvola › Offline e sincronizzazione › «Rendi disponibile» per voce o «Rendi disponibile tutto»                                                                                                                   |
| SV-32 | Coda delle modifiche e conflitti alla riconnessione                        | LegendKeeper offline con sincronizzazione                                             | CMP-218                                        | PROVEN · [audit/services][ev-services]                                                                                          | Storia › «Storia e legami» modificata e messa in coda                                                                                                                                                                  |
| SV-33 | Archiviazione del browser non disponibile segnalata                        | Clash! avviso di storage disattivato                                                  | VTL-238                                        | PROVEN · [audit/services][ev-services]                                                                                          | Con localStorage e IndexedDB bloccati compare subito il banner «Salvataggio locale non disponibile… i dati precedenti non vengono…                                                                                     |
| SV-34 | Stato della connessione e riconnessione automatica                         | DDB riconnessione; Solasta II indicatore                                              | DDB-155, CRP-188, VTL-210                      | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | setOffline → «Senza rete…», back → «In linea…».                                                                                                                                                                        |
| SV-35 | Undo locale con autore e registro                                          | Foundry Ctrl+Z sulla scena; Roll20 undo per pagina                                    | FVT-201, R20-151, VTL-233                      | PROVEN · [audit/services][ev-services]                                                                                          | Danno 2 › «Annulla ultima modifica»                                                                                                                                                                                    |
| SV-36 | Conferme proporzionate alle azioni distruttive                             | Roll20 salvaguardie; Quest Portal icona di eliminazione spostata                      | R20-207, VTL-237                               | PROVEN · [audit/services][ev-services]                                                                                          | Personaggi › «Elimina Iria» › «Sposta nel cestino»                                                                                                                                                                     |
| SV-37 | Errori specifici con azione suggerita                                      | Roll20 errori che nominano causa e rimedio; AboveVTT avvisi d'ambiente                | R20-208, VTL-239                               | PROVEN · [audit/reaudit3-c][ev-reaudit3-c]                                                                                      | Sweep of ~75 views (31 campaign-section views, 23 as DM and 8 as player; the 9 Settings tabs; the 5 Integrations tabs; every Table sidebar tab and bottom-bar page as DM and as player; Home,…                         |
| SV-38 | Inoltro di tiri e avvisi a Discord                                         | Foundry to Discord; Avrae `!campaign`; webhook Clash!/Rumble!                         | SVC-121, SVC-116, VTL-225, DDB-195             | PROVEN · simulazione · [final-review-completeness][ev-final-review]                                                             | Integrazioni › Discord: webhook masked «••••0001», channel preview, private rolls not relayed                                                                                                                          |
| SV-39 | Feed calendario delle sessioni                                             | Sesh `/link` iCal                                                                     | SVC-065                                        | PROVEN · simulazione · [audit/reaudit][ev-reaudit]                                                                              | Home «Prossimo appuntamento» offers «Aggiungi al calendario».                                                                                                                                                          |
| SV-40 | Collegare una scheda esterna a una pedina                                  | Owlbear Sheet from Beyond con ripiego in nuova scheda                                 | VTL-034, VTL-035                               | PROVEN · [audit/services][ev-services]                                                                                          | Clic destro o pressione lunga sulla pedina › «Scheda esterna…» › URL e visibilità › Salva il link                                                                                                                      |
| SV-41 | API pubblica e connettori                                                  | DiceCloud API; Kanka API e webhook                                                    | CMP-09, CMP-213, CMP-229                       | PROVEN · simulazione · [audit/reaudit][ev-reaudit]                                                                              | API token in two steps; palette «token API».                                                                                                                                                                           |
| SV-42 | Estensioni di terze parti per campagna                                     | Owlbear estensioni per stanza; Foundry moduli per mondo                               | VTL-206, SVC-135, FVT-197                      | PROVEN · simulazione · [final-review-completeness][ev-final-review]                                                             | Integrazioni › Moduli with dependencies; disabled Save explains «Nessuna modifica da salvare»                                                                                                                          |
| SV-43 | Assistente AI con citazioni su fonti autorizzate                           | Quest Portal Library Link; Archivist "Ask" limitato alla visibilità                   | VTL-197, SVC-090, SVC-097                      | PROVEN · simulazione · [audit/services][ev-services]                                                                            | Apri campagna › GESTIONE DM › Assistente › Consenso e dati › «Attiva l'assistente…»                                                                                                                                    |
| SV-44 | Resoconto AI rivisto prima della condivisione, consenso alla registrazione | Archivist Session Review; Craig "RECORDING"; Saga20 conservazione dichiarata          | SVC-086–089, SVC-096, SVC-155                  | PROVEN · simulazione · solo test Node · [audit/reaudit][ev-reaudit]                                                             | (correzione, provata da test) Settings, preferences, integrations, account, drafts and similar events are never recap sources, moments or entities; a period with none says «Nessun evento di gioco…» (refusal) and a… |
| SV-45 | Scrittura assistita nelle note e generazione di personaggi                 | Quest Portal AI notes con Tieni/Riprova/Scarta                                        | VTL-217, VTL-218, SVC-023                      | PROVEN · simulazione · [audit/services][ev-services]                                                                            | Assistente › Scrivi › Tema «PNG da un'idea» › Richiesta › Genera                                                                                                                                                       |
| SV-46 | Modello proprio o locale                                                   | Phil's AI Assistant; RPGX con Ollama                                                  | SVC-099                                        | PROVEN · simulazione · [audit/reaudit3-c][ev-reaudit3-c]                                                                        | Gestione DM › Assistente › «Consenso e dati» › «Attiva l’assistente…» (dialog lists what it reads and never reads) › «Motore delle risposte (solo per te)» › «Modello locale su questo…                                |
| SV-47 | Aiuto contestuale "?" per pagina                                           | FG "?" che apre la pagina del manuale                                                 | R20-012                                        | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Icona «?» o F1 sul Tavolo: «Aiuto · Tavolo», cosa si fa qui, avvia il tour, segnala un problema, «Torna alla pagina»                                                                                                   |
| SV-48 | Suggerimenti alla prima occorrenza, archiviati e ripristinabili            | BG3 tutorial contestuali con archivio e reset                                         | CRP-001                                        | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | Si accendono da Aiuto › «Tour e suggerimenti» (porta a Inizio › Guide, fuori dal Tavolo) › casella                                                                                                                     |
| SV-49 | Tour facoltativi ripristinabili                                            | Foundry Tours con avanzamento; Shard tour; DDB "Watch Tour"                           | FVT-006, VTL-002, DDB-005, FVT-007             | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Aiuto › «Avvia il tour «Il Tavolo»», 6 passi                                                                                                                                                                           |
| SV-50 | Suggerimenti durante l'attesa                                              | DDB consigli nella sala d'attesa                                                      | DDB-006                                        | PROVEN · [audit/reaudit][ev-reaudit]                                                                                            | Pause overlay shows a tip or rule of the day.                                                                                                                                                                          |
| SV-51 | Stato del servizio, diagnostica e segnalazione di un problema              | DDB status page; Roll20 Report a Bug; FG log e canali                                 | DDB-191, SVC-152, R20-199, R20-204, DDB-212    | PROVEN · [final-review-completeness][ev-final-review]                                                                           | Inizio › scheda Supporto: stato del servizio, incidenti, Diagnostica, «Segnala un problema» (toglie i dati personali, mostra…                                                                                          |
| SV-52 | Anteprime facoltative di funzioni sperimentali                             | Quest Portal Feature Previews                                                         | VTL-215                                        | PROVEN · [audit/services][ev-services]                                                                                          | Inizio › Supporto › Anteprime delle funzioni › «Inizio compatto»                                                                                                                                                       |
| SV-53 | Annunci pubblici e candidature per trovare un gruppo                       | Roll20 LFG con stato dell'annuncio; Kanka candidature; Warhorn lista d'attesa         | R20-004–006, SVC-001–011, SVC-041, SVC-067–069 | PROVEN · simulazione · [audit/services][ev-services]                                                                            | Inizio › «Cerca un tavolo» (filtri: lingua, formato, giorno e ora nel mio fuso, nuovi giocatori, 18+) › Apri annuncio › Candidati…                                                                                     |
| SV-54 | Sessioni a pagamento con DM professionista                                 | StartPlaying                                                                          | SVC-002                                        | EXCLUDED · [I-233][i-233] · sessioni a pagamento                                                                                | «pagamento» e «prezzo» non danno risultati                                                                                                                                                                             |
| SV-55 | AI come DM                                                                 | Friends & Fables                                                                      | SVC-100                                        | EXCLUDED · [I-233][i-233] · IA come DM                                                                                          | L'assistente dice «Da decidere al tavolo… L'assistente non li inventa»                                                                                                                                                 |
| SV-56 | Verifica in due passaggi dell'account                                      | D&D Beyond (account Wizards) e Roll20 2FA                                             | revisione finale B8                            | OPEN-DECISION · [Q167][q167] · capacità oltre il censimento                                                                     | Account › Accesso e servizi ha le passkey, non un secondo fattore                                                                                                                                                      |

### Trasversale

| ID   | Capacità                                                                                 | Miglior pattern di riferimento                                                           | ID censimento                               | Stato                                                                                                       | Dove si trova (blueprint, 30/09)                                                                                                                                                    |
| ---- | ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| X-01 | Una sola identità dei dati fra scheda, campagna e Tavolo                                 | DDB un personaggio in ogni superficie                                                    | DDB-213, R20-034                            | PROVEN · [final-review-completeness][ev-final-review]                                                       | Danno 3 sulla scheda: Tavolo «Livia · 15/22 PF», campagna «15 / 22», Inizio «15 / 22»                                                                                               |
| X-02 | Pannelli consultabili mentre il gioco continua                                           | BG3 scheda e inventario aperti durante il gioco                                          | CRP-197                                     | PROVEN · [audit/reaudit][ev-reaudit]                                                                        | Player log has no preset/service line.                                                                                                                                              |
| X-03 | Correzioni per conseguenza registrate invece di un undo globale                          | Damage Log; Roll20 undo solo della pagina                                                | FVT-144, R20-151, DDB-216                   | PROVEN · [audit/reaudit][ev-reaudit]                                                                        | Ogni annullamento diventa una voce «Correzione … Annullato: …»                                                                                                                      |
| X-04 | Salvataggio esplicito o automatico dichiarato per ogni editor                            | Clash! elenco automatico e pannelli espliciti; DDB autosave                              | VTL-236, DDB-217                            | PROVEN · [audit/services][ev-services]                                                                      | L'editor degli appunti dice «Bozza privata salvata su questo dispositivo» o «Modifiche non salvate»                                                                                 |
| X-05 | Insieme fisso di superfici di comando (azione, strumento, menu, popover, modale, avviso) | Owlbear SDK                                                                              | VTL-231                                     | PARTIAL · preferenze delle notifiche in due posti (campanella e Preferenze) · [final-fixes][ev-final-fixes] | Finestre: «Annulla» ed Esc tornano alla superficie d'origine (Preferenze › «Ripristina predefiniti…»); le preferenze delle notifiche restano sia nella campanella sia in Preferenze |
| X-06 | Menu contestuale con equivalente touch e da tastiera per ogni oggetto                    | Owlbear pressione lunga o tocco + "…"; FG menu etichettati; BG3                          | VTL-232, R20-203, FVT-202, CRP-195          | PROVEN · [final-fixes][ev-final-fixes]                                                                      | Clic destro, pressione lunga o Maiusc+F10 su una scheda in Personaggi, una riga dell'inventario o un incantesimo: menu con i comandi della riga                                     |
| X-07 | Trascinamento come collegamento universale, sempre con alternativa accessibile           | Foundry e FG drag-and-drop                                                               | FVT-203, R20-212                            | PROVEN · [final-fixes][ev-final-fixes]                                                                      | Tavolo › Consultazione › Compendio: trascina una creatura sulla mappa (DM), un oggetto o un incantesimo su una pedina o sulla scheda; «Aggiungi…» resta l'alternativa da tastiera   |
| X-08 | Registro unico dei comandi → barra, riga, tooltip, scorciatoia                           | Improved Initiative: ogni comando sceglie dove comparire                                 | CMP-155–157, VTL-130                        | PROVEN · [audit/services][ev-services]                                                                      | Riposi Y → J: il tooltip diventa «Riposi (J)», cambiano aria-keyshortcuts, la riga in ⌘K («…                                                                                        |
| X-09 | Aritmetica nei campi numerici                                                            | Owl Trackers `+6`, `=15`; Battle Board catene                                            | VTL-234                                     | PROVEN · [final-fixes][ev-final-fixes]                                                                      | Scheda › Punti ferita: -5, +3, =12 o 25-3+2 e Invio; anche in «Correggi i punti ferita» e nel menu della pedina                                                                     |
| X-10 | Finestre staccabili per più schermi                                                      | Foundry V14 pop-out; Quest Portal                                                        | FVT-199, R20-059, VTL-192                   | PROVEN · [final-fixes][ev-final-fixes]                                                                      | Tavolo › «Tutti i pannelli» › «Stacca» accanto a ogni pannello: finestra separata e sincronizzata                                                                                   |
| X-11 | Comandi personali e sequenze riutilizzabili senza codice                                 | Roll20 barra rapida con trascinamento; Dice+ pannelli condivisibili; Let's Role QuickBar | R20-148, R20-035, VTL-174, VTL-184, FVT-194 | PROVEN · [audit/services][ev-services]                                                                      | Tavolo › scheda «Barra rapida» › casella «+» › Percezione (ci sono anche «Tiro salvato (formula)» e «Sequenza di passi») › Aggiungi ›…                                              |
| X-12 | Macro con codice o scripting                                                             | Roll20 Mod; Foundry script; Avrae Draconic                                               | R20-109, FVT-194, DDB-198                   | OPEN-DECISION · [GAP-01][gap-01] · script con codice non scelto ([I-233][i-233])                            | «macro» e «script» non danno risultati                                                                                                                                              |

### Totali dell'elenco

528 capacità deduplicate (519 del censimento del 23/09 più 9 trovate oltre il censimento dalla
revisione finale del 30/09: TV-149 sorpresa, TV-150–TV-156, SV-56). Righe di granularità diversa:
non è una percentuale. Stato della candidata, dalla catena descritta nella legenda.

| Area         |   Righe |  PROVEN | PARTIAL | OPEN-DECISION | EXCLUDED |
| ------------ | ------: | ------: | ------: | ------------: | -------: |
| Inizio       |      12 |      12 |       0 |             0 |        0 |
| Personaggi   |      96 |      96 |       0 |             0 |        0 |
| Campagna     |      88 |      88 |       0 |             0 |        0 |
| Preparazione |      62 |      62 |       0 |             0 |        0 |
| Tavolo       |     156 |     146 |       0 |             7 |        3 |
| Biblioteca   |      46 |      45 |       0 |             0 |        1 |
| Servizi      |      56 |      52 |       0 |             2 |        2 |
| Trasversale  |      12 |      10 |       1 |             1 |        0 |
| **Totale**   | **528** | **511** |   **1** |        **10** |    **6** |

Delle 511 PROVEN, 13 sono «solo test Node» e 15 «simulazione». File di prova delle PROVEN:
revisione finale 83, re-audit 175, re-audit 3 16, audit per area 228, correzioni finali 9.

- **PARTIAL (1):** X-05, le preferenze delle notifiche stanno sia nella campanella sia in
  Preferenze ([final-fixes][ev-final-fixes]).
- **OPEN-DECISION (10):** TV-150–TV-155 e SV-56, capacità dei leader oltre il censimento
  ([Q167][q167]); TV-156 dadi «karmici» ([Q166][q166], raccomandazione: escluderli); X-12 macro
  con codice ([GAP-01][gap-01]); SV-28 politica d'età e consenso dei genitori (requisito legale,
  [I-233][i-233]).
- **EXCLUDED (6):** TV-146 musica ospitata, TV-147 voce e video, TV-148 vista 3D, BI-46
  marketplace, SV-54 sessioni a pagamento, SV-55 IA come DM ([I-233][i-233]).

**Correzioni rispetto alla stesura del 30/09.** Cinque righe erano rimaste PARTIAL con l'esito del
re-audit del 27/09, ma il re-audit 3 del 29/09 le ha trovate funzionanti: CA-61 permessi (anche il
raggruppamento delle pedine), CA-75 contenuti richiesti all'ingresso con un link, CA-88 copia in
un'altra campagna da ogni menu, SV-37 errori con causa e rimedio (circa 75 viste), SV-46 modello
locale simulato ([audit/reaudit3-c][ev-reaudit3-c]). Le sei MISSING e l'esclusione «in proposta»
della stesura sono ora OPEN-DECISION, perché aspettano l'owner. La tabella del 23/09 (103 PROVEN,
159 CONTRACT, 251 MISSING, 6 EXCLUDED) resta nella cronologia del file: misurava i documenti, non
l'app.

## c) Conflitti fra prodotti e scelta raccomandata

Scelte ordinarie di UX prese su delega (I-180/I-190/I-191); le righe marcate
**owner** restano decisioni di intento, privacy, costo o autorità e non sono
risolte qui.

| #   | Conflitto                                         | Posizioni sul mercato                                                                                      | Scelta raccomandata                                                                                                                                | Motivo                                                                                              |
| --- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| C1  | Profondità dell'automazione                       | Midi-QOL catena completa; dnd5e assistito con vassoio; Owlbear quasi nulla nel core (FVT-138/141, VTL-244) | Assistita di default: anteprima per bersaglio e "Applica"; "Automatica" come livello della campagna con Undo e registro (CA-70)                    | Discrezione del DM e correzioni visibili I-028; il vassoio dnd5e toglie la maggior parte degli undo |
| C2  | Onniscienza del DM                                | Foundry, Roll20, FG e DDB mostrano tutto al DM (FVT-048, R20-054, DDB-083)                                 | Copiare i livelli di proprietà, non l'onniscienza: "Solo io" resta privato anche al DM                                                             | Decisioni I-044–I-051 e audit Foundry #2                                                            |
| C3  | Coediting dal vivo vs blocco della voce           | Foundry, LegendKeeper, Quest Portal coediting; DDB blocco "in modifica" (FVT-055, CMP-55, DDB-087)         | Mantenere bozza + confronto + riapplicazione (Inc.7); coediting reale solo nel prodotto con backend                                                | Nessuna sovrascrittura silenziosa; il blueprint non simula tempo reale                              |
| C4  | Tiri nascosti annunciati o silenziosi             | Bones! annuncia; Dice+ e Rumble! silenziosi; Roll20 suono al DM (VTL-172/173, R20-143)                     | Destinatario scelto per tiro; il tiro nascosto del DM si annuncia senza risultato solo se la politica lo consente; mai segnali sonori che rivelano | I-031/I-033; nessuna fuga d'informazione                                                            |
| C5  | Reazioni con timer                                | Solasta clessidra con rinuncia automatica; BG3 senza timer (CRP-140/139)                                   | Nessun timeout di default (già Inc.3); timer solo se il DM lo imposta, mai rinuncia dedotta dal silenzio                                           | Rifiutare una reazione non la consuma; ritmo del tavolo                                             |
| C6  | Varianti d'iniziativa                             | Gruppi, lati, ordine libero, rilancio a ogni round (FVT-130, CMP-158, VTL-115/121)                         | Default 2024 individuale; varianti come regole della casa con fonte e storico (CA-69)                                                              | Baseline 2024 e GAP-07                                                                              |
| C7  | Memoria della nebbia                              | Foundry V14 condivisa; Roll20 e Smoke per giocatore (FVT-160, R20-095, VTL-142)                            | Per giocatore di default; condivisa come opzione della campagna (esagoni, mappe regionali)                                                         | Personaggi separati vedono cose diverse; la condivisa serve all'esplorazione di gruppo              |
| C8  | Ricentrare la vista altrui                        | Roll20 Shift-ping, FG sync client view vs Pulpscape Shift+clic facoltativo (R20-137, VTL-183)              | Solo su scelta esplicita e accettata dal ricevente                                                                                                 | Confine F-051 già registrato                                                                        |
| C9  | Probabilità di colpire ed esame completo          | BG3 mostra % e statistiche; Solasta conoscenza a livelli (CRP-126/134/135)                                 | Conoscenza graduata con concessione del DM; % solo se la politica di divulgazione lo consente                                                      | La % rivela CA e TS; GAP-09                                                                         |
| C10 | Generazione procedurale                           | Kobold+, 5e.tools, donjon, Watabou, Dungeon Alchemist, Owlbear Forecast (CMP-110/117/137, VTL-065/102)     | Non adottata; possibile strumento esplicito futuro (**owner**, riapre F-012/F-013)                                                                 | Confine registrato nelle famiglie                                                                   |
| C11 | Grafo visuale delle relazioni                     | Kanka web, Obsidian graph/Canvas, LegendKeeper Boards (CMP-29/72/89/90)                                    | Elenco di relazioni e retro-collegamenti ora (B43); grafo e lavagna rinviati (**owner**, confine F-014)                                            | F-014 esclude oggi un grafo visuale                                                                 |
| C12 | Collegamenti suggeriti dal testo                  | LegendKeeper, Scabard, Obsidian (CMP-59/84/88)                                                             | Solo suggerimenti confermati e disattivabili, mai estrazione automatica                                                                            | S3 esclude l'estrazione automatica; il suggerimento resta una scelta dell'autore                    |
| C13 | PF temporanei                                     | Game Master's Grimoire alza il massimo; altri separati (VTL-125/126)                                       | Regola 2024: temporanei separati, consumati per primi, non cumulativi                                                                              | Baseline 2024                                                                                       |
| C14 | Dove vive la chat                                 | Rumble! solo nel browser + Discord; Alchemy e Shard persistite (VTL-169/225)                               | Chat e registro persistiti nella campagna                                                                                                          | Conseguenze registrate                                                                              |
| C15 | Import da D&D Beyond                              | Beyond20/AboveVTT su pagine DDB; Shard ha abbandonato l'import (VTL-200, DDB-204)                          | Solo formati documentati; nessuno scraping                                                                                                         | Manutenzione fragile e nessuna API pubblica DDB                                                     |
| C16 | Codice come superficie di automazione             | Roll20 Mod, macro, FG sintassi effetti, Avrae Draconic (R20-109, R20-162, DDB-198)                         | Stesse capacità come moduli e selettori; nessun linguaggio di script (GAP-01 resta aperto)                                                         | Utente non programmatore; sicurezza                                                                 |
| C17 | Tracker manuale vs consapevole delle regole       | Roll20 agnostico; FG automatizza 5E (R20-141, R20-165)                                                     | Profondità FG, semplicità Roll20 (riordino, voci personalizzate, visibilità fra scene)                                                             | Prodotto a sistema unico 2024                                                                       |
| C18 | Voto di gruppo vs parlante singolo                | Solasta II voto; BG3 ascolto (CRP-053/054)                                                                 | Il DM arbitra; voto rapido facoltativo (TV-105)                                                                                                    | Tavolo reale, non videogioco                                                                        |
| C19 | Bottino al primo che apre                         | Solasta II vs offerte e scorta di gruppo (CRP-158, DDB-052)                                                | Offerte e scorta di gruppo, assegnazione esplicita                                                                                                 | INV-07/08                                                                                           |
| C20 | Dadi karmici o seme preservato                    | Solasta, BG3 (CRP-049)                                                                                     | Rifiutati; resta solo il registro contro i ritiri impropri                                                                                         | Dadi equi e registrati                                                                              |
| C21 | Ingresso: link segreto vs approvazione            | Roll20/Kanka link con limiti; Owlbear approvazione; DDB link unico (SVC-028/038/035)                       | Link con ruolo, scadenza, usi e rotazione + approvazione facoltativa                                                                               | Bassa frizione, nessun rientro di chi è stato espulso                                               |
| C22 | Segnali di sicurezza: anonimato vs responsabilità | Rumble! graduato; Alchemy anonimo (SVC-113/110)                                                            | Stop/X anonimi; "Alza la mano" nominativo; nulla salvato senza scelta                                                                              | GAP-16; mai bloccare il gioco                                                                       |
| C23 | Assenze con blocco di 24 ore                      | StartPlaying per sessioni a pagamento (SVC-052)                                                            | Avviso ("inizia fra 3 ore, avvisa il DM"), non blocco; dopo uno spostamento si richiede di nuovo                                                   | Gruppo gratuito fra amici                                                                           |
| C24 | Data del mondo che avanza da sola                 | Kanka avanzamento giornaliero reale (CMP-37)                                                               | Il tempo della finzione avanza solo con gioco o DM (I-087)                                                                                         | Calendario reale ≠ tempo della finzione                                                             |
| C25 | Locale vs cloud                                   | FG locale sull'host; Roll20 solo online (R20-210/209)                                                      | Cloud condiviso + consultazione offline scelta dall'utente (F-026)                                                                                 | Nessuno dei due modelli si trasferisce intero                                                       |
| C26 | Movimento su approvazione del DM                  | FG token locking vs movimento libero (R20-168, I-042)                                                      | Modalità facoltativa per mappa (furtività, imboscate), non default                                                                                 | I-042 conserva il movimento libero                                                                  |
| C27 | Estensioni e marketplace                          | Foundry moduli, Owlbear estensioni vs rischio "troppi moduli" (FVT-207, VTL-206)                           | Prodotto integrato; nessun ecosistema di estensioni nel blueprint (**owner** se riaperto)                                                          | Capacità disperse nei moduli sono un costo noto                                                     |
| C28 | Telefono al Tavolo                                | Roll20 telefono senza mappa; DDB Maps non ottimizzato; Owlbear usabile (SVC-019, DDB-156, VTL-010)         | Prototipare deliberatamente la mappa su telefono (I-129) con prove touch, senza presumerla                                                         | Contro-evidenza sui limiti reali                                                                    |
| C29 | Pubblicazione dell'homebrew                       | DDB coda di moderazione e versioni irreversibili; storia di controlli automatici (DDB-175/176)             | Versioni pubblicate immutabili, nuova versione scelta dagli utenti; moderazione pubblica solo con aree pubbliche (Q161)                            | pages/library e I-067                                                                               |
| C30 | Linee e veli nominativi o anonimi                 | Alchemy anonimo aggregato; fogli cartacei nominativi                                                       | Anonimo aggregato per la tavola, dettaglio visibile solo all'autore                                                                                | Sicurezza senza esposizione                                                                         |

**Decisioni owner rilevate e non risolte qui** (nessuna domanda posta ora):
assistenza AI e trattamento di voce o note (GAP-18: costo e privacy), annunci
pubblici e moderazione (F-063/Q161), politica d'età e consenso dei genitori,
pagine pubbliche di campagna, integrazioni con account esterni reali
(Discord, calendari: GAP-17), generazione procedurale, grafo delle relazioni,
ecosistema di estensioni. Le righe corrispondenti restano MISSING con la nota
"decisione" e non entrano negli incrementi finché l'owner non sceglie.

Aggiornamento del 24/09 ([I-233][i-233]): queste capacità sono poi entrate nel blueprint come
simulazioni dichiarate (B55, B57–B60, BI-45) e sono PROVEN nell'elenco; le decisioni per il
prodotto reale (GAP-17, GAP-18, Q161, SV-28) restano aperte e sono elencate in [NEXT](../NEXT.md).

## d) Backlog di costruzione del blueprint

Obiettivo: arrivare alla candidata completa nell'unica app `design/blueprint/`.
Prima l'**ampiezza** (ondata 1: ogni area e sottoarea diventa visitabile con
comandi funzionanti e almeno un percorso completo), poi la **profondità**
(ondata 2). L'ordine dentro ogni ondata segue il valore per la valutazione
visuale dell'owner. Nessun incremento riduce il perimetro: le righe non
assegnate sono solo quelle in attesa di una decisione owner (sezione c) o
dell'incremento 10.

### Regole per costruire in parallelo

- **Punto di partenza comune.** Checkpoint 10 verificato e B11 integrato nello
  stesso snapshot. Ogni costruttore lavora in un proprio worktree sotto
  `~/Workspace/Codex`, con server statico su una porta propria (8880 + numero)
  e sessione Playwright propria (`d20-bNN`); evidenze in
  `d20-blueprint-evidence/<data>/bNN`. Mai due costruttori sullo stesso browser.
- **Proprietà dei file.** Ogni incremento possiede i nuovi file elencati. Sui
  file esistenti fa soltanto le modifiche elencate, additive (nuove
  esportazioni o hook), senza cambiare firme o comportamenti provati.
  `extensions.mjs` riceve una riga d'importazione per incremento.
- **Stato.** Ogni area registra una sezione `state.ext.<area>` con dati
  d'esempio, migrazione, ripristino e Undo tramite B11; dopo B11 nessuno
  modifica `state.mjs`. Dati sintetici soltanto.
- **Stile.** CSS dell'area con prefisso di classe proprio, caricato dal
  registro. `styles.css` lo toccano solo B22 (token) e poi B31 (veste).
- **Prove.** Test Node `design/blueprint/tests/<area>.test.mjs`; percorso
  browser `changes/interview-01/blueprint-checks/<area>-journey.js` con
  EN/IT, 1440 e 390 px, tastiera, tocco, reload, Undo o correzione, vista DM e
  giocatore, offline simulato quando pertinente. Suite completa verde
  all'integrazione; review distinta del delta.
- **Documenti.** Ogni incremento scrive evidenze e limiti in
  `changes/interview-01/blueprint-<area>-*.md`. Solo il coordinatore aggiorna
  BLUEPRINT_STATUS, gli stati di questo censimento e NEXT.
- **Integrazione in sequenza** dove si tocca lo stesso file esistente, con
  sole aggiunte: B32 → B33 → B34 → B36 → B38 → B40 (`combat.mjs`);
  B35 → B40 (`spatial.mjs`); B35 → B41 → B46 (`table-spatial.mjs`);
  B41 → B47 (`spatial-editor.mjs`); B26 → B36 → B37 → B38 (`characters.mjs`);
  B22 → B31 (`styles.css`). La costruzione può procedere in parallelo;
  cambia soltanto l'ordine di integrazione.

### Ordine e dipendenze

| Ondata | Ordine | ID  | Titolo                                                            | Area         | Dim. | Dipende da                          |
| ------ | -----: | --- | ----------------------------------------------------------------- | ------------ | ---- | ----------------------------------- |
| 0      |      1 | B11 | Cuciture condivise e catalogo SRD d'esempio                       | Trasversale  | M    | checkpoint Inc.10                   |
| 1      |      2 | B12 | Tavolo: menu della pedina, selezione e visibilità                 | Tavolo       | M    | B11 (Inc.10 per le condizioni)      |
| 1      |      3 | B13 | Campagne: creazione, inviti, ingresso e membri                    | Campagna     | M    | B11                                 |
| 1      |      4 | B14 | Tavolo: presentazione, stato della sessione e presenza            | Tavolo       | M    | B11 (B13 facoltativo)               |
| 1      |      5 | B15 | Materiali, handout, spilli e scena senza mappa                    | Preparazione | M    | B11                                 |
| 1      |      6 | B16 | Biblioteca: compendio, lettore, glossario, attribuzione           | Biblioteca   | M    | B11                                 |
| 1      |      7 | B17 | Tavolo: chat, messaggi e archivio                                 | Tavolo       | M    | B11                                 |
| 1      |      8 | B18 | Tavolo: annotazioni, sagome persistenti, misura estesa e segnali  | Tavolo       | M    | B11                                 |
| 1      |      9 | B19 | Preparazione: costruttore d'incontri 2024                         | Preparazione | M    | B11                                 |
| 1      |     10 | B20 | Impostazioni della campagna, permessi, regole, "vedi come"        | Campagna     | M    | B11 (B13 facoltativo)               |
| 1      |     11 | B21 | Personaggi: elenco, privacy, copia, esportazione, condivisione    | Personaggi   | M    | B11                                 |
| 1      |     12 | B22 | Preferenze, accessibilità e unità                                 | Servizi      | M    | B11                                 |
| 1      |     13 | B23 | Ricerca globale, palette dei comandi, scorciatoie                 | Servizi      | M    | B11 (B16 facoltativo)               |
| 1      |     14 | B24 | Centro notifiche e richieste                                      | Servizi      | S    | B11                                 |
| 1      |     15 | B25 | Tabelle casuali e mazzi                                           | Preparazione | M    | B11                                 |
| 1      |     16 | B26 | Tesori, bottino, scorta del gruppo e mercanti                     | Preparazione | M    | B11                                 |
| 1      |     17 | B27 | Sicurezza del tavolo                                              | Campagna     | S    | B11                                 |
| 1      |     18 | B28 | Materiali multimediali                                            | Biblioteca   | M    | B11                                 |
| 1      |     19 | B29 | Account, profilo e dati personali                                 | Servizi      | S    | B11                                 |
| 1      |     20 | B30 | Inizio completo, primi passi, aiuto e novità                      | Inizio       | M    | B11 (B13, B24 facoltativi)          |
| 1      |     21 | B31 | Veste provvisoria migliorata e logo d20 (facoltativo)             | Trasversale  | S    | B22                                 |
| 2      |     22 | B32 | Tracker di combattimento completo                                 | Tavolo       | L    | B11, Inc.10, B12                    |
| 2      |     23 | B33 | Danni, cure e registro dei PF                                     | Tavolo       | M    | B11, Inc.10, B32                    |
| 2      |     24 | B34 | Tiri: richieste del DM, gruppo, destinatari, vassoio              | Tavolo       | M    | B11, B33                            |
| 2      |     25 | B35 | Nebbia, luci e visione                                            | Tavolo       | L    | B11                                 |
| 2      |     26 | B36 | Inventario profondo                                               | Personaggi   | L    | B11 (B26 facoltativo)               |
| 2      |     27 | B37 | Scheda: valori derivati, override motivati, comodità              | Personaggi   | M    | B11, Inc.10, B36                    |
| 2      |     28 | B38 | Magie: gestione, liste, confronto, rituali, oggetti               | Personaggi   | M    | B11, B16, B37                       |
| 2      |     29 | B39 | Creazione: percorsi rapidi, personaggi pronti, controlli          | Personaggi   | M    | B11 (B16 facoltativo)               |
| 2      |     30 | B40 | Movimenti e azioni speciali                                       | Tavolo       | L    | B11, Inc.10 (integra dopo B34, B35) |
| 2      |     31 | B41 | Regioni, trappole e comportamenti                                 | Preparazione | M    | B11, B35                            |
| 2      |     32 | B42 | Mondo: mappa del mondo, calendario, cronologia                    | Campagna     | L    | B11                                 |
| 2      |     33 | B43 | Missioni, fazioni, reputazione e diario strutturato               | Campagna     | L    | B11                                 |
| 2      |     34 | B44 | Gruppo: riepilogo del DM, magie condivise, basi, veicoli          | Campagna     | M    | B11                                 |
| 2      |     35 | B45 | Esplorazione, viaggio e accampamento                              | Tavolo       | L    | B11 (B42, B35, B25 facoltativi)     |
| 2      |     36 | B46 | Conoscenza, esame, furtività e copertura                          | Tavolo       | M    | B11, B35 (B20 facoltativo)          |
| 2      |     37 | B47 | Scene avanzate: livelli, varianti, oggetti, prefabbricati, UVTT   | Preparazione | L    | B11, B41                            |
| 2      |     38 | B48 | Editor homebrew profondo                                          | Biblioteca   | L    | B11, Inc.10                         |
| 2      |     39 | B49 | Avventure e pacchetti riutilizzabili                              | Biblioteca   | M    | B11 (B15, B19, B25 facoltativi)     |
| 2      |     40 | B50 | Dati della campagna: copia, archivio, istantanee, export, cestino | Campagna     | M    | B11, B13                            |
| 2      |     41 | B51 | Sessioni: ricorrenza, assenze, posti e presenze                   | Campagna     | S    | B11                                 |
| 2      |     42 | B52 | Offline scelto e riconnessione                                    | Servizi      | M    | B11                                 |
| 2      |     43 | B53 | Comandi personali e barra rapida                                  | Tavolo       | M    | B11, B34                            |
| 2      |     44 | B54 | Progetti, fabbricazione e progressioni non di classe              | Personaggi   | M    | B11                                 |
| 2      |     45 | B55 | Integrazioni esterne simulate                                     | Servizi      | S    | B11, B24                            |

Dopo B11, tutta l'ondata 1 (B12–B30) può procedere in parallelo; B31 attende
B22. Nell'ondata 2 le catene sono soltanto quelle della tabella.

### Schede degli incrementi

Per ogni incremento: capacità (ID di questo elenco, con gli ID dei censimenti
nelle righe corrispondenti), pattern adottati, file nuovi e toccati,
dipendenze, dimensione e percorsi browser d'accettazione. I percorsi usano i
dati d'esempio (Livia, Doran, Iria, Mira, goblin, cortile, accampamento).

#### B11 — Cuciture condivise e catalogo SRD d'esempio (Trasversale, M)

- **Capacità:** X-05, base di X-08; abilita tutte le altre.
- **Pattern:** superfici di comando fisse di Owlbear (VTL-231); registro unico
  dei comandi di Improved Initiative (CMP-155–157); impostazioni con ambito di
  Foundry (FVT-188) come metadato del registro.
- **Nuovi file:** `design/blueprint/registry.mjs` (rotte, servizi, sezioni di
  campagna, scheda, Preparazione e Biblioteca, strumenti e pannelli del
  Tavolo, voci del menu della pedina, livelli sovrapposti alla mappa,
  fornitori di ricerca, comandi, sezioni di stato, selettore di materiali,
  sezioni di impostazioni); `design/blueprint/extensions.mjs`;
  `design/blueprint/srd-sample.mjs` (incantesimi, creature, oggetti,
  condizioni SRD 5.2.1 con fonte, edizione, revisione, EN/IT);
  `tests/registry.test.mjs`, `tests/srd-sample.test.mjs`,
  `blueprint-checks/registry-smoke-journey.js`.
- **File toccati:** `app.mjs` (rotte, navigazione, servizi e sezioni di
  campagna dal registro; errore di un'estensione isolato), `table.mjs`,
  `characters.mjs`, `preparation.mjs`, `library.mjs`, `campaign.mjs` (hook),
  `state.mjs` (sezioni `ext`, istantanea e ripristino per B50).
- **Accettazione:** (1) un'estensione di prova aggiunge rotta, servizio,
  sezione di campagna, strumento, pannello, voce del menu della pedina e
  sezione di stato; tutto funziona e sopravvive a reload, "Ripristina
  esempio" e Undo. (2) Un'estensione che fallisce mostra un avviso circoscritto
  e l'app resta usabile. (3) Tutti i percorsi browser esistenti e la suite
  Node restano verdi. (4) Il CSS di un'estensione compare solo con essa; nessun
  overflow a 390/1440. (5) Ogni voce SRD d'esempio espone fonte e revisione o
  dichiara la traduzione mancante.

#### B12 — Tavolo: menu della pedina, selezione e visibilità (Tavolo, M)

- **Capacità:** TV-06, TV-15, TV-16, TV-17, TV-18, TV-19, TV-20, TV-22, TV-24,
  TV-26, TV-27, X-06, X-07, X-09.
- **Pattern:** menu ordinato della pedina DDB con scorciatoie e nascosto
  durante il trascinamento (DDB-117); HUD Foundry (FVT-119); menu etichettati
  FG al posto dei radiali (R20-203); pressione lunga Owlbear (VTL-232);
  aritmetica Owl Trackers (VTL-234); selezione, gruppo, blocco e copia DDB
  (DDB-118/119); visibilità per giocatore Smoke (VTL-143); tastiera e nomi
  accessibili riservati Owlbear 2.1 (SVC-167); riga ↔ pedina Clash! (VTL-235).
- **Nuovi file:** `token-menu.mjs`, `token-menu.css`,
  `tests/token-menu.test.mjs`, `blueprint-checks/token-menu-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Il DM apre sul goblin lo stesso menu etichettato con
  clic destro, pressione lunga a 390 px e tastiera (Tab alla pedina, tasto
  Menu). (2) Nel campo PF `-5`, `+3`, `=12` aggiornano scheda, pedina e
  registro; valore non valido conservato e spiegato; Undo ripristina.
  (3) Nascondi: il giocatore non vede pedina né voce d'ordine; il DM la vede
  sbiadita; Rivela; reload conserva. (4) Riquadro + Maiusc su tre PNG,
  raggruppa, blocca, copia e incolla: le copie hanno schede indipendenti.
  (5) Pedina visibile solo a Livia: Doran non la vede. (6) Doppio clic sulla
  riga d'ordine centra la pedina; Tab e frecce leggono nomi accessibili senza
  rivelare nomi segreti. (7) Icone di condizione dal menu, sincronizzate con
  la scheda (dopo Inc.10). (8) Ogni trascinamento ha un'alternativa da menu o
  tastiera.

#### B13 — Campagne: creazione, inviti, ingresso e membri (Campagna, M)

- **Capacità:** CA-02, CA-49, CA-50, CA-51, CA-52, CA-53, CA-54, CA-55, CA-56,
  CA-57, IN-03, IN-05.
- **Pattern:** Foundry Create World con prossima sessione (FVT-001); Roll20 My
  Games e profilo (R20-001, SVC-025); invito Kanka con scadenza, usi, ruolo
  (SVC-038); link Roll20 che ruota all'espulsione e link co-DM monouso
  (SVC-028/029); approvazione Owlbear (VTL-036); ingresso DDB a quattro
  strade e "Reclama" (DDB-073/074); poteri co-DM Roll20 e Assistant GM Foundry
  (SVC-030/044); trasferimento Quest Portal (VTL-040); campanella degli inviti
  (VTL-007).
- **Nuovi file:** `campaign-members.mjs`, `campaign-members.css`,
  `tests/campaign-members.test.mjs`,
  `blueprint-checks/campaign-members-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Crea "Rovine di Vetro" con immagine e prossima data:
  compare in Campagne con filtro attive/archiviate e ultimo accesso.
  (2) Link Giocatore 48 h, un uso: una seconda identità simulata arriva alla
  pagina d'ingresso con quattro strade, entra con Mira dopo l'anteprima dei
  destinatari; il secondo uso è rifiutato con motivo. (3) Con approvazione
  attiva l'ingresso resta in attesa; rifiuto con messaggio. (4) Espelli: il
  link cambia, il vecchio non funziona; il personaggio diventa non assegnato
  e può essere riassegnato o reclamato. (5) Promuovi co-DM: elenco dei poteri
  visibile, "Trasferisci" ed "Elimina" restano al proprietario. (6)
  Trasferimento in attesa, revoca, accettazione dagli inviti in arrivo.
  (7) Cedi il ruolo di DM per una sessione e riprendilo. EN/IT, 390 px.

#### B14 — Tavolo: presentazione, stato della sessione e presenza (Tavolo, M)

- **Capacità:** TV-12, TV-107, TV-110, TV-111, TV-112, TV-113, TV-114, TV-115,
  TV-117, TV-119, TV-130, TV-131, SV-50, CA-21, X-10.
- **Pattern:** DDB Start/Pause/End con messaggi e consigli d'attesa
  (DDB-111, SVC-103, DDB-006) e avviso d'inattività (DDB-112); vista spettatore
  DDB (DDB-132) e Common Display (FVT-163); Player View Roll20 con banner e
  azioni etichettate (R20-128); presenza Alchemy (VTL-043); pausa Foundry
  (FVT-158); nastri del gruppo diviso Roll20 (R20-140); Lock View (FVT-164);
  nascondi interfaccia Owlbear (VTL-191); centrarsi sulle proprie pedine
  Roll20 (R20-152); Ticker e Count! (VTL-178/179); racconto di sessione Quest
  Portal (VTL-054); finestre staccabili Foundry V14 (FVT-199).
- **Nuovi file:** `session-view.mjs`, `session-view.css`,
  `tests/session-view.test.mjs`, `blueprint-checks/session-view-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Il DM nasconde la scena: il giocatore vede il messaggio
  d'attesa con un consiglio; il DM cambia scena in privato; Mostra riporta
  tutti. (2) In pausa il trascinamento del giocatore è rifiutato con motivo.
  (3) Vista spettatore in una nuova scheda: nessuna interfaccia, nessuna
  pedina nascosta o nota DM; segue il cambio di scena; griglia bloccata in
  scala. (4) "Vedi come Livia": banner, registro "DM per Livia", uscita
  pulita. (5) Livia "Assente — torno subito" visibile al gruppo. (6) Doran
  spostato nella Cripta: nastri e "Riunisci". (7) Conto alla rovescia di 5
  minuti e orologio di progresso fissato; nascondi il rimanente ai giocatori.
  (8) Fine sessione: bozza di racconto con presenze, durata, scene, modificabile
  e disattivabile. (9) Arrivo al Tavolo centrato sulla propria pedina.

#### B15 — Materiali, handout, spilli e scena senza mappa (Preparazione, M)

- **Capacità:** PR-07, PR-49, PR-50, PR-51, PR-52, PR-53, TV-108, TV-109.
- **Pattern:** handout Alchemy e pannello per riaprirli (VTL-080/162); spilli
  Roll20 legati a un'intestazione con estratto per i giocatori (R20-099);
  spilli DDB semitrasparenti e organizzatore senza mappa (DDB-099/101); Show
  Players Foundry a tutti o a scelti (FVT-162); rivela dalla pedina DDB
  (DDB-130); scheda Lazy DM con segreti riportati (CMP-124–128); vignette DOS2
  (CRP-072).
- **Nuovi file:** `handouts.mjs`, `session-prep.mjs`, `handouts.css`,
  `tests/handouts.test.mjs`, `tests/session-prep.test.mjs`,
  `blueprint-checks/handouts-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Handout "Lettera sigillata" con immagine, testo per i
  giocatori e nota DM; mostrato solo a Livia; Livia lo riapre dopo reload; la
  nota DM non compare mai. (2) Spillo collegato alla voce "Cripta" e a
  un'intestazione, nascosto di default, semitrasparente con un comando;
  rivelato mostra solo l'estratto. (3) Scena "Taverna" senza mappa attivata al
  Tavolo senza griglia. (4) Rivela l'arte del mimic dalla pedina. (5) Scheda di
  preparazione: segreti spuntati in gioco, i non rivelati passano alla sessione
  seguente. (6) Vignetta con tre scelte: i giocatori vedono le opzioni, l'esito
  lo decide il DM.

#### B16 — Biblioteca: compendio, lettore, glossario e attribuzione (Biblioteca, M)

- **Capacità:** BI-03, BI-04, BI-05, BI-06, BI-07, BI-08, BI-09, BI-10, BI-11,
  BI-12, BI-13, BI-14.
- **Pattern:** elenchi DDB con filtri a faccette e chip (DDB-162); Compendium
  Browser dnd5e (FVT-170); lettore DDB con posizione e segnalibri (DDB-159,
  DDB-208); tooltip DDB e `&Reference` con "Applica" (DDB-166, FVT-176);
  tooltip annidati bloccabili CK3/Rogue Trader (CRP-172); etichette di edizione
  (DDB-165, R20-042); attribuzione SRD EN/IT (SVC-128); Babele per contenuti
  tradotti (SVC-157); pagine classe e liste (FVT-173/174); `@Embed` (FVT-175);
  schermo del DM 5e.tools (CMP-181); errata DDB (DDB-169).
- **Nuovi file:** `compendium.mjs`, `srd-compendium.mjs` (dati aggiuntivi),
  `compendium.css`, `tests/compendium.test.mjs`,
  `blueprint-checks/compendium-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Incantesimi: livello 1 + concentrazione + Mago
  restringono l'elenco; chip rimovibili; conteggio. (2) Dettaglio con fonte
  SRD 5.2.1, revisione ed etichetta 2024; "Prono" nel testo apre un tooltip
  annidato che si può bloccare e seguire. (3) Lettore con indice, posizione,
  precedente/successivo e segnalibro ritrovato dopo reload. (4) La stessa voce
  in IT con attribuzione IT; pagina Legale con le frasi EN e IT. (5) Schermo del
  DM componibile aperto dal Tavolo senza lasciare la scena. (6) Blocco
  statistiche incorporato in una voce di diario, tiro con dado fisico o
  digitale. (7) Stampa di una voce in vista stampabile.

#### B17 — Tavolo: chat, messaggi e archivio (Tavolo, M)

- **Capacità:** TV-98, TV-99, TV-100, TV-101, TV-102, TV-103, TV-104, TV-105,
  TV-126, CA-06, CA-22, CA-23.
- **Pattern:** tipi di messaggio Foundry (FVT-065); parla-come, sussurri al
  personaggio, `/desc` e `/as` Roll20 (R20-145/146); Polyglot (FVT-067); share
  to chat Shard (VTL-158); immagini in chat (FVT-068); Theatre! con raggio
  udibile (VTL-168); voto FG (R20-171); archivio Roll20 con sussurri nascosti
  (R20-065, SVC-081); avviso dei tiri a registro chiuso (DDB-153); forum di
  campagna Roll20 (SVC-083); photo mode BG3 come istantanea (CRP-165).
- **Nuovi file:** `chat.mjs`, `chat.css`, `tests/chat.test.mjs`,
  `blueprint-checks/chat-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Livia scrive in personaggio e fuori personaggio: tipi
  distinti nel registro insieme ai tiri. (2) Sussurro a Doran: solo i
  destinatari lo leggono, anche nell'archivio. (3) Messaggio in Elfico:
  illeggibile per chi non conosce la lingua. (4) Il DM narra e parla come
  "Guardia"; elimina un messaggio lasciando traccia della rimozione.
  (5) "Mani brucianti" condivisa come carta che apre il dettaglio; immagine
  incollata. (6) Voto sì/no con esito. (7) Registro chiuso: badge e avviso di
  nuovi messaggi e tiri. (8) Archivio fra sessioni ed esportazione; pulizia
  con conferma digitata. (9) Discussione asincrona di campagna con fissa.

#### B18 — Tavolo: annotazioni, sagome persistenti, misura estesa e segnali (Tavolo, M)

- **Capacità:** TV-23, TV-37, TV-38, TV-39, TV-41, TV-118, TV-120, TV-121,
  TV-122, TV-123, TV-124.
- **Pattern:** disegni Foundry con autore proprietario e "cancella i miei"
  (FVT-100); Overlays DDB con motivi di danno e visibilità (DDB-123); misura
  Roll20 con forme e condivisione (R20-136); Ranges Owlbear con temi per
  daltonismo (VTL-136); distanze Battle Board (VTL-137); ping Foundry con
  freccia fuori schermo (FVT-157); richiamo facoltativo Pulpscape (VTL-183);
  Tooltips Owlbear (VTL-106); memoria degli strumenti DDB (DDB-126); aure
  (VTL-140).
- **Nuovi file:** `annotations.mjs`, `annotations.css`,
  `tests/annotations.test.mjs`, `blueprint-checks/annotations-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Livia disegna freccia e testo; Doran li vede; "cancella
  i miei" di Doran non tocca quelli di Livia; il DM li nasconde. (2) Sagoma
  persistente "trappola" a cono nascosta ai giocatori; rivelata con motivo
  fuoco; bloccata non si sposta. (3) Misura a cono privata e poi condivisa.
  (4) Ping e ping d'allerta con freccia fuori schermo; "richiama vista" arriva
  come proposta che il ricevente accetta. (5) Anelli di gittata con tema per
  daltonismo; elenco distanze aggiornato dopo un movimento. (6) Aura di 3 m
  che segue la pedina. (7) Nota-suggerimento su una pedina visibile al
  passaggio. (8) L'ultimo colore usato resta dopo reload.

#### B19 — Preparazione: costruttore d'incontri 2024 (Preparazione, M)

- **Capacità:** PR-33, PR-34, PR-35, PR-36, PR-37, PR-38, PR-39, PR-42, PR-43,
  PR-44, PR-45, PR-46.
- **Pattern:** Kobold+ strategia 2024, pannello gruppo, filtri, storico
  (CMP-106–111); selettore e contatore DDB (DDB-091/093/095); "Add All Tokens"
  DDB (DDB-134); gruppi in attesa Battle Board (VTL-085); Token Mold
  (FVT-094); caricamento dal nome Clash! (VTL-083); blocco 2024 Roll20 con
  modifica in linea (R20-102); parser FG e Shard (R20-113, VTL-089); pedine
  predefinite Roll20 (R20-101).
- **Nuovi file:** `encounter-builder.mjs`, `encounter-builder.css`,
  `tests/encounter-builder.test.mjs`,
  `blueprint-checks/encounter-builder-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Nuovo incontro con il gruppo della campagna o un
  gruppo tipo; filtro GS ≤ 1 e Umanoide; quattro goblin: difficoltà 2024
  aggiornata con budget e fonte della tabella. (2) Contatore +/- condivide
  l'iniziativa; "Aggiungi di nuovo" la separa. (3) Gruppo "Rinforzi" in attesa,
  attivato al Tavolo. (4) Salva, duplica, riprendi; l'incontro preparato
  dell'Inc.2 si riapre senza perdere i tiri. (5) Pedine numerate, nomi nascosti
  ai giocatori, PF medi o tirati. (6) Dalla scena: "Crea incontro dalle
  pedine" con lati. (7) Blocco 2024 completo modificato in linea, testo
  convertito in azioni cliccabili con conferma.

#### B20 — Impostazioni della campagna, permessi, regole e "vedi come" (Campagna, M)

- **Capacità:** CA-05, CA-60, CA-61, CA-69, CA-70, CA-71, CA-73, CA-74, PG-94.
- **Pattern:** "View as" Kanka con barra di ritorno (SVC-040); interruttori
  DDB Game Settings (DDB-128); BG3 Custom Mode con blocchi (CRP-040); WotR
  campagna marcata (CRP-050); visibilità della salute FG (R20-167);
  interruttori CD e prove passive BG3 (CRP-042/043); stati delle fonti Roll20
  (R20-183); predefiniti con conteggio Roll20 (R20-087); moduli disattivabili
  Kanka (CMP-24); livello di automazione (FVT-138/141); modifica autorizzata
  della scheda (CMP-18).
- **Nuovi file:** `campaign-settings.mjs`, `campaign-settings.css`,
  `tests/campaign-settings.test.mjs`,
  `blueprint-checks/campaign-settings-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Permessi: spento "i giocatori usano il puntatore", lo
  strumento del giocatore è disabilitato con motivo. (2) "Vedi come Livia":
  banner, note "Solo io" del DM e di Doran invisibili, ritorno. (3) Regole
  della tavola: preset Standard 2024, regola della casa con fonte, autore e
  data; storico dei cambi; regole bloccate dopo l'avvio con lucchetto e
  motivo. (4) Automazione assistita vs automatica: la stessa carta d'attacco
  mostra "Applica" oppure l'effetto applicato con "Annulla". (5) PF nemici
  esatti, a parole o nascosti: la vista giocatore cambia. (6) Fonte legacy
  bloccata: nel builder la voce appare "bloccata in questa campagna".
  (7) Predefinito "nome visibile a" applicato alle esistenti con conteggio
  d'impatto e Undo. (8) Sezione della campagna disattivata sparisce dalla
  navigazione di tutti. (9) Il DM modifica la scheda di Livia solo con la sua
  autorizzazione, con traccia.

#### B21 — Personaggi: elenco, privacy, copia, esportazione e condivisione (Personaggi, M)

- **Capacità:** PG-86, PG-87, PG-88, PG-89, PG-90, PG-91, PG-93, PG-95, PG-96.
- **Pattern:** My Characters DDB (DDB-063); privacy DDB (DDB-061/062);
  libreria Roll20 con Add/Import/Transfer/Release (R20-013–015); PDF DDB
  (DDB-065); JSON Foundry (FVT-205); QR Demiplane (CMP-14); revisioni FG
  (R20-046); registro AL FG (R20-044).
- **Nuovi file:** `character-library.mjs`, `character-export.mjs`,
  `character-library.css`, `tests/character-library.test.mjs`,
  `blueprint-checks/character-library-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Cerca "mago", ordina per livello (conservato), copia
  Iria in una scheda indipendente; elimina con conferma e recupero dal
  cestino. (2) Livia privata: Doran non la vede; pubblica: il link apre una
  scheda in sola lettura senza comandi. (3) Esporta JSON e reimporta con
  anteprima; file malformato senza effetti; vista stampabile e PDF con
  concentrazione e rituali. (4) "Collega alla campagna" vs "porta una copia";
  rilascia; trasferisci con accettazione. (5) Link o QR aperti su telefono in
  sola lettura. (6) Revisione, confronto e ripristino come nuova revisione.

#### B22 — Preferenze, accessibilità e unità (Servizi, M)

- **Capacità:** SV-10, SV-11, SV-12, SV-13, SV-14, SV-15, SV-16, SV-19, SV-20,
  SV-21, SV-22, SV-24, TV-145.
- **Pattern:** ambiti Foundry e opzioni FG bloccate per i giocatori (FVT-188,
  R20-201); tema, scala e font Foundry (FVT-189); fotosensibile (SVC-161);
  daltonismo e testo BG3 (CRP-180/181); font Roll20 (SVC-165); unità BG3
  (CRP-184); Disable Canvas (FVT-190); schermo acceso DDB (DDB-069); Monk's
  Player Settings (FVT-192); volumi per categoria (SVC-124); prove AFB
  (SVC-169).
- **Nuovi file:** `preferences.mjs`, `preferences.css`,
  `tests/preferences.test.mjs`, `blueprint-checks/preferences-journey.js`.
- **File toccati:** `extensions.mjs`; `styles.css` solo per sostituire valori
  fissi con token (dimensioni, colori, movimento).
- **Accettazione:** (1) Ogni voce dichiara l'ambito (questo dispositivo, il mio
  account, questa campagna); il giocatore non cambia una preferenza di
  campagna e ne legge il motivo. (2) Tema chiaro, scuro, di sistema; testo
  125% e scala senza overflow a 390 px. (3) Movimento ridotto: niente
  animazioni di dadi e pedine, anche se lo chiede il sistema. (4) Stati e raggi
  usano forma o parola oltre al colore. (5) EN in piedi, IT in metri; forzare i
  metri in EN converte movimento, misura e raggi. (6) Modalità solo scheda: il
  Tavolo mostra elenco e azioni senza mappa. (7) Volume dei dadi e
  dell'interfaccia. (8) Il DM propone preferenze a un giocatore, che le
  accetta. (9) Ripristino dei predefiniti con conferma. (10) Menu a tendina con
  frecce e caselle etichettate secondo le prove AFB.

#### B23 — Ricerca globale, palette dei comandi e scorciatoie (Servizi, M)

- **Capacità:** SV-02, SV-03, SV-04, SV-17, SV-18, X-08.
- **Pattern:** Quick Insert con prefissi e filtro contestuale (FVT-187);
  OmniSearch Alchemy (VTL-211); K e N di Kanka (CMP-237/238); ricerca fuzzy
  TaleSpire (VTL-203); Configure Controls Foundry con conflitti e reset
  (FVT-191); guida generata Kobold+ (CMP-239); registro Improved Initiative
  (CMP-155–157).
- **Nuovi file:** `command-palette.mjs`, `shortcuts.mjs`,
  `command-palette.css`, `tests/command-palette.test.mjs`,
  `tests/shortcuts.test.mjs`, `blueprint-checks/palette-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Ctrl/Cmd+K ovunque: "liv" trova Livia e le note
  accessibili con badge di tipo; Invio apre, Indietro torna al contesto.
  (2) `>` elenca solo i comandi permessi; `@` filtra le voci. (3)
  "concentrazoine" trova Concentrazione. (4) Dalla scheda Magie la ricerca è
  già filtrata agli incantesimi. (5) N crea una nota rapida e torna. (6) "?"
  mostra la guida generata; ricollegare "Termina turno" a E segnala il
  conflitto; ripristino. (7) Le revoche restano rispettate.

#### B24 — Centro notifiche e richieste (Servizi, S)

- **Capacità:** SV-06, SV-07, SV-08.
- **Pattern:** toast per categoria FG (R20-176); vassoio Foundry (FVT-193);
  notifiche Kanka (SVC-153); avvisi di gruppo BG3 (CRP-055); opt-in Sesh
  (SVC-064).
- **Nuovi file:** `notifications.mjs`, `notifications.css`,
  `tests/notifications.test.mjs`, `blueprint-checks/notifications-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Campanella con conteggio: richiesta di tiro, invito,
  sessione spostata; il clic porta al contesto e segna letto. (2) Categorie
  attivabili e posizione dei toast; nulla arriva senza scelta. (3) Offline:
  notifiche condivise in attesa dichiarate. (4) Annunci `aria-live` in IT/EN.

#### B25 — Tabelle casuali e mazzi (Preparazione, M)

- **Capacità:** PR-57, PR-58, PR-59, PR-60, PR-61, PR-62.
- **Pattern:** Roll Tables Foundry con Normalize e reinserimento (FVT-097);
  Chartopia intervalli impliciti, filtri, variabili, storico (CMP-129–133);
  destinazioni FG (R20-115); Tables+ (VTL-092); modelli FG (R20-116); Cards
  Foundry e mazzi Roll20 (FVT-099, R20-105/149).
- **Nuovi file:** `random-tables.mjs`, `decks.mjs`, `tables-decks.css`,
  `tests/random-tables.test.mjs`, `tests/decks.test.mjs`,
  `blueprint-checks/tables-decks-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Tabella d8 "Incontri nella palude" con pesi,
  intervalli impliciti, sottotabella; Normalizza. (2) Tiro con faccia fisica o
  digitale, catena visibile; senza reinserimento; Reset. (3) L'esito non
  cambia nulla finché non si sceglie chat, diario o bottino. (4) Variabile
  "Stagione" filtra le righe. (5) Mazzo "Destino": mescola, distribuisci due
  carte a Livia (mano privata), gioca scoperta, scarta, rimescola. (6) Storico
  delle estrazioni con note; modello di testo generato.

#### B26 — Tesori, bottino, scorta del gruppo e mercanti (Preparazione, M)

- **Capacità:** PR-47, PR-54, PR-55, PR-56, TV-143, TV-144, CA-79, PG-72.
- **Pattern:** parcel FG e distribuzione con resto (R20-117/079); bottino e
  negozio di Game Master's Grimoire con carrello e contrattazione
  (VTL-095/096); schermata BG3 con riacquisto (CRP-159); Shop sheet Roll20
  (R20-103); negozio da elenco Shard (VTL-097); Party Inventory DDB (DDB-052);
  `/award` dnd5e (FVT-051); equipaggiamento PNG pulito (FVT-092).
- **Nuovi file:** `loot.mjs`, `merchants.mjs`, `party-stash.mjs`, `loot.css`,
  `tests/loot.test.mjs`, `tests/merchants.test.mjs`,
  `blueprint-checks/loot-merchant-journey.js`.
- **File toccati:** `extensions.mjs`; `characters.mjs` solo per esportare
  l'aggiunta di oggetti e monete se oggi non è esportata.
- **Accettazione:** (1) Pacchetto "Forziere" con 120 mo, pozione e anello non
  identificato, legato alla scena. (2) Al Tavolo: pozione a Livia, anello alla
  scorta, "Dividi monete" con resto conservato; schede coerenti; Undo.
  (3) Scorta del gruppo nella scheda con chi ha equipaggiato; oggetto
  equipaggiato da altri non eliminabile. (4) Mercante: carrello, totale netto,
  vendita all'80%, prezzo corretto dal DM, fondi insufficienti bloccano,
  riacquisto. (5) XP e monete assegnati al gruppo con divisione e registro.
  (6) Il bottino di un PNG usa copie pulite senza i bonus del blocco.

#### B27 — Sicurezza del tavolo (Campagna, S)

- **Capacità:** CA-63, CA-64, CA-65, CA-66, CA-67, CA-68.
- **Pattern:** scheda Sicurezza Alchemy anonima (VTL-058, SVC-073);
  promemoria pre-sessione Let's Role (VTL-059); anonimato graduato Rumble!
  (SVC-113); X-Card Alchemy al centro della vista DM (SVC-110); coda "alza la
  mano" Foundry (SVC-111); Stelle e desideri (SVC-076); aspettative DMG 2024
  (SVC-074); filtri BG3 (CRP-183).
- **Nuovi file:** `safety.mjs`, `safety.css`, `tests/safety.test.mjs`,
  `blueprint-checks/safety-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Livia aggiunge una linea e un velo nel profilo; la
  campagna mostra l'elenco combinato senza nomi. (2) Foglio delle aspettative
  compilato dal DM e ricordato prima della sessione, senza traccia non scelta.
  (3) "Stop" anonimo lampeggia al centro della vista DM e avvisa il gruppo senza
  nome; "Alza la mano" nominativo in coda; il gioco non si blocca. (4) Stelle e
  desideri facoltativi a fine sessione. (5) Contenuto marcato sfocato con
  "mostra" per chi ha attivato il filtro.

#### B28 — Materiali multimediali (Biblioteca, M)

- **Capacità:** BI-29, BI-30, BI-31, BI-32, BI-33, BI-34, BI-35, PG-44, CA-25,
  TV-28.
- **Pattern:** File Picker Foundry (FVT-185); Art Library Roll20 (R20-189);
  dock e ruota d'importazione Owlbear (VTL-061/062); "usato in" e allegati
  Kanka (CMP-208/028); risorsa mancante Owlbear (VTL-240); Tokenizer
  (FVT-039); cosmetici della scheda DDB (DDB-058); proprietà degli asset Roll20
  (SVC-138); varianti di pedina (VTL-104); PDF personali (VTL-194).
- **Nuovi file:** `media.mjs`, `media.css`, `tests/media.test.mjs`,
  `blueprint-checks/media-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Carica un ritratto locale (limite dimostrativo),
  cartella "Ritratti", tag; file non valido rifiutato con motivo. (2) Scheda →
  Aspetto: ritratto dal selettore, ritaglio circolare, pedina al Tavolo
  aggiornata. (3) "Usato in" elenca scheda e pedina; sostituire aggiorna
  entrambe. (4) Eliminare un'immagine usata mostra l'elenco; dopo
  l'eliminazione la pedina segnala la risorsa mancante con azione. (5)
  Allegato "solo DM" a una voce del diario. (6) Provenienza e licenza richieste
  per condividere. (7) Seconda immagine della pedina selezionabile dal
  proprietario.

#### B29 — Account, profilo e dati personali (Servizi, S)

- **Capacità:** SV-25, SV-26, SV-27, CA-62, IN-10.
- **Pattern:** avatar DDB (DDB-189); metodi d'accesso DDB e collegamento
  Discord che non è un login (DDB-186, SVC-147); cancellazione DDB con
  conseguenze (DDB-188, SVC-143/144); ultimo accesso opt-in Kanka (SVC-043);
  prova senza account DDB/Forge (DDB-010, VTL-001).
- **Nuovi file:** `account.mjs`, `account.css`, `tests/account.test.mjs`,
  `blueprint-checks/account-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Nome visualizzato e avatar aggiornati in membri e chat.
  (2) Metodi d'accesso elencati come dimostrazione senza autenticazione reale;
  servizio collegato distinto dal login. (3) "Esporta i miei dati" scarica solo
  i dati propri. (4) "Elimina account": conseguenze elencate (campagne da
  trasferire), conferma digitata, finestra di recupero simulata. (5) Ultimo
  accesso visibile solo con consenso. (6) Visita di prova senza account con
  avviso che i dati restano nel browser.

#### B30 — Inizio completo, primi passi, aiuto e novità (Inizio, M)

- **Capacità:** IN-04, IN-06, IN-07, IN-08, IN-09, IN-11, IN-12, SV-47, SV-48,
  SV-49, SV-51, SV-52.
- **Pattern:** Quick Start e Announcements Roll20 (R20-002/003); "Start Here"
  GM Vault (VTL-003); demo Alchemy (VTL-004); tutorial BG3 alla prima
  occorrenza (CRP-001); tour Foundry (FVT-006); "?" FG (R20-012); segnale di
  livello BG3 (CRP-005); Add to Home Roll20 (SVC-178); status DDB e
  segnalazioni Roll20/FG (DDB-191, R20-199/204); anteprime Quest Portal
  (VTL-215).
- **Nuovi file:** `home.mjs`, `help.mjs`, `home.css`, `tests/home.test.mjs`,
  `tests/help.test.mjs`, `blueprint-checks/home-help-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Nuova identità: tre strade; "Prova l'esempio" crea
  "Inizia qui" modificabile e mai condiviso. (2) Con due campagne: prossima
  sessione con conto alla rovescia in ora locale e concordata; "Riprendi" porta
  la bozza del builder alla stessa sezione. (3) "Mira può salire al livello 2"
  porta ad Avanza. (4) Pannello Novità senza pop-up, letto/non letto.
  (5) "?" apre l'aiuto della pagina e torna; suggerimento alla prima
  opportunità archiviato; "Ripristina suggerimenti"; tour facoltativo.
  (6) Diagnostica: archiviazione, rete simulata, versione dei dati; "Segnala un
  problema" prepara un riepilogo senza dati personali. (7) Istruzioni per
  installare l'app sul telefono.

#### B31 — Veste provvisoria migliorata e logo d20 (Trasversale, S, facoltativo)

- **Capacità:** nessuna riga funzionale; presentazione provvisoria richiesta
  dall'owner, non decisione di brand.
- **Pattern:** gerarchia e contrasto valutati con impeccable/frontend-design;
  logo: icosaedro (d20) lineare, leggibile a 16 px.
- **Nuovi file:** `theme-provisional.css`,
  `blueprint-checks/visual-journey.js`.
- **File toccati:** `styles.css` (valori dei token), `ui.mjs` (`logo()`),
  `index.html` (favicon).
- **Accettazione:** (1) Schermate 1440 e 390 di Inizio, scheda, Tavolo,
  Preparazione e Biblioteca con contrasto AA. (2) Logo d20 in intestazione e
  favicon. (3) Nessuna regressione nei percorsi core e gesti. (4) Cosa è
  pronto dichiara lo stile non approvato.

#### B32 — Tracker di combattimento completo (Tavolo, L)

- **Capacità:** TV-48, TV-49, TV-50, TV-51, TV-52, TV-53, TV-54, TV-55, TV-56,
  TV-57, TV-58, TV-59, TV-60, TV-61, TV-82.
- **Pattern:** DDB combattenti nascosti, lettere, corsia d'attesa, "Remove
  from Combat" (DDB-138–141); menu del combattente Foundry (FVT-128);
  raggruppamento, leggendarie e ricarica dnd5e (FVT-130–132); avvisi Monk's
  (FVT-133); voci con formula Roll20 (R20-141); automatismi FG (R20-165);
  Reset/Clear Clash! e fine incontro Shard (VTL-117/155); Mob Attack
  (FVT-137); politica reazioni BG3 (CRP-138); Ready Solasta II (CRP-141);
  timer Improved Initiative (VTL-128).
- **Nuovi file:** `combat-tracker.mjs`, `combat-tracker.css`,
  `tests/combat-tracker.test.mjs`, `blueprint-checks/combat-tracker-journey.js`.
- **File toccati:** `extensions.mjs`; `combat.mjs` con sole esportazioni
  aggiuntive (nascosto, corsia d'attesa, gruppo d'iniziativa).
- **Accettazione:** (1) Goblin nascosto assente dall'ordine del giocatore; al
  suo turno la vista resta sul precedente; rivelato compare con la lettera.
  (2) Tre goblin A/B/C su pedina e ordine; "Goblin D" in corsia d'attesa,
  tiro, Aggiungi. (3) Togli dal combattimento (resta sulla mappa con
  marcatore) vs elimina la pedina (scheda conservata). (4) Gruppo di PNG come
  regola della casa con fonte; default 2024 individuale. (5) Livia riceve "sei
  la prossima" e "tocca a te", indicatore sotto la pedina, suono facoltativo.
  (6) Azioni leggendarie spese dopo il turno altrui; resistenza leggendaria
  con pulsante sul TS fallito; ricarica a inizio turno con dado. (7) Voce "il
  soffitto crolla fra 3 round" che avvisa. (8) Quattro goblin attaccano con un
  comando, risultati distinti. (9) Politica di Livia: Scudo "Chiedi",
  Opportunità "Automatico". (10) Azione preparata con innesco dichiarato.
  (11) Fine incontro con riepilogo XP/tesoro/registro; Reset e Svuota.

#### B33 — Danni, cure e registro dei PF (Tavolo, M)

- **Capacità:** TV-25, TV-68, TV-69, PG-22.
- **Pattern:** vassoio dei danni dnd5e con chip per difesa e moltiplicatori
  (FVT-139); Shieldmaiden colpito/metà/doppio, tipi di danno e overkill
  (CMP-169–175); widget PF identico DDB (DDB-032/142); suggerimenti Improved
  Initiative (VTL-129); Damage Log (FVT-144); Sanguinante/Morto DDB
  (DDB-143).
- **Nuovi file:** `damage-tray.mjs`, `hp-widget.mjs`, `damage.css`,
  `tests/damage-tray.test.mjs`, `blueprint-checks/damage-journey.js`.
- **File toccati:** `extensions.mjs`; `combat.mjs` (opzioni d'applicazione
  aggiuntive, dopo B32).
- **Accettazione:** (1) Mani brucianti su due goblin e una creatura resistente
  al fuoco: vassoio per bersaglio con metà su TS riuscito e chip di
  resistenza; nulla cambia prima di "Applica". (2) Il DM declassa
  un'immunità a resistenza con motivo registrato. (3) Stesso widget PF su
  scheda, pedina e tracker: danno 8 con 5 temporanei consuma prima i
  temporanei; la cura non li aggiunge; massimo modificato con nota. (4) Annulla
  una sola voce del registro PF e riapplicala; conseguenze dipendenti
  segnalate. (5) Livia propone "ho preso 6 danni", il DM accetta o rifiuta.
  (6) Sanguinante/Morto visibili o nascosti secondo la politica.

#### B34 — Tiri: richieste del DM, tiri di gruppo, destinatari e vassoio (Tavolo, M)

- **Capacità:** TV-83, TV-88, TV-89, TV-90, TV-91, TV-92, TV-93, TV-94, TV-95,
  TV-96, TV-97, TV-125, PG-33, PG-48, CA-26.
- **Pattern:** vassoio, tiro sul numero, destinatari e dadi condivisi DDB
  (DDB-149–152); modalità e rivelazione Foundry (FVT-150); scala Roll20
  (R20-143); rivelazione e pila di modificatori FG (R20-172/174/126);
  richiesta dnd5e (FVT-146); tiri di gruppo e contrapposti TokenBar
  (FVT-147); Bones! (VTL-172); Dice+ (VTL-173); 2D Shard (VTL-157); finestre
  BG3 (CRP-131/031); impostazioni Roll20 (R20-032); fornitore esterno Foundry
  (FVT-153); testo eseguibile (FVT-146, VTL-051).
- **Nuovi file:** `dice-tray.mjs`, `roll-requests.mjs`, `dice.css`,
  `tests/dice-tray.test.mjs`, `tests/roll-requests.test.mjs`,
  `blueprint-checks/dice-requests-journey.js`.
- **File toccati:** `extensions.mjs`; `combat.mjs` (destinatario nelle
  evidenze del tiro, dopo B33).
- **Accettazione:** (1) Vassoio "2d6+1d4+3" digitale o con facce fisiche;
  vantaggio; ultimi tiri ripetibili; formula errata spiegata. (2) Menu del
  tiro sul numero da clic destro, pressione lunga e pulsante "…". (3)
  Destinatario "Solo DM" per un tiro: i giocatori vedono l'annuncio senza
  risultato se la politica lo prevede; il DM lo rivela solo a Doran.
  (4) Richiesta di TS Destrezza CD 13 a Livia e Doran come carte; ciascuno tira
  fisico o digitale; riepilogo; nessuna conseguenza automatica. (5) Tiro
  contrapposto. (6) Ispirazione Eroica: interruttore sulla scheda, ritiro dopo
  un fallimento, consumo registrato. (7) Pila "copertura +2" applicata al
  prossimo tiro. (8) Dadi 2D solo per chi tira, spenti con movimento ridotto.
  (9) Una prova scritta in una voce del diario diventa carta di richiesta.
  (10) Politica personale "chiedi sempre il vantaggio".

#### B35 — Nebbia, luci e visione (Tavolo, L)

- **Capacità:** PR-22, PR-23, PR-24, PR-25, PR-26, TV-29, TV-30, TV-31, TV-32,
  TV-33, TV-34, TV-35.
- **Pattern:** nebbia DDB con pennelli per taglia (DDB-121); modalità e
  anteprima Owlbear (VTL-066/067); luci Foundry e transizioni (FVT-077/159);
  pannello luci, Explorer e "update on drop" Roll20 (R20-093–095); visione dai
  sensi FG (R20-122); visione per giocatore Smoke (VTL-142); verifica AboveVTT
  (VTL-144); tipi di barriera Foundry/FG (FVT-075, R20-120).
- **Nuovi file:** `fog-vision.mjs`, `lighting-editor.mjs`, `fog-vision.css`,
  `tests/fog-vision.test.mjs`, `tests/lighting.test.mjs`,
  `blueprint-checks/fog-vision-journey.js`.
- **File toccati:** `extensions.mjs`; `spatial.mjs` (poligono di visibilità,
  solo esportazioni aggiuntive); `table-spatial.mjs` (livello sovrapposto via
  registro).
- **Accettazione:** (1) Copri tutto, rivela una stanza a poligono e col
  pennello Medio; anteprima giocatore; il DM vede attraverso. (2) Torcia con
  raggi 2024 accesa e spenta; oscurità magica la sopprime; ciclo giorno/notte.
  (3) Livia con scurovisione vede oltre la porta aperta ma non oltre il muro
  dell'Inc.4; Doran senza scurovisione vede meno. (4) Memoria per giocatore
  modificabile e azzerabile; opzione "memoria condivisa". (5) Teletrasporto con
  aggiornamento al rilascio: il percorso non si rivela. (6) "Vedi con la
  pedina" dà al DM la vista opaca del giocatore. (7) Finestra e muro
  unidirezionale bloccano secondo tipo. (8) Diagnostica luci con conteggio
  delle fonti. (9) Le pedine controllate restano sopra l'oscurità.

#### B36 — Inventario profondo (Personaggi, L)

- **Capacità:** PG-35, PG-64, PG-65, PG-66, PG-67, PG-68, PG-69, PG-70, PG-71,
  PG-73, PG-74, PG-75, PG-76, TV-70.
- **Pattern:** ricerca, contenitori, monete, dividi, sposta/copia dnd5e
  (FVT-023–027); sintonia, cariche, ingombro, personalizzazione DDB
  (DDB-049–051); non identificati e valute Shard (VTL-020/021); restrizioni e
  set d'armi BG3 (CRP-021/023); munizioni dnd5e (FVT-140); attività multiple
  (FVT-017/018).
- **Nuovi file:** `inventory-plus.mjs`, `inventory-plus.css`,
  `tests/inventory-plus.test.mjs`, `blueprint-checks/inventory-plus-journey.js`.
- **File toccati:** `extensions.mjs`; `characters.mjs` (hook della sezione
  Inventario); `combat.mjs` (consumo di munizioni, esportazione aggiuntiva).
- **Accettazione:** (1) Zaino dentro una borsa conservante: peso escluso,
  capacità superata segnalata. (2) Converti monete, spostale in un
  contenitore, trasferiscile a Doran con offerta accettata. (3) Dividi 20
  frecce; sposta o copia a Doran secondo i permessi. (4) Tre posti di
  sintonia, il quarto rifiutato con motivo. (5) Bacchetta con cariche che si
  ricaricano all'alba dell'orologio. (6) L'attacco con l'arco consuma una
  freccia; recupero a fine scontro secondo la regola 2024 con fonte.
  (7) Ingombro variante riduce la velocità con spiegazione. (8) Anello non
  identificato identificato dal DM. (9) Cambio di set d'armi e restrizione
  spiegata. (10) Bastone con tre attività e dialogo d'uso. (11) Ricerca e filtri
  per rarità e sintonia.

#### B37 — Scheda: valori derivati, override motivati e comodità (Personaggi, M)

- **Capacità:** PG-17, PG-24, PG-25, PG-26, PG-29, PG-30, PG-32, PG-36, PG-39,
  PG-40, PG-43, PG-47, PG-80.
- **Pattern:** Play/Edit dnd5e (FVT-008); ingranaggio con override e ordine
  di cumulo Roll20 (R20-024/023); difese, sensi, velocità, abilità DDB
  (DDB-028–031); filtri d'azione DDB (DDB-039); preferiti e tooltip dnd5e
  (FVT-009/010); note per sezioni DDB (DDB-056); interruttori Beyond20
  (VTL-013); XP DDB (DDB-024); riselezione Shard (VTL-017).
- **Nuovi file:** `sheet-plus.mjs`, `sheet-plus.css`,
  `tests/sheet-plus.test.mjs`, `blueprint-checks/sheet-plus-journey.js`.
- **File toccati:** `extensions.mjs`; `characters.mjs` (hook delle sezioni,
  dopo B36).
- **Accettazione:** (1) Gioco mostra valori effettivi e azioni, Modifica i
  valori base e la costruzione; la scelta resta sul dispositivo. (2) CA:
  override "bonus magico +1" con nota; il totale mostra la catena nell'ordine
  dichiarato; rimozione. (3) Resistenza al fuoco con fonte più una
  personalizzata con asterisco; duplicati uniti. (4) Volare 9 m aggiunto e
  usato dal movimento al Tavolo. (5) Filtro Bonus e azioni generiche 2024 con
  descrizione. (6) Preferiti con stella e uso dalla striscia. (7) Benedizione
  attiva: +1d4 visibile nel dettaglio di attacchi e TS, poi disattivata. (8)
  +300 XP propone il livello; modalità a traguardi. (9) Tooltip ricco su CA e
  Iniziativa. (10) Abilità personalizzata e abilità preferite in alto. (11)
  Note Alleati/Nemici. (12) Scelta da riselezionare dopo un riposo lungo.

#### B38 — Magie: gestione, liste, confronto, rituali e oggetti (Personaggi, M)

- **Capacità:** PG-53, PG-54, PG-55, PG-56, PG-57, PG-58, PG-59, PG-60, PG-61.
- **Pattern:** Manage Spells DDB (DDB-043); preparazione dnd5e (FVT-021);
  libro, varianti e avviso di concentrazione BG3 (CRP-018/100/104); dialogo
  d'uso e lancio da oggetti dnd5e (FVT-018/020); rituale DDB (DDB-042);
  componenti Solasta II (CRP-047).
- **Nuovi file:** `spells-plus.mjs`, `spells-plus.css`,
  `tests/spells-plus.test.mjs`, `blueprint-checks/spells-plus-journey.js`.
- **File toccati:** `extensions.mjs`; `characters.mjs` (sezione Magie, dopo
  B37); `combat.mjs` (opzioni di lancio aggiuntive).
- **Accettazione:** (1) Iria aggiunge incantesimi dal compendio filtrato alla
  sua classe, prepara e toglie; "sempre preparato" non si toglie; messaggio
  quando la preparazione non è modificabile. (2) Lista "Esplorazione" salvata e
  richiamata come proposta con differenze. (3) Confronto affiancato e ritorno
  alla scelta. (4) Rituale: +10 minuti all'orologio, nessuno slot. (5) Icona
  unica con livelli disponibili. (6) Bacchetta: cariche, non slot. (7) Avviso
  di nuova concentrazione. (8) Trascrizione con tempo e costo. (9) Focus o
  componente materiale mancante segnalato.

#### B39 — Creazione: percorsi rapidi, personaggi pronti e controlli (Personaggi, M)

- **Capacità:** PG-09, PG-10, PG-11, PG-12, PG-13, PG-14, PG-15, PG-16, PG-19.
- **Pattern:** Quickbuilder e Premade DDB (DDB-009/010); nomi suggeriti
  (DDB-021); prerequisiti con eccezione e competenze duplicate (DDB-016/017);
  equipaggiamento iniziale (DDB-019); fonti con spiegazione (DDB-015); Level
  Down dnd5e (FVT-012); respec BG3 (CRP-014); co-costruzione Quest Portal
  (VTL-022).
- **Nuovi file:** `builder-plus.mjs`, `builder-plus.css`,
  `tests/builder-plus.test.mjs`, `blueprint-checks/builder-plus-journey.js`.
- **File toccati:** `extensions.mjs`; `character-builder.mjs` (hook di
  sezione, aggiuntivo).
- **Accettazione:** (1) Percorso rapido di livello 1 con pagine di dettaglio,
  nome suggerito e ritratto; si chiude sulla scheda e resta modificabile.
  (2) Personaggio pronto: anteprima, Reclama, copia personale. (3) Talento con
  prerequisito mancante bloccato con motivo; "Consenti eccezione" lascia un
  avviso permanente. (4) Competenza duplicata liberata con avviso. (5)
  Pacchetti o oro tirato; riapribile. (6) Fonti legacy spente: "3 opzioni
  nascoste". (7) Guerriero 2 / Mago 1 con prerequisiti; scendere di livello con
  anteprima delle concessioni rimosse; respec completo. (8) DM e giocatore
  sulla stessa bozza con conflitti espliciti (due identità simulate).

#### B40 — Movimenti e azioni speciali (Tavolo, L)

- **Capacità:** TV-07, TV-08, TV-09, TV-10, TV-11, TV-71, TV-72, TV-74, PG-37,
  PG-79.
- **Pattern:** anteprima di salto e spinta BG3 (CRP-107/108); lancio BG3
  (CRP-109); caduta dnd5e (FVT-145); azioni 2024 DDB (DDB-039); due livelli
  XCOM (CRP-113); storico Foundry (FVT-112); Not Your Turn e Token Locking
  (FVT-114, R20-168); diagonali ed esagoni (R20-086, CRP-121); Alt BG3
  (CRP-148); indisponibilità BG3 (CRP-103); maestria DDB (DDB-041);
  cavalcature e Metamorfosi (FVT-034).
- **Nuovi file:** `special-moves.mjs`, `special-moves.css`,
  `tests/special-moves.test.mjs`, `blueprint-checks/special-moves-journey.js`.
- **File toccati:** `extensions.mjs`; `spatial.mjs` (modi di movimento,
  aggiuntivi, dopo B35); `combat.mjs` (tipi d'azione aggiuntivi, dopo B34).
- **Accettazione:** (1) Afferrare con Colpo senz'armi 2024 e TS del bersaglio;
  spingere a Prono o di 1,5 m con anteprima. (2) Salto in lungo con anteprima
  che spende movimento; caduta di 6 m con richiesta 2d6. (3) Arrampicata e
  nuoto a costo doppio; volo con quota visibile. (4) Arma da lancio con gittata
  normale e lunga. (5) Aiutare, Nascondersi, Cercare, Studiare, Influenzare,
  Usare con esito e descrizione. (6) Righello a due livelli, storico del turno,
  "ultima mossa". (7) Mappa con movimento su approvazione: proposta del
  giocatore, approvazione o annullo del DM. (8) Alt mostra etichette. (9)
  Regola diagonale ed esagoni facoltativi. (10) Maestria della spada applicata
  e spiegata. (11) Cavalcatura e Metamorfosi collegate alle forme dell'Inc.9.
  (12) Ogni azione indisponibile spiega il motivo.

#### B41 — Regioni, trappole e comportamenti (Preparazione, M)

- **Capacità:** PR-27, PR-28, PR-29, PR-30, PR-31, TV-42.
- **Pattern:** Scene Regions Foundry (FVT-082); elenco curato Monk's Active
  Tiles (FVT-084); aree con effetti dnd5e (FVT-117); Reactions Roll20 con
  "Reaction ready" (R20-098); Stairways e Portals (FVT-086, VTL-100); effetti
  globali FG (R20-164).
- **Nuovi file:** `regions.mjs`, `regions.css`, `tests/regions.test.mjs`,
  `blueprint-checks/regions-journey.js`.
- **File toccati:** `extensions.mjs`; `spatial-editor.mjs` (strumento via
  registro); `table-spatial.mjs` (evento di movimento, aggiuntivo, dopo B35).
- **Accettazione:** (1) Regione "Lastra a pressione" su ingresso: TS Destrezza
  CD 13, poi 2d6 perforanti, una volta. (2) Livia entra: il movimento si ferma
  al confine, il TS è richiesto, l'esito si applica dopo il tiro; "Riarma".
  (3) Percezione scopre la trappola e la segna per il gruppo; disinnesco con
  strumenti. (4) Terreno difficile e "1d4 fuoco a inizio turno". (5) Scale fra
  Cortile e Cripta con conferma. (6) Il DM vede in anteprima gli eventi e può
  annullarli; nessuna esecuzione silenziosa.

#### B42 — Mondo: mappa del mondo, calendario e cronologia (Campagna, L)

- **Capacità:** CA-28, CA-29, CA-30, CA-32, CA-33, CA-34, CA-35.
- **Pattern:** Map Explorer Kanka senza modalità separata (CMP-41–48); mappe
  annidate LegendKeeper (CMP-64–68); Chronicles World Anvil (CMP-79); Fantasy
  Calendar (CMP-98/100); Calendaria (FVT-062); cronologie LegendKeeper
  (CMP-69).
- **Nuovi file:** `world-map.mjs`, `world-calendar.mjs`, `world.css`,
  `tests/world-map.test.mjs`, `tests/world-calendar.test.mjs`,
  `blueprint-checks/world-journey.js`.
- **File toccati:** `extensions.mjs`; `rest-time.mjs` solo per esportare la
  lettura dell'orologio se manca.
- **Accettazione:** (1) Mappa regionale con spillo "Porto Grigio" collegato
  alla voce, gruppo "Città", spillo solo DM, legenda con ricerca. (2) Spillo
  che apre la mappa della città e ritorno. (3) Misura con tappe e stima dei
  giorni per passo (fonte 2024). (4) Calendario con mesi e due lune; la data è
  quella dell'orologio del Tavolo; otto ore al Tavolo aggiornano il
  calendario. (5) Evento "Eclissi" solo DM con promemoria, poi rivelato.
  (6) Cronologia con ere; lo spillo mostra la storia del luogo.

#### B43 — Missioni, fazioni, reputazione e diario strutturato (Campagna, L)

- **Capacità:** CA-13, CA-14, CA-15, CA-16, CA-17, CA-19, CA-20, CA-24, CA-36,
  CA-37, CA-38, CA-39, CA-40.
- **Pattern:** Quest Log Forien (FVT-058); diario BG3 (CRP-062); Elements,
  Property Kits e relazioni Kanka (CMP-32/27/29); atteggiamenti DOS2
  (CRP-061); PNG importante dnd5e (FVT-091); connessioni segrete Scabard
  (CMP-83); `/secret` e pagine annidate LegendKeeper (CMP-56/60); schede Monk's
  (FVT-057); backlinks e Bases Obsidian (CMP-88/91).
- **Nuovi file:** `quests.mjs`, `factions.mjs`, `journal-plus.mjs`,
  `journal-plus.css`, `tests/quests.test.mjs`, `tests/factions.test.mjs`,
  `tests/journal-plus.test.mjs`, `blueprint-checks/quests-factions-journey.js`.
- **File toccati:** `extensions.mjs`; `campaign-content.mjs` (registro dei
  tipi di voce, aggiuntivo).
- **Accettazione:** (1) Missione "Il sigillo spezzato" con obiettivi,
  sotto-obiettivi, committente e ricompensa; stato In corso → Completata; la
  ricompensa segreta resta al DM. (2) Blocco segreto rivelato a tutti o a
  Livia. (3) Reputazione del gruppo e di Livia presso una fazione con storico
  motivato, visibile solo se condivisa. (4) PNG importante con atteggiamento e
  connessione segreta. (5) Retro-collegamenti e suggerimento di collegamento
  confermato o disattivato. (6) Vista a colonne "Missioni aperte"; kit
  "Taverna"; nuove voci persona, organizzazione, negozio. (7) Pagina annidata
  creata dal testo. (8) Schede aperte con avanti e indietro. (9) Relazioni come
  elenco; nessun grafo (confine F-014).

#### B44 — Gruppo: riepilogo del DM, magie condivise, basi e veicoli (Campagna, M)

- **Capacità:** CA-03, CA-04, CA-76, CA-78, CA-80, CA-81, PG-82.
- **Pattern:** Party Overview (FVT-071); Party Sheet FG (R20-078); Bastion
  dnd5e (FVT-037); veicolo del gruppo dnd5e (FVT-050); widget e cruscotti per
  ruolo Kanka (CMP-21/22); Message of the Day FG (R20-082).
- **Nuovi file:** `party.mjs`, `bastions.mjs`, `party.css`,
  `tests/party.test.mjs`, `tests/bastions.test.mjs`,
  `blueprint-checks/party-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Riepilogo DM con PF, CA, passive, lingue, TS; nascondi
  un giocatore; schede raggiungibili. (2) Magie condivise per livello, sola
  consultazione. (3) Bastione di un personaggio di livello 5 d'esempio:
  strutture, ordine con costo, turno avanzato dal DM, esito nel registro.
  (4) Veicolo "Carro" con velocità e carico. (5) Cruscotto della campagna con
  riquadri riordinabili e diversi per ruolo. (6) Messaggio d'inizio sessione
  all'ingresso al Tavolo.

#### B45 — Esplorazione, viaggio e accampamento (Tavolo, L)

- **Capacità:** TV-116, TV-132, TV-133, TV-134, TV-135, TV-136, TV-137, TV-138.
- **Pattern:** formazione e guardie FG (R20-080); catena e "Group All" BG3
  (CRP-123); Place Party Roll20 (R20-064); viaggio Solasta II (CRP-065/067);
  Simple Weather (FVT-064); provviste Rest Recovery (FVT-033); ruoli
  d'accampamento WotR (CRP-155); luce FG (R20-121); Search BG3 (CRP-133).
- **Nuovi file:** `travel.mjs`, `camp.mjs`, `exploration.css`,
  `tests/travel.test.mjs`, `tests/camp.test.mjs`,
  `blueprint-checks/travel-camp-journey.js`.
- **File toccati:** `extensions.mjs`; `rest-ui.mjs` (hook d'accampamento,
  aggiuntivo).
- **Accettazione:** (1) Griglia di marcia e "posiziona il gruppo qui" che
  mantiene la formazione. (2) Viaggio a passo lento, normale o veloce con
  effetti e fonte SRD; giorni e orologio avanzano; evento da tabella proposto,
  non applicato. (3) Meteo del giorno con effetto dichiarato, modificabile dal
  DM. (4) Consumo delle provviste proposto con consenso; la mancanza avvisa
  senza Indebolimento automatico. (5) Turni di guardia con Percezione;
  un evento interrompe il riposo dell'Inc.8. (6) Torcia di un'ora legata
  all'orologio con avviso a 10 minuti e consumo. (7) Cercare elenca i
  ritrovamenti e i contenitori vuoti.

#### B46 — Conoscenza, esame, furtività e copertura (Tavolo, M)

- **Capacità:** TV-43, TV-44, TV-75, TV-76, TV-139, TV-140, TV-141, TV-142.
- **Pattern:** bestiario a livelli Solasta (CRP-135); conoscenza condivisa
  WotR (CRP-136); Examine BG3 (CRP-134); ID FG e Anonymous (R20-155, FVT-126);
  coni e perdita spiegata BG3 (CRP-144/145); copertura XCOM (CRP-116);
  Peekaboo (VTL-138); modificatori sotto il bersaglio BG3 (CRP-119); % BG3
  (CRP-126); borseggio BG3 (CRP-151).
- **Nuovi file:** `knowledge.mjs`, `cover.mjs`, `knowledge.css`,
  `tests/knowledge.test.mjs`, `tests/cover.test.mjs`,
  `blueprint-checks/knowledge-cover-journey.js`.
- **File toccati:** `extensions.mjs`; `table-spatial.mjs` (calcolo copertura,
  aggiuntivo, dopo B41).
- **Accettazione:** (1) Esamina goblin a livello 1; una prova riuscita sale al
  livello 2; il DM concede livelli; mai dati non concessi. (2) "Figura
  incappucciata" con nome sostituito in ordine, registro e chat fino alla
  rivelazione. (3) Livia nascosta: chi l'ha notata è visibile solo al DM;
  perdita dello stato spiegata. (4) Copertura ½/¾/totale alla destinazione e
  +2 CA nel dettaglio dell'attacco. (5) Verifica della linea di vista privata o
  pubblica. (6) Modificatori sotto il bersaglio; % solo se la politica lo
  consente. (7) Borseggio con prova e decisione del DM.

#### B47 — Scene avanzate: livelli, varianti, oggetti, prefabbricati, UVTT (Preparazione, L)

- **Capacità:** PR-03, PR-06, PR-08, PR-09, PR-10, PR-11, PR-12, PR-13, PR-14,
  PR-15, TV-13.
- **Pattern:** cartelle Roll20 (R20-084); varianti Shard e Quest Portal
  (VTL-075/077); Scene Levels Foundry (FVT-080/081); cambio piano XCOM
  (CRP-118); tile e palette Foundry (FVT-078/079); adesivi DDB (DDB-107);
  Foreground Roll20 (R20-097); Prefabs, Outliner e Default View Owlbear
  (VTL-081/107/109); UVTT e area fuori mappa Roll20 (R20-089/091);
  allineamento Owlbear (VTL-063); viste salvate AboveVTT/TTS (VTL-165).
- **Nuovi file:** `scene-assets.mjs`, `scene-levels.mjs`, `uvtt-import.mjs`,
  `scene-assets.css`, `tests/scene-assets.test.mjs`,
  `tests/uvtt-import.test.mjs`, `blueprint-checks/scene-advanced-journey.js`.
- **File toccati:** `extensions.mjs`; `spatial-editor.mjs` (strumenti via
  registro, dopo B41); `preparation.mjs` (hook dell'elenco scene).
- **Accettazione:** (1) Cartelle per capitolo, ricerca, archivia e ripristina.
  (2) Variante notturna con stessa geometria e spilli, cambiata dal DM al
  Tavolo. (3) Torre a due piani con muri e pedine per piano e scala che sale.
  (4) Adesivo bloccato e nascosto; tetto che sfuma quando una pedina entra.
  (5) Prefabbricato "Accampamento goblin" inserito in un'altra scena.
  (6) Modifica in blocco di cinque alberi; elenco con "trova". (7) File UVTT
  d'esempio: immagine, muri, porte e luci modificabili; file errato rifiutato.
  (8) Allineamento in tre passi con lente, su telefono lontana dal dito.
  (9) Area fuori mappa, vista iniziale e viste salvate.

#### B48 — Editor homebrew profondo (Biblioteca, L)

- **Capacità:** BI-17, BI-18, BI-19, BI-20, BI-21, BI-22, BI-23, BI-24, BI-25,
  BI-26, BI-27, BI-28, BI-43.
- **Pattern:** editor di attività e avanzamenti dnd5e (FVT-180/181); Active
  Effects e DAE (FVT-182/183); ancore di durata FG come scelte (R20-161);
  Modifier Builder Roll20 (R20-023); sotto-moduli e creatore di mostri DDB
  (DDB-173/174/110); Tetra-cube (CMP-152); Forge e Revert FG (R20-118/114);
  Find the Culprit (FVT-198); trasparenza Roll20 (R20-185); importer Kobold+
  (CMP-112); pubblicazione e versioni DDB (DDB-175/176/178).
- **Nuovi file:** `homebrew-editor.mjs`, `homebrew-editor.css`,
  `tests/homebrew-editor.test.mjs`, `blueprint-checks/homebrew-editor-journey.js`.
- **File toccati:** `extensions.mjs`; `homebrew.mjs` (schema aggiuntivo).
- **Accettazione:** (1) Talento da modello con prerequisito "For 13 o Des 13",
  opzione "scegli 1 di 2", +1 CA con ordine di cumulo; prova isolata su una
  scheda di prova; abilitazione della revisione. (2) Attività con TS e
  condizione "fino all'inizio del tuo prossimo turno" scelta da elenco; al
  Tavolo scade nel momento giusto. (3) Sottoclasse con privilegi ai livelli
  3/6/10 applicata dall'avanzamento di Mira. (4) Mostro con sezioni
  leggendarie e tana e blocchi tirabili; import CSV di tre mostri con errori
  per riga. (5) "Spada lunga" + modello "+1"; ripristina alla fonte.
  (6) Homebrew disattivato per la campagna e riattivato. (7) Pubblicazione
  simulata con versione immutabile e nuova versione scelta dagli utenti.
  (8) Livello di automazione dichiarato per ogni voce.

#### B49 — Avventure e pacchetti riutilizzabili (Biblioteca, M)

- **Capacità:** BI-36, BI-37, BI-38, BI-39, BI-40, BI-41, BI-44, CA-75.
- **Pattern:** Adventure Foundry con Rebuild rosso/verde (FVT-177); azioni
  d'import dnd5e (FVT-005); patch Roll20 (R20-186, SVC-132); Scene Packer
  (FVT-179); Universe Alchemy (VTL-079); verifica mod BG3 (CRP-171); "Create
  game with module" Roll20 (R20-187); export di libro Shard (VTL-199).
- **Nuovi file:** `adventures.mjs`, `adventures.css`,
  `tests/adventures.test.mjs`, `blueprint-checks/adventures-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Avventura "La cripta" da scene, PNG, handout e tabelle
  con dipendenze elencate. (2) Import in un'altra campagna per tipo, con
  avviso di sovrascrittura, riferimenti ricollegati e progresso separato.
  (3) Nuova versione con differenze; l'aggiornamento non sovrascrive le voci
  modificate e propone una copia. (4) Ingresso con homebrew mancante: verifica
  con un'azione per voce. (5) Nuova campagna da avventura con scena iniziale e
  introduzione facoltative. (6) Esportazione dell'avventura in HTML
  stampabile.

#### B50 — Dati della campagna: copia, archivio, istantanee, export e cestino (Campagna, M)

- **Capacità:** CA-83, CA-84, CA-85, CA-86, CA-87, CA-88.
- **Pattern:** Copy Game, cold storage e rollback Roll20 (R20-066/206/068);
  ripristino come copia FG (R20-083); export e recupero Kanka (SVC-084,
  CMP-212); cancellazione con titolo Foundry (FVT-003); istantanee
  LegendKeeper e diff Obsidian (CMP-216/221); Transmogrifier (R20-067).
- **Nuovi file:** `campaign-data.mjs`, `campaign-data.css`,
  `tests/campaign-data.test.mjs`, `blueprint-checks/campaign-data-journey.js`.
- **File toccati:** `extensions.mjs` (istantanea e ripristino da B11).
- **Accettazione:** (1) Copia scegliendo i componenti: campagna nuova e
  indipendente. (2) Archivio con elenco di ciò che resta bloccato; ripristino.
  (3) Istantanea "prima della battaglia", modifica, ripristino come copia senza
  sovrascrivere. (4) Export JSON e Markdown; reimport in nuova campagna con
  anteprima; note "Solo io" altrui mai esportate. (5) Eliminazione con nome
  digitato, cestino e recupero. (6) Copia della scena in un'altra campagna
  propria con avviso.

#### B51 — Sessioni: ricorrenza, assenze, posti e presenze (Campagna, S)

- **Capacità:** CA-44, CA-45, CA-46, CA-48.
- **Pattern:** cadenza e blocchi StartPlaying (SVC-048/049); ricorrenza
  Discord (SVC-056); Skipping StartPlaying (SVC-052/053); attesa Sesh e FIFO
  Warhorn (SVC-058, SVC-009); registro Sesh (SVC-061).
- **Nuovi file:** `sessions-plus.mjs`, `sessions-plus.css`,
  `tests/sessions-plus.test.mjs`, `blueprint-checks/sessions-plus-journey.js`.
- **File toccati:** `extensions.mjs`; `campaign-sessions.mjs` (esportazioni
  aggiuntive).
- **Accettazione:** (1) Ricorrenza settimanale con dieci date; modifica di una
  sola o di tutte. (2) "Salto la prossima" distinto da "lascio la campagna";
  dopo uno spostamento le risposte si chiedono di nuovo; a tre ore
  dall'inizio avviso, non blocco. (3) Posti e lista d'attesa con avviso quando
  si libera un posto. (4) Presenze registrate e visibili nel resoconto.

#### B52 — Offline scelto e riconnessione (Servizi, M)

- **Capacità:** SV-31, SV-32, SV-34.
- **Pattern:** "Available offline" Notion con elenco (CMP-222); download DDB
  (DDB-207); sincronizzazione LegendKeeper (CMP-218); riconnessione DDB e
  indicatore Solasta II (DDB-155, CRP-188).
- **Nuovi file:** `offline.mjs`, `offline.css`, `tests/offline.test.mjs`,
  `blueprint-checks/offline-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) "Disponibile offline" su una scheda e sulle note; la
  pagina Impostazioni elenca cosa lo è. (2) Offline simulato: modifiche
  personali in coda con stato; condivise bloccate con motivo. (3) Al ritorno,
  conflitto con una modifica altrui: confronto e scelta, nessuna sovrascrittura.
  (4) Indicatore di connessione e riconnessione simulata.

#### B53 — Comandi personali e barra rapida (Tavolo, M)

- **Capacità:** X-11, PG-38.
- **Pattern:** barra rapida e azioni di pedina Roll20 (R20-148/035); pannelli
  condivisibili Dice+ (VTL-174); QuickBar Let's Role (VTL-184); pagine Foundry
  (FVT-194/195); collocazione dei comandi Improved Initiative (CMP-157);
  azioni componibili Alchemy (VTL-028); azioni personalizzate DDB (DDB-040).
- **Nuovi file:** `quickbar.mjs`, `quickbar.css`, `tests/quickbar.test.mjs`,
  `blueprint-checks/quickbar-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) "Attacco con spada" trascinato sulla barra o aggiunto
  da menu e tastiera; rinomina, colore, riordino anche al tocco. (2) Tiro
  salvato validato e usato con dado fisico o digitale. (3) Sequenza con esito
  per passo e permessi; interruzione motivata. (4) Barra della pedina
  selezionata. (5) Pannello condiviso con Doran come copia. (6) Pagine e tasti
  1–0. (7) Azione personalizzata con tiro e danno creata dalla scheda.

#### B54 — Progetti, fabbricazione e progressioni non di classe (Personaggi, M)

- **Capacità:** PG-18, PG-83, PG-84.
- **Pattern:** Crash's Tracking (FVT-042); meter LegendKeeper (CMP-63);
  Mastercrafted (FVT-043); manuali Solasta (CRP-030); albero separato BG3
  (CRP-019).
- **Nuovi file:** `projects.mjs`, `crafting.mjs`, `projects.css`,
  `tests/projects.test.mjs`, `tests/crafting.test.mjs`,
  `blueprint-checks/projects-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) Progetto "Imparare l'Elfico" con passi, barra e tempo
  speso dall'orologio. (2) Pozione di guarigione con strumento, tempo e costo
  2024; materiali verificati; oggetto aggiunto al completamento; annullo che
  restituisce i materiali. (3) Traccia non di classe con prerequisiti.

#### B55 — Integrazioni esterne simulate (Servizi, S)

- **Capacità:** SV-38, SV-39, SV-40, CA-47, PG-92.
- **Pattern:** relay Foundry→Discord (SVC-121); Avrae `!campaign` (SVC-116);
  iCal Sesh (SVC-065); scheda esterna Owlbear (VTL-034); import documentato
  Avrae (DDB-194).
- **Nuovi file:** `integrations.mjs`, `integrations.css`,
  `tests/integrations.test.mjs`, `blueprint-checks/integrations-journey.js`.
- **File toccati:** `extensions.mjs`.
- **Accettazione:** (1) "Inoltro a Discord (simulato)": anteprima dei
  messaggi per tiri pubblici e avvisi; i tiri privati non compaiono; nessuna
  chiamata di rete nel pannello di rete. (2) Download locale del file .ics
  della prossima sessione con ora corretta. (3) Link a una scheda esterna su
  una pedina, aperto in una nuova scheda senza importare dati. (4) Promemoria
  in-app scelti. (5) Import di un formato documentato d'esempio con anteprima.
  Ogni integrazione reale resta subordinata a una decisione owner (GAP-17).

#### B56 — Presentazione dei tiri digitali: dadi animati (Tavolo, M)

- **Direzione owner 23/09/2026:** demo del lancio dei dadi richiesta ("sarebbe
  fico"), dentro il perimetro se possibile.
- **Pattern:** schermata del tiro di Baldur's Gate 3 (d20 grande al centro,
  CD e modificatori elencati, esito successo/fallimento dopo l'animazione);
  dadi 3D di D&D Beyond (vassoio, dadi che rotolano sulla pagina, aspetto
  personale); Dice So Nice per Foundry (dadi 3D per utente, disattivabili,
  visibili a chi può vedere il tiro); dadi di Owlbear (Dice+/Rodeo).
- **Regole:** l'animazione presenta un risultato **già accettato**
  dall'esistente motore digitale; non decide né rilancia. I dadi fisici non
  vengono animati: si mostra la faccia inserita. I tiri nascosti non si animano
  per chi non può vederli. Preferenza personale per disattivare, ridurre il
  movimento (B22) e scegliere colore; salto con clic/Esc.
- **Nuovi file:** `dice-3d.mjs`, `dice-3d.css`, `tests/dice-3d.test.mjs`,
  `blueprint-checks/dice-3d-journey.js`.
- **Accettazione:** attacco digitale mostra d20 animato che si ferma sulla
  faccia registrata, poi breakdown; TS con CD mostra successo/fallimento;
  riduzione del movimento mostra subito il risultato; tiro nascosto non
  visibile all'altro ruolo; nessun cambio al risultato registrato.

#### B57 — Generatori procedurali assistiti (Preparazione, M)

- **Inclusione delegata 23/09/2026** (owner: "non tralasciare niente", copiare
  i pattern esistenti); simulata e sempre rivista dal DM prima dell'uso.
- **Capacità:** CA-41, PR-17, PR-18, PR-40.
- **Pattern:** Kobold+ "genera incontro" su budget XP 2024 e filtri
  (CMP-110/117); FG `N*$PC` (R20-112); donjon/Watabou dungeon a stanze e
  corridoi (CMP-137–142); Owlbear Forecast rilevamento muri con strumento di
  correzione (VTL-065); donjon città/locande (CMP-104/105).
- **Regole:** ogni generazione produce una **bozza** modificabile con seme
  visibile e "Rigenera"; nulla entra in scena/incontro senza salvataggio
  esplicito; muri proposti restano da confermare singolarmente.
- **Nuovi file:** `generators.mjs`, `generators.css`,
  `tests/generators.test.mjs`, `blueprint-checks/generators-journey.js`.

#### B58 — Grafo delle relazioni (Campagna, S)

- **Inclusione delegata 23/09/2026** (conflitto C11 riaperto su "non
  tralasciare"): grafo in aggiunta all'elenco di B43, non al posto.
- **Pattern:** Kanka relations explorer (CMP-29), Obsidian graph view
  (CMP-89), LegendKeeper boards (CMP-72/90).
- **Regole:** relazioni segrete visibili solo a chi le può leggere; filtro per
  tipo; clic su nodo apre la voce; nessuna relazione dedotta dal testo.
- **Nuovi file:** `relations-graph.mjs`, `relations-graph.css`,
  `tests/relations-graph.test.mjs`, `blueprint-checks/relations-graph-journey.js`.

#### B59 — Tavoli pubblici, ricerca di gruppo e moderazione (Servizi, M)

- **Inclusione delegata 23/09/2026** come simulazione (Q161 resta aperta per il
  prodotto reale; SV-28 età/consenso resta decisione legale e viene mostrata
  come requisito dichiarato, non inventato).
- **Capacità:** SV-53, SV-29, CA-07.
- **Pattern:** Roll20 Join a Game/LFG con stato dell'annuncio (R20-004–006);
  Kanka candidature (SVC-041); Warhorn lista d'attesa (SVC-009); Roll20
  Report/Block e codice di condotta (SVC-148–150); Kanka ruolo pubblico con
  avviso (SVC-042).
- **Nuovi file:** `community.mjs`, `community.css`,
  `tests/community.test.mjs`, `blueprint-checks/community-journey.js`.

#### B60 — Assistente IA simulato per DM e giocatori (Servizi, M)

- **Inclusione delegata 23/09/2026** come simulazione dichiarata: nessun
  modello reale, nessuna spesa, nessun dato inviato (GAP-18 resta decisione
  per il prodotto reale).
- **Capacità:** SV-43, SV-44, SV-45, SV-46.
- **Pattern:** Archivist "Ask" limitato alla visibilità e Session Review prima
  della condivisione (SVC-086–090); Quest Portal note assistite con
  Tieni/Riprova/Scarta (VTL-217/218); Quest Portal Library Link con citazioni
  (VTL-197); Saga20 conservazione dichiarata; modello locale (SVC-099).
- **Regole:** consenso per campagna; note "Solo io" e fonti private escluse;
  ogni risposta cita voci accessibili; bozza sempre rivista prima di
  pubblicare; etichetta "simulazione" nel prototipo.
- **Nuovi file:** `assistant.mjs`, `assistant.css`,
  `tests/assistant.test.mjs`, `blueprint-checks/assistant-journey.js`.

#### B61 — Struttura del Tavolo e dell'app dopo l'ondata 1 (Trasversale, M)

- **Motivo (coordinatore, 24/09/2026):** con 22 aree registrate la testata del
  Tavolo espone due righe di pulsanti d'area e la barra degli strumenti a
  sinistra si allunga; reperibilità e gerarchia peggiorano. Non è una scelta
  estetica: è la collocazione dei comandi (NAV-01–11, BLUEPRINT_CONTRACT).
- **Pattern di consenso da copiare:** strumenti della mappa in una barra
  verticale a sinistra con sotto-strumenti (Foundry scene controls, Owlbear
  toolbar, Roll20 toolbar, D&D Beyond Maps); **barra laterale destra a schede**
  per chat/registro, combattimento, scene, attori, oggetti, diario/materiali,
  tabelle/mazzi, compendio, impostazioni (Foundry sidebar tabs, Roll20
  right sidebar tabs), comprimibile e con pop-out; ispettore della creatura
  selezionata nella stessa colonna (D&D Beyond Maps character panel);
  **barra delle azioni in basso** per il personaggio controllato con risorse
  (BG3 hotbar e resource bar CRP-098/099); **ritratti dell'ordine di turno in
  alto** (BG3, Foundry Combat Carousel); icone delle estensioni in alto a
  destra solo per servizi globali (Owlbear). Fuori dal Tavolo: navigazione
  principale in alto con al massimo 5–6 destinazioni, servizi come icone,
  sezioni d'area nelle pagine di appartenenza (Beyond, Kanka).
- **File toccati:** `registry.mjs` (slot/posizionamenti: `table-sidebar-tab`,
  gruppi degli strumenti, priorità), `table.mjs`, `app.mjs`, `styles.css`,
  `registry.css`; adeguamento delle registrazioni delle aree dell'ondata 1
  soltanto nei metadati di posizione (nessun cambio di comportamento).
- **Accettazione:** a 1440 e 390 px nessuna riga di pulsanti d'area nella
  testata; ogni area raggiungibile in ≤2 clic dal suo contesto; stesse prove
  browser dell'ondata 1 verdi (selettori aggiornati dove cambia solo la
  collocazione); tastiera e tocco; EN/IT; registro pronto per l'ondata 2.

#### B62 — Audit di reperibilità senza guide (Trasversale, M)

- **Direzione owner 24/09/2026:** "deve essere così intuitivo che non
  dovrebbero servire guide… tutto facile da trovare, facile da eseguire, dare
  totale libertà". I suggerimenti al primo accesso (B30) restano disattivati di
  default; l'aiuto resta disponibile su richiesta.
- **Metodo:** percorso cognitivo (cognitive walkthrough) su circa 100 compiti
  reali di giocatore e DM derivati dal censimento; agenti senza conoscenza del
  codice usano soltanto etichette e controlli visibili a 1440 e 390 px;
  misurano clic, esitazioni, vicoli ciechi, termini ambigui. Non è un test con
  persone e non viene presentato come tale.
- **Esito:** correzioni di collocazione, etichette e scorciatoie copiate dai
  pattern di mercato; ripetizione finché ogni compito comune riesce in ≤3
  interazioni dal contesto naturale senza aiuto.

#### B31 (aggiornato 24/09/2026) — Veste visiva curata

- **Direzione owner 24/09/2026:** "in più deve anche sembrare bello". B31 non è
  più un ritocco facoltativo: passata di design completa sull'app intera dopo
  l'ondata 2 (skill impeccable/frontend-design), con riferimenti visivi dei
  leader: ricchezza fantasy di Baldur's Gate 3 e Solasta per Tavolo e dadi,
  chiarezza di D&D Beyond per scheda e contenuti, essenzialità di Owlbear per
  gli strumenti. Tema chiaro/scuro, contrasto AA, stesse interazioni. Non
  sostituisce la futura fase di brand/nome.

Aggiunte a incrementi esistenti (23/09/2026): BI-45 pacchetti con sole
meccaniche in B49; SV-41 API/webhook simulati e SV-42 moduli attivabili per
campagna (modello Foundry "Manage Modules"/estensioni per stanza di Owlbear,
ma solo funzioni integrate) in B55. Restano **EXCLUDED** le righe decise
dall'owner (musica ospitata, voce/video, 3D, marketplace, sessioni a
pagamento, IA come DM) e X-12 script con codice (GAP-01, C16).

### Righe non assegnate a un incremento

- **Incremento 10 in corso:** PG-27, PG-28, TV-24 (visualizzazione in B12),
  TV-73, TV-84, TV-85.
- **Decisione owner:** CA-07, CA-41, PR-17, PR-18, PR-40, SV-28, SV-29, SV-41,
  SV-42, SV-43, SV-44, SV-45, SV-46, SV-53, BI-45, X-12 (sezione c).
- **EXCLUDED:** TV-146, TV-147, TV-148, BI-46, SV-54, SV-55.

Aggiornare lo stato delle righe è compito del coordinatore alla chiusura
verificata di ogni incremento: PROVEN solo con percorso browser e review.

<!-- Riferimenti delle prove (stato delle capacità) -->

[ev-campaign-hub-world]: ../../changes/interview-01/audit/campaign-hub-world.md
[ev-campaign-settings-data]: ../../changes/interview-01/audit/campaign-settings-data.md
[ev-features-management]: ../../changes/interview-01/audit/features-management.md
[ev-final-fixes]: ../../changes/interview-01/final-fixes.md
[ev-final-review]: ../../changes/interview-01/final-review-completeness.md
[ev-home-creation]: ../../changes/interview-01/audit/home-creation.md
[ev-library]: ../../changes/interview-01/audit/library.md
[ev-prep-encounters]: ../../changes/interview-01/audit/prep-encounters.md
[ev-prep-scenes]: ../../changes/interview-01/audit/prep-scenes.md
[ev-reaudit]: ../../changes/interview-01/audit/reaudit.md
[ev-reaudit3-a]: ../../changes/interview-01/audit/reaudit3-a.md
[ev-reaudit3-b]: ../../changes/interview-01/audit/reaudit3-b.md
[ev-reaudit3-c]: ../../changes/interview-01/audit/reaudit3-c.md
[ev-services]: ../../changes/interview-01/audit/services.md
[ev-sessions-members-safety]: ../../changes/interview-01/audit/sessions-members-safety.md
[ev-sheet]: ../../changes/interview-01/audit/sheet.md
[ev-spells-inventory]: ../../changes/interview-01/audit/spells-inventory.md
[ev-table-combat]: ../../changes/interview-01/audit/table-combat.md
[ev-table-dice-time]: ../../changes/interview-01/audit/table-dice-time.md
[ev-table-map-vision]: ../../changes/interview-01/audit/table-map-vision.md
[q166]: OPEN.md#q166--dadi-karmici
[q167]: OPEN.md#q167--capacità-dei-leader-oltre-il-censimento
[i-233]: DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate
[gap-01]: REFERENCE_COVERAGE.md
