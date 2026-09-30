# Inizio — ritrovare personaggi, campagne e lavoro personale

22/09/2026. Prima definizione concettuale dell'agente sotto delega I-180/I-190/
I-202, composizione I-206. Pagina parziale: ordine visivo e stringhe finali
restano da sviluppare; account e recupero credenziali richiedono un percorso
dedicato. Non è il contratto completo approvato.

## Navigazione comune — I-212, 23/09/2026

Barra Inizio/Personaggi/Campagne/Biblioteca; servizi Cerca/Appunti/Richieste e menu personale. Inizio non è un passaggio obbligatorio prima dei link diretti.
Fonti, ritorni e comportamento trasversale in [NAVIGATION](../NAVIGATION.md);
gli [ingressi delle funzioni](../NAVIGATION_COVERAGE.md) non ne attestano la completezza.

## Scopo e persone

È l'ingresso personale per giocatori e DM: ritrovare il materiale accessibile
senza dover entrare in una campagna o avviare una partita. Una persona può
essere giocatore in un gruppo e DM in un altro; il ruolo appare nel contesto,
non come scelta globale permanente dell'account.

Il riferimento pertinente è la raccolta di strumenti personali di Beyond
(fonte sotto). Il raggruppamento e gli accessi proposti sono una sintesi per
questa app. Non si introduce un cruscotto di statistiche d'uso o una bacheca
pubblica di gruppi per riempire la pagina.

## Arrivo, contenuti e priorità

- Dall'accesso ordinario si raggiunge Inizio; un collegamento diretto a un
  personaggio o invito conserva la destinazione richiesta dopo i controlli
  di accesso. La procedura di autenticazione non è definita qui.
- La prima sezione raccoglie i **personaggi accessibili**, con nome, contesto
  di campagna se presente e accesso alla scheda. Un personaggio personale
  senza campagna resta pienamente raggiungibile.
- La sezione **campagne** mostra nome, ruolo della persona e accesso al gruppo.
  Se esiste una prossima sessione reale accessibile, se ne può mostrare la
  data: nessuna data dedotta dal calendario del mondo.
- **Appunti personali** rimane un accesso autonomo, anche senza personaggio
  e campagna. Il contenuto Solo io non viene copiato nel riepilogo del gruppo.
- **Biblioteca** porta a consultazione e raccolte personali; i contenuti
  autorizzati possono essere raggiunti anche senza una scheda aperta.
- Un lavoro incompleto noto, per esempio un avanzamento in bozza, rimanda
  alla sua revisione: non si applica un nuovo livello soltanto riaprendolo.
- Ricerca, lingua, preferenze e accessibilità sono accessi di servizio.
  Non è deciso di esporre qui ogni singola impostazione o notifica.

La selezione precisa di elementi recenti, ordinamento e preferiti della pagina
resta una lacuna ordinaria di UX da risolvere con precedenti pertinenti, non
una preferenza già attribuita al proprietario. I preferiti di mosse I-159
non autorizzano automaticamente un sistema diverso per fissare campagne.

## Comandi e conseguenze

| Comando proposto        | Visibilità e disponibilità                       | Cosa succede                                                                     | Salvataggio e annullamento                                                                                                         |
| ----------------------- | ------------------------------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Apri personaggio        | Persona con accesso corrente alla scheda         | Apre la scheda esistente; il contesto indica la campagna, se collegata.          | Navigazione soltanto; nessuna copia, riposo o azzeramento delle risorse.                                                           |
| Crea personaggio        | Persona autorizzata a creare materiale personale | Apre il percorso di creazione descritto in Personaggi.                           | Bozza e conferma seguono quel percorso; nessuna campagna obbligatoria.                                                             |
| Apri campagna           | Partecipante con accesso corrente                | Mostra riepilogo, gruppo e contenuti consentiti; da lì si può entrare al tavolo. | Non avvia una sessione o cambia il ruolo.                                                                                          |
| Crea campagna           | Persona che vuole organizzarne una               | Apre la definizione della campagna.                                              | Nessun invito inviato o materiale condiviso soltanto aprendo il percorso. Campi obbligatori e creazione da completare in Campagna. |
| Riprendi bozza          | Autore o persona autorizzata alla bozza          | Apre il lavoro sospeso con stato riconoscibile.                                  | Non lo applica allo stato attivo; conserva conferma e scarto distinti.                                                             |
| Appunti personali       | Autore, nei limiti dei dati disponibili          | Apre le proprie note senza obbligo di gruppo o scheda.                           | Scrittura, salvataggio e condivisione appartengono al percorso Note; nessuna pubblicazione implicita.                              |
| Apri biblioteca / Cerca | Accesso ai contenuti pertinenti                  | Consulta o cerca e apre un risultato consentito.                                 | Tornando si conserva il contesto di ricerca secondo I-184; nessuna aggiunta automatica alla scheda.                                |

