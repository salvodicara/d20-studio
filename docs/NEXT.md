# Prossimo passo — Fase C: design visivo in una sessione dedicata

**Stato al 01/10/2026.** Fase A (funzioni) fatta; Fase B accettata dall'owner con una sola
aggiunta, i calendari esterni, già costruita ([I-245](interview/DECISIONS.md)). La versione
funzionale è congelata con il tag locale `blueprint-functional-v1` sul branch
`codex/interview-01` (worktree `~/Workspace/Codex/d20-studio-interview-01`) ed è identificata dal
[manifest](../changes/interview-01/blueprint-candidate-manifest.json). Piano completo:
[ROADMAP](ROADMAP.md). Mappa delle funzioni: [FEATURE_MAP](interview/FEATURE_MAP.md).

## Come aprire l'app

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
python3 changes/interview-01/blueprint-checks/serve-nocache.py
```

Poi <http://127.0.0.1:8879/>. In alto, fuori dall'app: «Visita come» (Giocatore o DM) e
«Ripristina esempio».

## Fase C pronta

- **Strumenti installati con prove** ([I-246](interview/DECISIONS.md)): impeccable 4.4.0,
  review-animations, playwright-cli 0.1.22. All'avvio della fase si aggiungono nel worktree
  grafico gli strumenti di test indicati nel piano (§1).
- **Piano operativo, risorse e prove:** [changes/visual-01/prep](../changes/visual-01/prep/phase-c-plan.md)
  (skill, icone game-icons.net e Lucide con attribuzione, caratteri con licenza OFL, generazione
  delle immagini con l'imagegen di Codex sull'abbonamento esistente, immagini di d20 Folio
  riusabili, materiale solo di riferimento come lo studio su BG3).
- **Arretrato grafico già raccolto:** [visual-phase-backlog](../changes/interview-01/visual-phase-backlog.md).

Prompt pronto per la nuova sessione:

```text
Progetto d20 Studio, Fase C «Design visivo» (docs/ROADMAP.md, I-243, I-245, I-246). Modello e
sforzo come nella sessione interview-01. Crea un worktree nuovo in ~/Workspace/Codex/d20-studio-visual-01
sul branch codex/visual-01 partendo dal tag blueprint-functional-v1 (branch codex/interview-01).
Leggi nell'ordine: AGENTS.md, docs/NEXT.md, docs/ROADMAP.md, changes/visual-01/prep/phase-c-plan.md,
changes/visual-01/prep/asset-inventory.md, changes/interview-01/visual-phase-backlog.md,
design/blueprint/DEVELOPMENT.md, design/blueprint/DESIGN.md (solo input provvisorio, sostituibile).
Obiettivo: l'aspetto dell'intera app copiato dai prodotti di riferimento, superficie per
superficie (BG3 e Solasta per Tavolo, barra delle azioni e dadi; D&D Beyond per scheda e
Biblioteca; Owlbear e Foundry per la mappa e i suoi attrezzi; Kanka e World Anvil per campagna
e mondo). Per ogni elemento registra «elemento → prodotto copiato → fonte». Segui il metodo del
piano: raccolta di riferimenti per superficie, 2-3 direzioni concrete costruite sull'app vera
(Inizio, scheda, Tavolo) da mostrare all'owner con immagini, scelta dell'owner, sistema grafico,
applicazione a tutte le aree, controllo visivo e di accessibilità, approvazione esplicita.
Usa impeccable come skill di design principale, review-animations per le animazioni,
playwright-cli per le prove nel browser; icone da game-icons.net e Lucide con attribuzione;
immagini raster con l'imagegen di Codex (prepara i prompt in file, mai API a pagamento).
Non cambiare funzioni, percorsi, permessi o dati: la suite Node e i percorsi del browser restano
verdi. Contrasto WCAG AA, fuoco visibile, segni mai affidati al solo colore. Mandami screenshot
a ogni passaggio sostanziale; spiega in italiano semplice; chiedimi solo le scelte vere.
```

## Decisioni dell'owner ancora aperte

- **Pubblicare su GitHub:** il branch `codex/interview-01` e il tag sono solo locali; il
  repository `salvodicara/d20-studio` è pubblico.
- **Dadi karmici** ([Q166](interview/OPEN.md#q166--dadi-karmici)): presenti, spenti di default;
  raccomandazione: toglierli. **Script oltre le macro dell'app** (GAP-01): sconsigliati.
- **Prodotto reale:** età e consenso per paese (SV-28), integrazioni con account veri (GAP-17),
  assistente IA vero (GAP-18), aree pubbliche e moderazione (Q161): nel blueprint sono simulati.

## Controlli per gli agenti

- Chiusura del 01/10: 189/189 percorsi del browser, poi calendari esterni con 3 percorsi verdi;
  test Node nel manifest ([rapporto finale](../changes/interview-01/final-regression.md),
  [calendari](../changes/interview-01/calendar-export.md)).
- Da fare: una revisione distinta, in un'altra sessione, delle correzioni di chiusura del 01/10.
