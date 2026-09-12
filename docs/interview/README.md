# Intervista di prodotto — non ancora iniziata

Autorità: D-012 in [DECISIONS](../DECISIONS.md). Questa cartella ospita esclusivamente definizioni
concordate attraverso l'intervista; non è una proposta di architettura o una mappa già approvata.
Il [prompt](../INTERVIEW_PROMPT.md) guida la prossima sessione.

## Metodo

Grill-me, in italiano: una domanda concreta alla volta, una raccomandazione motivata e attesa della
risposta. Prima chiarire scopo, persone e confini; poi funzioni e percorsi completi; infine tutte le
pagine concettuali e i collegamenti. Approfondire alternative, eccezioni e contraddizioni senza
imporre una durata o chiudere un'area per stanchezza. I diciannove lavori della ricerca sono una
checklist iniziale, non diciannove pagine già decise e non un limite al prodotto.

Conservare la ricerca su prodotti/regole e le skill installate. Le inferenze dei vecchi documenti
non sono risposte del proprietario. D-006 riguarda la disponibilità di partecipanti esterni: non
esonera dall'intervista di definizione ora richiesta. D-011 non autorizza a saltarla.

Solo Markdown, tabelle di comportamento ed elenchi testuali. Nessun mock, HTML, wireframe grafico,
design system, composizione visuale, immagine, demo, prototipo o implementazione durante questa fase.
Questa istruzione esplicita prevale sugli inviti delle skill a produrre prove visuali prima di chiedere.

## Documenti da far crescere dalle risposte

- `PRODUCT.md`: scopo, ruoli, ambizione, confini, automazione/discrezione, terminologia.
- `FEATURES.md`: ogni funzione con scopo, ruolo, percorso, confini e stato della decisione.
- `PAGES.md`: indice delle pagine emerse e navigazione concordata; non derivarlo dalle vecchie mappe.
- `pages/<nome>.md`: una descrizione concettuale per pagina, secondo lo schema sotto.
- `DECISIONS.md`: decisioni datate con motivo e conferma del proprietario, distinte dalle proposte.
- `OPEN.md`: domande aperte, dipendenze, contraddizioni, area corrente e prossima singola domanda.

Creare soltanto i file che iniziano a contenere risposte utili, evitando documenti fittizi già completi.
Stati: proposta, da chiarire, confermato. Il silenzio non è una conferma. Dopo ogni blocco, restituire
una sintesi breve e correggibile; chiedere conferma quando serve fissare un significato ambiguo,
senza riconfermare meccanicamente ogni risposta chiara.

## Schema di pagina concettuale

1. Nome, scopo, persone autorizzate e contesto d'uso.
2. Da dove si arriva e dove si può andare; cosa rimane disponibile durante il percorso.
3. Sezioni e informazioni presenti, priorità logica e contenuti privati/pubblici.
4. Per ciascun pulsante/comando: etichetta proposta o concordata, chi lo vede, quando è disponibile,
   dati richiesti, conseguenza concreta, persistenza, notifiche e possibilità di correzione/annullamento.
5. Stati iniziale/vuoto, normale, caricamento, errore, permesso negato, perdita di rete e recupero;
   distinguere non applicabile da non ancora discusso.
6. Automazioni, risorse coinvolte, intervento del DM, scelte lasciate al giocatore.
7. Differenze funzionali telefono/desktop, EN/IT e uso accessibile; nessuno stile grafico.
8. Esempi di utilizzo concordati, questioni aperte e riferimenti alle decisioni che sostengono la pagina.

## Continuità e chiusura

Aggiornare i documenti dopo risposte sostanziali. Prima di una pausa o cambio di sessione salvare
conferme, punti aperti e domanda successiva, senza rifare il lavoro e senza fare affidamento sulla
memoria del modello. Un cambio di sessione continua l'intervista; non avvia automaticamente il design.

Prima di proporre la chiusura verificare copertura di funzioni, pagine, ruoli, navigazione, comandi,
stati, eccezioni e comportamenti trasversali. Evidenziare tutte le lacune; una revisione documentale
separata cerca incoerenze ma non approva preferenze al posto del proprietario. Nessuna lacuna critica
o scelta di prodotto può essere riempita per deduzione per raggiungere il gate.

Il contratto si congela solo con approvazione esplicita del proprietario sull'insieme. Poi i mock
devono rispettarlo. Non riaprire decisioni già concordate per iniziativa dell'agente: se emerge una
contraddizione reale, spiegare l'impatto e proporre una modifica tracciata, da autorizzare. Non
promettere che nessuna informazione futura possa mai richiedere un cambiamento.