## Ritorno, autorità e stato

Tornare qui dalla scheda o dalla campagna non scarta implicitamente una bozza
né applica una modifica. La pagina di origine dichiara se la bozza è salvata,
locale o non ancora inviata; eventuali scelte di scarto sono esplicite.
Non si termina una sessione condivisa chiudendo il tavolo o cambiando pagina.

Titoli, miniature e risultati devono rispettare gli accessi quanto il contenuto
completo. Non mostrare in Inizio una campagna o nota revocata perché presente
nella cronologia. Controllare di nuovo l'autorità prima di aprire o modificare;
il link non concede da solo controllo della scheda o poteri da DM.

| Stato                              | Cosa deve vedere e poter fare la persona                                                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Primo uso senza contenuti          | Accessi espliciti a creazione, consultazione e invito ricevuto; nessuna campagna d'esempio creata nei suoi dati. Aiuti facoltativi.                                                        |
| Caricamento                        | Indicazione distinta dall'assenza di personaggi/campagne, senza presentare un elenco vuoto come cancellazione.                                                                             |
| Errore parziale                    | L'area fallita indica il problema e offre di riprovare; il materiale disponibile nelle altre aree rimane raggiungibile.                                                                    |
| Collegamento non valido o revocato | Messaggio non rivelatore e ritorno ai propri contenuti; nessuna copia del materiale privato come soluzione implicita.                                                                      |
| Senza rete                         | Schede e appunti già disponibili restano consultabili/modificabili nei limiti I-114; stato locale riconoscibile. Campagne non scaricate e tavolo remoto non sono dichiarati sincronizzati. |
| Riconnessione                      | Invii pendenti e accessi rivalidati. Conflitti espliciti; nessuna sostituzione silenziosa dello stato altrui con l'ultima pagina visitata.                                                 |

Revoca mentre si è offline, conservazione locale, ordinamento degli invii e
contenuti con più proprietari restano nel contratto trasversale da completare.
La pagina non sceglie da sola una politica di cancellazione dei dati personali.

## Dispositivi, lingua e verifica del percorso

Laptop è il caso principale del gruppo. A larghezza ridotta gli stessi accessi
devono essere disponibili senza hover e senza ridurre tutte le etichette a
icone; non si inventa una seconda struttura funzionale mobile. Titoli utente
conservati, comandi EN/IT, stato non espresso soltanto mediante colore.

Tre verifiche attese sul futuro prodotto: aprire una scheda senza campagna;
passare da un gruppo come giocatore a un altro come DM senza acquisire poteri
nel primo; tornare dal tavolo ritrovando risorse e bozza senza chiudere il gioco.
Queste sono condizioni da verificare, non test di implementazione già superati.

## Provenienza e lacune

- I-052/I-053: autonomia e ricostruzione della scheda; I-055/I-056: avanzamento
  separato dallo stato attivo; I-044–I-051: note e autorizzazioni.
- I-094/I-117: appuntamenti e riepiloghi; I-114: disponibilità offline;
  I-126/I-179/I-184: biblioteca, ricerca e ritorno.
