# Prossimo passo — Fase B: l'owner valuta le funzioni

**Stato al 01/10/2026: candidata funzionale completa, in attesa della valutazione dell'owner
(Fase B del [piano](ROADMAP.md)). Non è approvata.** Worktree
`~/Workspace/Codex/d20-studio-interview-01`, branch `codex/interview-01` (commit locali sul
branch; l'ultimo contiene le correzioni di chiusura). La versione è identificata dal
[manifest della candidata](../changes/interview-01/blueprint-candidate-manifest.json): impronte,
non un'approvazione. Numeri e limiti: [BLUEPRINT_STATUS](interview/BLUEPRINT_STATUS.md).

## Come aprirla

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
python3 changes/interview-01/blueprint-checks/serve-nocache.py
```

Poi <http://127.0.0.1:8879/>. In alto, fuori dall'app: «Visita come» (Giocatore o DM) e
«Ripristina esempio». Dati d'esempio, solo in quel browser.

## Che cosa legge e prova l'owner

- **[Mappa delle funzioni](interview/FEATURE_MAP.md)**: una tabella per area, 119 righe che
  raccolgono tutte le 528 funzioni, con dove si trovano, da quale prodotto sono copiate e per chi.
- Si giudicano **le funzioni**: che ci siano, che si trovino dove uno le cerca e che facciano
  quello che promettono. L'aspetto non è in valutazione (Fase C).
- Correzioni e domande si chiedono in chat; l'agente corregge e ripresenta. Visitare o non
  rispondere non approvano. Dopo un'approvazione esplicita si congela la versione (manifest nuovo,
  commit e tag) e si passa alla Fase C.

## Fase C: design visivo in una sessione nuova

Si avvia quando l'owner lo chiede, in una sessione dedicata. Prompt pronto:

```text
Progetto d20 Studio, Fase C «Design visivo» (ROADMAP, D-014, I-243). Modello e sforzo invariati
rispetto alla sessione interview-01 (scelta dell'owner, nessun cambio). Lavora in un worktree
nuovo sotto ~/Workspace/Codex, branch codex/visual-01, partendo dal commit integrato della
candidata funzionale (o dalla versione congelata, se l'owner l'ha già approvata).
Leggi nell'ordine: AGENTS.md, docs/NEXT.md, docs/ROADMAP.md, docs/interview/FEATURE_MAP.md,
design/blueprint/DESIGN.md (solo come input provvisorio: non è approvato e si può rifare),
changes/interview-01/visual-phase-backlog.md, design/blueprint/DEVELOPMENT.md.
Obiettivo: una direzione e un sistema grafico copiati dai riferimenti, prodotto per prodotto
(BG3 e Solasta per il Tavolo e la barra delle azioni, D&D Beyond per scheda e Biblioteca,
Owlbear e Foundry per la mappa e i suoi attrezzi, Kanka e World Anvil per la campagna): per
ogni elemento scrivi «elemento → prodotto copiato → fonte», raccogli i riferimenti, proponi
all'owner poche direzioni concrete con immagini dell'app, poi applica quella scelta a tutto il
blueprint. Non cambiare funzioni, percorsi, permessi o dati: suite Node e percorsi del browser
restano verdi (un percorso che controlla solo l'aspetto si aggiorna con un commento datato).
Contrasto WCAG AA, fuoco visibile e segni mai affidati al solo colore restano obbligatori.
Spiega all'owner in italiano semplice; chiudi con l'approvazione esplicita dell'aspetto.
```

## Decisioni dell'owner ancora aperte

- **Età e consenso dei genitori (SV-28):** nel blueprint è simulato; per il prodotto reale serve
  la regola di legge per paese.
- **Prodotto reale:** integrazioni con account esterni veri (GAP-17), assistente IA vero con costi
  e privacy (GAP-18), aree pubbliche e moderazione (Q161); nel blueprint sono simulazioni.
- **Codice al sicuro:** push del branch sul repository GitHub pubblico (il repository è pubblico:
  nessun dato privato o contenuto senza licenza).
- Sopra funzioni già visibili: tenere i dadi karmici ([Q166](interview/OPEN.md#q166--dadi-karmici),
  raccomandazione: toglierli); script JavaScript oltre alle macro in recinto (GAP-01); Q164, Q165
  e Q168 in [OPEN](interview/OPEN.md).

## Controlli di chiusura della Fase A (agenti, non l'owner)

- Regressione di chiusura del 01/10: **189/189 percorsi del browser** e **2662/2662 test Node**,
  caricamento a 1440 e 390 senza errori ([rapporto](../changes/interview-01/final-regression.md)).
  I tre percorsi prima rossi (`spells-plus`, `spells-plus-review`, `w2a1-shell`) sono verdi.
- Testo «Cosa è pronto» nell'app aggiornato allo stato della candidata (01/10).
- Ancora da fare: revisione distinta, in un'altra sessione, delle correzioni di chiusura del 01/10
  sul candidato esatto.
