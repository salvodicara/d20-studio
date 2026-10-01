# visual-01 — Fase C «Design visivo»

- **Obiettivo:** l'aspetto dell'intera app copiato dai prodotti di riferimento, superficie per
  superficie, senza cambiare funzioni, percorsi, permessi o dati (ROADMAP D-014, I-243, I-245,
  I-246, I-248). Ogni scelta visiva si decide con l'owner per **scelte numerate con esempi**
  (I-248): screenshot dell'app vera con l'opzione applicata, affiancato all'immagine del prodotto
  copiato e a «elemento → prodotto → fonte». Nulla si applica a tutta l'app prima della scelta.
- **Coordinatore e writer responsabile:** sessione Claude Code (Opus 5.5, sforzo della sessione
  invariato), avviata dall'owner il 30/09/2026 con il prompt di [NEXT](../../docs/NEXT.md).
  Gli agenti dei workflow lavorano su file riservati distinti; il coordinatore integra.
- **Data:** l'orologio del Mac dice martedì 30/09/2026 (sera). I documenti della chiusura
  funzionale riportano «01/10/2026» per lavoro fatto prima: le date qui sono quelle di sistema.
- **Worktree:** `~/Workspace/Codex/d20-studio-visual-01`. **Branch:** `codex/visual-01`, creato
  dal tag `blueprint-functional-v1` (commit `487d578`) e portato con fast-forward a `ec0f078`
  (solo documenti: I-247, I-248, NEXT). `git diff blueprint-functional-v1 HEAD -- design/` è vuoto.
- **Server locale:** `python3 changes/visual-01/serve.py` → <http://127.0.0.1:8881/> (questo
  worktree). La porta 8879 resta la versione congelata di interview-01.
- **Percorsi riservati:** `changes/visual-01/**`; `design/blueprint/directions/**` (direzioni
  in prova); il selettore di sviluppo «Direzione» accanto a «Visita come»; `design/blueprint/assets/**`
  (risorse con licenza); `PRODUCT.md`; `package.json`/`package-lock.json` (solo strumenti di
  sviluppo); nuove righe I-2xx in `docs/interview/DECISIONS.md`; l'intestazione della Fase C in
  `AGENTS.md`; `docs/NEXT.md` (coordinatore).
