# Registro delle scelte visive numerate (I-248)

Ogni scelta si presenta all'owner come **opzioni numerate**: per ciascuna, screenshot dell'app vera
con l'opzione applicata, affiancato all'immagine del prodotto copiato e a «elemento → prodotto →
fonte». L'owner risponde con i numeri. Nulla si applica a tutta l'app prima della risposta; la
risposta si registra parola per parola come decisione I-2xx.

| #   | Scelta                                                                         | Dipende da | Giro | Stato    |
| --- | ------------------------------------------------------------------------------ | ---------- | ---- | -------- |
| 1   | Direzione generale, per superficie (Inizio, Scheda, Tavolo)                    | —          | 1    | in corso |
| 2   | Colori (palette e colore del tema)                                             | 1          | 2    | da fare  |
| 3   | Caratteri (titoli, interfaccia, etichette)                                     | 1          | 2    | da fare  |
| 4   | Icone (voce: glifi pieni di gioco o contorni; set)                             | 1          | 2    | da fare  |
| 5   | Pulsanti e campi                                                               | 1–3        | 2    | da fare  |
| 6   | Schede, pannelli, dialoghi, barre laterali (anche nomi visibili: arretrato P3) | 1–5        | 3    | da fare  |
| 7   | Pedine e mappa (anelli, bersaglio, barre, didascalia: arretrato P2)            | 1–2        | 3    | da fare  |
| 8   | Barra delle azioni (hotbar, risorse, Fine turno)                               | 1–4        | 3    | da fare  |
| 9   | Ritratti del turno                                                             | 1–2        | 3    | da fare  |
| 10  | Dadi e animazioni                                                              | 1–2        | 3    | da fare  |
| 11  | Scheda del personaggio (dettaglio)                                             | 1–5        | 4    | da fare  |
| 12  | Pagine della campagna (Kanka / World Anvil)                                    | 1–5        | 4    | da fare  |
| 13  | Biblioteca                                                                     | 1–5        | 4    | da fare  |
| 14  | Telefono (intestazioni, fogli, Tavolo: arretrato P2)                           | 1–13       | 4    | da fare  |
| 15  | Tema chiaro                                                                    | 1–14       | 5    | da fare  |

## Scelta 1 — Direzione (Giro 1)

- **Superfici:** Inizio, Scheda, Tavolo (giocatore e DM in combattimento), tema scuro, 1440 × 900
  e 390 × 844. L'owner sceglie **un numero per superficie** (anche diversi, per esempio «Tavolo 1,
  Scheda 2, Inizio 4»).
- **Opzioni:** 0 · oggi (solo per confronto) · 1 · Baldur's Gate 3 (Solasta dove BG3 tace) ·
  2 · D&D Beyond (D&D Beyond Maps per il Tavolo) · 3 · Foundry VTT v13 con la scheda dnd5e ·
  4 · Owlbear Rodeo 2.
- **Perché quattro e non tre (scelta del coordinatore, 30/09):** il piano ipotizzava una terza
  direzione «Foundry/Owlbear». Le prove raccolte mostrano due mondi visivi diversi: Foundry è
  scuro con accenti arancio e la scheda dnd5e cremisi; Owlbear è vetro blu notte con un solo
  accento lilla. Mischiarli darebbe un'opzione che non copia nessun prodotto. Owlbear resta
  un'opzione a sé anche perché è lo strumento che il DM del gruppo usa (I-153, I-231).
- **Contenuti d'esempio uguali in tutte le opzioni (non sono parte della scelta):** ritratti di
  Livia, Doran e Mira (immagini generate per l'owner nella sessione Codex del 01/09) e dei goblin
  (ritratti SRD di d20 Folio), più una mappa dipinta del cortile se la generazione riesce. Le
  immagini dei personaggi e della mappa si decidono nelle scelte 7 e 9.
- **Altre cinque opzioni (01/10, richiesta dell'owner: «più stili hai per me meglio è», sempre
  copiati dai prodotti esistenti):** 5 · Solasta · 6 · Roll20 (Jumpgate e scheda D&D 2024) ·
  7 · Pathfinder: Wrath of the Righteous (Owlcat) · 8 · Alchemy RPG · 9 · Demiplane. Più stati
  per ogni opzione: Tavolo in esplorazione, scheda Magie e Inventario, finestra dell'iniziativa,
  menu della pedina.
- **Stato (01/10/2026):** tutte le 10 opzioni pubblicate nelle due pagine private —
  [Scelta 1 · Direzione](https://claude.ai/artifact/CUAABqATcL7YtXBPN7G594) (Tavolo giocatore e
  DM, Scheda, Inizio; computer e telefono) e [Scelta 1 · Altri stati](https://claude.ai/artifact/E1TMYtxZFsMnzxsCLR6UuP)
  (esplorazione, Magie, Inventario, finestra dell'iniziativa, menu della pedina, e i campionari
  di caratteri, pulsanti, campi, finestre) — più tre griglie mandate all'owner. Ogni direzione è
  passata per costruzione, critica, correzione, due giri di rifinitura e verifica indipendente;
  il terzo giro di rifinitura è in corso. **In attesa della risposta dell'owner.**
- **Coerenza misurata (I-250, riepilogo in `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/notes/audit-summary.md`):**
  oggi 42 valori di spaziatura senza passo, 143 pulsanti con il padding di default del browser e
  101 stili tipografici; le nove direzioni stanno fra 23 e 37 valori quasi tutti su un passo di
  2 o 4 px, 0 pulsanti di default e 46–89 stili tipografici.

## Dopo le scelte: un solo sistema di design (I-250)

Le opzioni servono a decidere; il risultato è **un unico design coerente**, curato in ogni
dettaglio, anche se l'owner sceglie prodotti diversi per superfici diverse. Il coordinatore fonde
le scelte in un solo linguaggio e lo mostra con esempi prima di applicarlo:

- **Token:** una scala di spaziature (per esempio 4 · 8 · 12 · 16 · 24 · 32 · 48), una scala
  tipografica con al massimo tre famiglie (titoli, interfaccia, etichette) e altezze di riga
  fisse, una palette per ruoli (fondi, superfici, testo, linee, accento, stati di gioco), raggi,
  spessori dei bordi, ombre e durate delle animazioni.
- **Componenti specificati uno per uno:** pulsanti (primario, normale, silenzioso, pericolo,
  icona) con altezza, padding, carattere e stati; campi e menu a tendina; interruttori; schede e
  sotto-schede; pannelli e card; dialoghi; menu contestuali; avvisi; barre laterali; hotbar e
  slot; ritratti del turno; pedine e anelli; tabelle; stati vuoti.
- **Controllo automatico:** uno script legge i valori calcolati di ogni elemento visibile su tutte
  le superfici (padding, margini, spazi, dimensioni e famiglie dei caratteri, altezze dei
  controlli, raggi, colori) e segnala ogni valore fuori dai token; il sistema si approva solo con
  zero valori fuori scala non dichiarati, più la revisione visiva componente per componente e i
  controlli di accessibilità.

Le voci dell'[arretrato grafico](../interview-01/visual-phase-backlog.md) entrano nella scelta
indicata; gli elementi «con stile minimo» si ridisegnano nella scelta della loro superficie.
Dopo la scelta 15: applicazione a tutte le aree con prima/dopo, controllo visivo e di
accessibilità, revisione separata, approvazione finale («Approvi l'aspetto?»).
