# Prossimo passo — valutazione della candidata da parte dell'owner

**Stato al 01/10/2026: candidata completa del blueprint, in attesa della valutazione dell'owner.
Non è approvata.** Il lavoro è nel worktree `~/Workspace/Codex/d20-studio-interview-01`, branch
`codex/interview-01`, non ancora committato. La versione è identificata dal
[manifest della candidata](../changes/interview-01/blueprint-candidate-manifest.json)
(impronte sha256, non un'approvazione). Sintesi, numeri, limiti e simulazioni:
[BLUEPRINT_STATUS](interview/BLUEPRINT_STATUS.md); regole di approvazione:
[BLUEPRINT_CONTRACT](interview/BLUEPRINT_CONTRACT.md#accordo-e-fissazione-della-versione).

## Come aprirla

```sh
cd ~/Workspace/Codex/d20-studio-interview-01
python3 changes/interview-01/blueprint-checks/serve-nocache.py
```

Aprire <http://127.0.0.1:8879/>. Fuori dall'app, la barra della dimostrazione ha «Visita come»
(Giocatore o DM), «Cosa è pronto» e «Ripristina esempio». Dati sintetici, solo in quel browser.

## Che cosa valuta l'owner

Struttura, informazioni e interazioni: che ogni funzione si trovi dove la si cerca, faccia quello
che promette e sia coerente fra scheda, campagna e Tavolo. Aspetto, nome e marchio non sono in
approvazione. Tre visite brevi, poi navigazione libera:

1. **Giocatore, una sera di gioco:** Inizio › «Entra al Tavolo» › muovere Livia, attaccare un
   nemico con dadi digitali o fisici, bere una pozione › aprire la scheda › tornare al Tavolo.
2. **DM, preparare e condurre:** «Visita come: DM» › campagna › Preparazione (Scene, Incontri) ›
   «Entra al Tavolo» › «Avvia combattimento» (anche «Sorpreso») › menu «Sessione» › «Concludi
   incontro» con PE e bottino.
3. **Uso personale:** Personaggi › «Crea personaggio» (percorso rapido) › «Avanza di livello» ›
   Appunti personali senza campagna.

Commenti e correzioni si chiedono in chat; l'agente le fa e ripresenta. Visitare, fare clic o
non rispondere non approvano la versione.

## Dopo l'approvazione esplicita

1. **Congelare:** nuovo manifest della versione approvata con Markdown, censimento, prove e
   decisioni; è il contratto dell'app. Commit e integrazione secondo [WORKFLOW](WORKFLOW.md), con
   revisione in un'altra sessione sulla SHA candidata.
2. **Pianificare il prodotto reale:** piano, test e revisioni sulla baseline; deploy, dati reali,
   spesa e impegni esterni restano soggetti a un'autorizzazione esplicita per ogni cambiamento.
   L'app d20 Folio in produzione resta invariata fino al rilascio del sostituto.

## Decisioni dell'owner aperte

- **SV-28** politica d'età e consenso dei genitori: requisito legale.
- **GAP-17** integrazioni con account esterni reali (Discord e Avrae, calendari, API e webhook).
- **GAP-18** assistente IA reale: costo, privacy, modello ospitato o locale.
- **Q161** aree pubbliche: annunci, candidature, catalogo pubblico dell'homebrew, moderazione.
- **Pacchetti di compatibilità (BI-45):** quali contenuti e con quali licenze.
- **Dadi connessi reali (TV-95):** integrazione con dispositivi Bluetooth.
- **X-12** macro con codice (GAP-01).
- **Q164–Q168** in [OPEN](interview/OPEN.md): riposo del giocatore senza il DM, nomi di altri
  prodotti nei testi, dadi «karmici», capacità oltre il censimento, clic sul numero che tira
  subito (già adottato su delega).
- **Nome e marchio:** fase dedicata, dopo l'accordo sul contratto.

## Controlli ancora da fare prima di presentarla

- Giro completo dei 189 percorsi del browser dopo le correzioni finali (l'ultimo, 188/188, le
  precede).
- Revisione distinta delle correzioni finali del 30/09 (oggi provate da test e sonde del
  correttore).
- Aggiornare nell'app il testo di «Cosa è pronto», che descrive ancora i limiti dell'incremento 10.