- **Fuori dal repository:** masters e riferimenti in `~/Workspace/Codex/d20-studio-visual-assets/`
  (`masters/`, `references/`, `candidates/`); prove in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`. Mai nel repository: pixel,
  caratteri o texture di BG3, D&D Beyond, Foundry, Owlbear, Kanka, World Anvil, Solasta.

## Piano (Fase C, adattato a I-248)

Il [piano operativo](prep/phase-c-plan.md) resta la base (installazioni §1, risorse §2,
immagini §3, riuso §4, metodo §5). I-248 cambia i passi 3–6: **ogni** dettaglio diventa una
scelta numerata dell'owner, non solo direzione, icone e caratteri. Registro delle scelte:
[choices.md](choices.md).

1. **Preparazione** (fatto il 30/09): worktree, strumenti di test nel progetto, masters copiati
   fuori da `~/Documents`, server 8881; «prima» del look attuale.
2. **Riferimenti per superficie**: immagini ufficiali dei prodotti con fonte e data, fuori dal
   repository; fatti misurati (colori campionati, caratteri, raggi, misure).
3. **Giro 1 — Scelta 1 «Direzione»**: tre direzioni costruite sull'app vera (Inizio, Scheda,
   Tavolo; 1440 e 390; tema scuro), attivabili solo dal selettore di sviluppo «Direzione».
   Pagina privata di confronto e immagini per il telefono dell'owner.
4. **Giri successivi**: le scelte 2–15 del registro, ognuna con esempi, dentro la direzione scelta.
5. **Sistema grafico e applicazione a tutte le aree** solo dopo le scelte; prima/dopo per area.
6. **Controllo visivo e di accessibilità**, revisione in un'altra sessione sul SHA esatto,
   approvazione esplicita dell'owner.

## Controlli fissi

- Suite Node (`node --test design/blueprint/tests/*.test.mjs`) e i 189 percorsi del browser verdi.
- Con il selettore su «Attuale» l'app è identica al tag (nessun cambiamento di default).
- WCAG AA, fuoco visibile, segni mai affidati al solo colore; EN/IT.

## Stato

- 30/09/2026: preparazione completata; avvio della raccolta dei riferimenti e della mappa del codice.
- 30/09/2026, ondata 1 (8 agenti, nessun errore): 4 tavole di riferimento (BG3/Solasta 65
  immagini, D&D Beyond 57, Foundry/Owlbear 41, Kanka/World Anvil) in
  `~/Workspace/Codex/d20-studio-visual-assets/references/`; [code-map](code-map.md) (guida per
  le direzioni); kit di cattura [capture/](capture/README.md) e «prima» (26 screenshot) in
  `…/2026-09-30/visual-01/before/`; candidati d'arte con provenienza in
  `…/d20-studio-visual-assets/candidates/MANIFEST.md`; [PRODUCT.md](../../PRODUCT.md) dalle
  decisioni registrate. Suite Node di base: 2681/2681.
- 30/09/2026, ondata 2 avviata: impalcatura del selettore «Direzione», mappa d'esempio con
  l'imagegen di Codex, quattro direzioni (costruzione → critica → correzione → verifica),
  cattura uniforme per la tavola di confronto.

- 01/10/2026 00:55, ondata 2 conclusa (19 agenti, nessun errore): impalcatura con prova di
  effetto nullo (DOM identico; pixel identici salvo l'animazione dell'anello di selezione, che
  varia anche fra due giri del tag), suite Node 2688/2688; mappa dipinta d'esempio allineata ai
  muri al primo tentativo (una sola generazione Codex sull'abbonamento); quattro direzioni con
  critica, correzione e verifica indipendenti (verdetti: bg3, foundry, owlbear «ship»; ddb «fix»
  per uno screenshot superato, rifatto dalla cattura finale, e un allineamento delle pillole dei
  tiri salvezza). Commit locale `ebb1b51` (nessun push).
- 01/10/2026: l'owner chiede di continuare in autonomia con più stili possibile, sempre copiati
  dai prodotti esistenti e di altissima qualità. Pubblicata la pagina privata della Scelta 1
  (opzioni 0–4) e mandate tre griglie; avviate la ricerca su cinque prodotti in più (Solasta,
  Roll20, Pathfinder WotR di Owlcat, Alchemy RPG, Demiplane) e l'estensione del kit di cattura a
  cinque stati in più.

- 01/10/2026: l'owner chiede che dopo le scelte ci sia un solo design coerente, curato in ogni
  padding, margine, bottone e carattere: registrato come I-250 e nel registro delle scelte.
- 01/10/2026, ondata 3: kit di cattura con 5 stati in più (esplorazione, Magie, Inventario,
  finestra dell'iniziativa, menu della pedina); strumento di controllo dei valori calcolati
  ([audit](audit/README.md): oggi 42 spaziature senza passo, 29 altezze di controlli, 108
  varianti di pulsanti); pagina-campionario dei componenti con il markup reale
  ([specimen](specimen/README.md)); direzioni 1–4 estese ai nuovi stati e rifinite; cinque
  direzioni nuove costruite con critica, correzione e verifica (5 Solasta, 6 Roll20, 7
  Pathfinder WotR, 8 Alchemy RPG, 9 Demiplane). Pubblicate due pagine private: Scelta 1
  (Tavolo, Scheda, Inizio) e «Altri stati». In corso il secondo giro di rifinitura su tutte le
  direzioni con i punti aperti delle verifiche e la coerenza I-250.

- 01/10/2026, chiusura del Giro 1: cattura uniforme di 150 screenshot (10 opzioni × 15 stati) e
  40 ritagli del campionario; riepilogo del controllo dei valori per tutte le direzioni; pagine
  private aggiornate (Scelta 1 versione 3, Altri stati versione 2) e tre griglie mandate
  all'owner; commit locale `bb019df`. Terzo giro di rifinitura in corso sulle nove direzioni.

## Prossima azione

Attendere la risposta dell'owner alla Scelta 1; intanto chiudere il terzo giro di rifinitura,
ricatturare e ripubblicare le due pagine. Dopo la risposta: Giro 2 (scelte 2–5) secondo
[NEXT](../../docs/NEXT.md).
