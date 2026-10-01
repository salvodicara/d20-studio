# Prossimo passo — Fase C: la risposta dell'owner alla Scelta 1

**Stato al 01/10/2026.** La Fase C «Design visivo» è in corso nel worktree
`~/Workspace/Codex/d20-studio-visual-01` (branch `codex/visual-01`, creato dal tag
`blueprint-functional-v1`). Il codice funzionale è identico al tag: le opzioni grafiche sono
«direzioni di prova» attive solo dal selettore di sviluppo «Direzione» (I-249). Stato, piano e
prove: [task](../changes/visual-01/task.md); registro delle scelte numerate:
[choices](../changes/visual-01/choices.md). Regole dell'owner: I-248 (ogni dettaglio si sceglie
per numero da screenshot affiancati al prodotto copiato) e I-250 (alla fine un solo design
coerente, curato in ogni padding, margine, bottone e carattere).

## Che cosa aspetta l'owner

**Scelta 1 · Direzione**: un numero per superficie (Tavolo, Scheda, Inizio), anche diversi o
mescolati («Tavolo 1 ma con i colori del 4»). Opzioni: 0 oggi · 1 Baldur's Gate 3 · 2 D&D Beyond
· 3 Foundry VTT · 4 Owlbear Rodeo · 5 Solasta · 6 Roll20 · 7 Pathfinder: Wrath of the Righteous ·
8 Alchemy RPG · 9 Demiplane.

- Pagina principale: <https://claude.ai/artifact/CUAABqATcL7YtXBPN7G594>
- Altri stati e componenti: <https://claude.ai/artifact/E1TMYtxZFsMnzxsCLR6UuP>

## Come aprire l'app con una direzione

```sh
cd ~/Workspace/Codex/d20-studio-visual-01
python3 changes/visual-01/serve.py
```

Poi <http://127.0.0.1:8881/?direction=bg3#table> (oppure `ddb`, `foundry`, `owlbear`, `solasta`,
`roll20`, `owlcat`, `alchemy`, `demiplane`; `current` per l'aspetto di oggi col selettore,
`off` per toglierlo). Campionario dei componenti:
<http://127.0.0.1:8881/directions/specimen.html?direction=bg3>.

## Dopo la risposta

1. Registrare la risposta parola per parola come decisione I-2xx in
   [DECISIONS dell'intervista](interview/DECISIONS.md) e aggiornare il registro.
2. Giro 2 (scelte 2–5: colori, caratteri, icone, pulsanti e campi) dentro le direzioni scelte,
   con il [campionario](../changes/visual-01/specimen/README.md) e screenshot numerati; se l'owner
   mescola prodotti, mostrare per esempi la fusione in un solo linguaggio (I-250).
3. Poi le scelte 6–15 del registro, il sistema unico (token, specifica per ogni componente,
   [controllo dei valori](../changes/visual-01/audit/README.md) a zero fuori scala), l'applicazione a
   tutte le aree, i 189 percorsi del browser e la suite Node verdi, la revisione in un'altra
   sessione e l'approvazione esplicita dell'owner.

## Controlli per gli agenti

- Suite Node 2688/2688 al 01/10 (base 2681 + 7 del selettore). Con nessuna direzione l'app è
  identica al tag (prova di effetto nullo in [code-map](../changes/visual-01/code-map.md) e nel
  task).
- Le direzioni non sono applicate a tutta l'app: valgono solo per gli screenshot e le prove.
- Masters, riferimenti dei prodotti (solo consultazione) e prove fuori dal repository:
  `~/Workspace/Codex/d20-studio-visual-assets/` e `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/`.
- Branch `codex/visual-01` solo locale: il push sul repository pubblico non è ancora stato fatto.

Prompt per una sessione nuova:

```text
Progetto d20 Studio, Fase C «Design visivo». Lavora nel worktree ~/Workspace/Codex/d20-studio-visual-01
(branch codex/visual-01). Leggi AGENTS.md, docs/NEXT.md, changes/visual-01/task.md e choices.md.
Regole: I-248 (ogni dettaglio si decide con scelte numerate, screenshot dell'app vera affiancati
al prodotto copiato) e I-250 (un solo design coerente, curato in ogni padding, margine, bottone,
carattere). Se l'owner ha risposto alla Scelta 1, registra la risposta e prepara il Giro 2 (colori,
caratteri, icone, pulsanti e campi) con il campionario dei componenti e le due pagine private
aggiornate; altrimenti continua la rifinitura delle nove direzioni e ripubblica le pagine. Non
cambiare funzioni, percorsi, permessi o dati; suite Node e percorsi del browser verdi; WCAG AA.
Spiega in italiano semplice, manda screenshot di tutte le superfici toccate.
```