- [D&D Beyond — Creations](https://www.dndbeyond.com/creations), consultata
  il 22/09/2026: raccolte separate per personaggi, campagne e homebrew.
  Pagina datata 17/02/2019 con navigazione corrente; nessun accesso autenticato
  o test runtime. Sostiene la distinzione degli accessi, non i nostri stati
  offline, l'ordine delle sezioni o la proposta delle bozze in Inizio.
- Composizione coerente con [APP_BLUEPRINT](../APP_BLUEPRINT.md), approfondita
  in [Personaggi](characters.md), [Campagna](campaign.md) e [Tavolo](game-table.md).
  La proposta è adottata dall'agente su delega; non una nuova risposta dell'owner.
- Da completare: accesso/recupero account, preferenze, organizzazione delle note,
  priorità degli elementi, inviti pendenti e gestione completa dei dati offline.

## Dove si trova ogni funzione nel blueprint — candidata del 01/10/2026

Una riga per funzione del [censimento](../CAPABILITY_CENSUS.md): stato della candidata con il file di prova (PROVEN, PARTIAL, OPEN-DECISION, EXCLUDED: legenda del censimento) e posto naturale nel blueprint, come lo scrivono i controlli. Superfici costruite da nominare: «Continua a giocare» con l'immagine della campagna, «Il tuo personaggio», «Pronti a salire di livello» con «Avanza», «Accesso rapido», «Novità», «Primi passi»; per il DM «La prossima sessione» con «Preparazione» e «Prepara la sessione».

### Inizio

- **IN-01** Ripresa rapida di personaggio e campagna con "Entra al Tavolo" — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Home › «Entra al Tavolo»
- **IN-02** Stato vuoto senza campagna: schede e note restano raggiungibili — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Campaign › Gestione › Esci dalla campagna
- **IN-03** Elenco di più campagne attive/archiviate, ultimo accesso, tag e filtri — PROVEN · [final-review-completeness][ev-final-review]. Dove: Home › «Tutte le campagne»
- **IN-04** Prossima sessione con conto alla rovescia nell'ora locale — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Home › «Apri sessioni» › «Data già concordata» › «Salva bozza e aggiorna anteprima» › «Conferma»
- **IN-05** Inviti in arrivo con Accetta/Rifiuta — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Set up by leaving the campaign and having the DM use «Invita una persona dell’app»
- **IN-06** Lavoro incompleto (bozze builder, homebrew, note) con "Riprendi" — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Da riprendere» › «Riprendi»
- **IN-07** Primo avvio con tre strade: personaggio, campagna/mappa, esempio pronto — PROVEN · [audit/reaudit][ev-reaudit]. Dove: First steps fold with «Unisciti con un invito»; DM map path opens a new scene in Preparazione.
- **IN-08** Contenuto d'esempio "Inizia qui" modificabile, mai condiviso di default — PROVEN · [audit/home-creation][ev-home-creation]. Dove: Home › «Prova l’esempio» › «Apri la nota «Inizia qui»»
- **IN-09** Novità nell'app in un pannello, non pop-up — PROVEN · [final-review-completeness][ev-final-review]. Dove: Home right column, «Novità 7» tab
- **IN-10** Prova senza account o sandbox usa e getta — PROVEN · [audit/reaudit][ev-reaudit]. Dove: «Prova senza account» sandbox banner with «Crea un account per salvare».
- **IN-11** App installabile e accesso rapido ai personaggi recenti — PROVEN · [audit/reaudit][ev-reaudit]. Dove: Install card/iOS steps; palette «installa».
- **IN-12** Segnale "puoi salire di livello" e coda per più personaggi — PROVEN · [audit/home-creation][ev-home-creation]. Dove: «Pronti a salire di livello» › «Avanza» or «Avanza tutti

<!-- Riferimenti delle prove (stato delle capacità) -->

[ev-campaign-hub-world]: ../../../changes/interview-01/audit/campaign-hub-world.md
[ev-campaign-settings-data]: ../../../changes/interview-01/audit/campaign-settings-data.md
[ev-features-management]: ../../../changes/interview-01/audit/features-management.md
[ev-final-fixes]: ../../../changes/interview-01/final-fixes.md
[ev-final-review]: ../../../changes/interview-01/final-review-completeness.md
[ev-home-creation]: ../../../changes/interview-01/audit/home-creation.md
[ev-library]: ../../../changes/interview-01/audit/library.md
[ev-prep-encounters]: ../../../changes/interview-01/audit/prep-encounters.md
[ev-prep-scenes]: ../../../changes/interview-01/audit/prep-scenes.md
[ev-reaudit]: ../../../changes/interview-01/audit/reaudit.md
[ev-reaudit3-a]: ../../../changes/interview-01/audit/reaudit3-a.md
[ev-reaudit3-b]: ../../../changes/interview-01/audit/reaudit3-b.md
[ev-reaudit3-c]: ../../../changes/interview-01/audit/reaudit3-c.md
[ev-services]: ../../../changes/interview-01/audit/services.md
[ev-sessions-members-safety]: ../../../changes/interview-01/audit/sessions-members-safety.md
[ev-sheet]: ../../../changes/interview-01/audit/sheet.md
[ev-spells-inventory]: ../../../changes/interview-01/audit/spells-inventory.md
[ev-table-combat]: ../../../changes/interview-01/audit/table-combat.md
[ev-table-dice-time]: ../../../changes/interview-01/audit/table-dice-time.md
[ev-table-map-vision]: ../../../changes/interview-01/audit/table-map-vision.md
[q166]: ../OPEN.md#q166--dadi-karmici
[q167]: ../OPEN.md#q167--capacità-dei-leader-oltre-il-censimento
[i-233]: ../DECISIONS.md#i-233--capacità-in-attesa-dellowner-incluse-come-simulazioni-dichiarate
[gap-01]: ../REFERENCE_COVERAGE.md
