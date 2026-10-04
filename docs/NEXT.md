# Prossimo passo — Fase C: Giro 2 dentro Baldur's Gate 3

**Stato al 02/10/2026.** La Fase C «Design visivo» è in corso nel worktree
`~/Workspace/Codex/d20-studio-visual-01` (branch `codex/visual-01`, creato dal tag
`blueprint-functional-v1`). Il codice funzionale è identico al tag: le opzioni grafiche sono
«direzioni di prova» attive solo dal selettore di sviluppo «Direzione» (I-249). Stato, piano e
prove: [task](../changes/visual-01/task.md); registro delle scelte numerate:
[choices](../changes/visual-01/choices.md). Regole dell'owner: I-248 (ogni dettaglio si sceglie
per numero da screenshot affiancati al prodotto copiato), I-250 (un solo design coerente, curato in
ogni padding, margine, bottone e carattere), I-251 (marchio attorno al d20), I-252 (superare i
modelli), I-253 (premium e «magico»; nel dubbio fermarsi e chiedere con esempi, in parole semplici).

## Scelta 1 chiusa (I-253, I-254)

**Baldur's Gate 3 per tutta l'app**, da rifinire fino a sembrare un prodotto premium. Immagini: prima
la strada gratuita (simboli vettoriali game-icons.net CC BY 3.0 e immagini dipinte generate con
l'imagegen di Codex sull'abbonamento dell'owner), con una prova di 10–20 immagini per tipo prima
della produzione; pacchetti a pagamento solo con un sì esplicito. Mappe: caricamento dell'utente e
import da Dungeondraft (già nel blueprint) più una piccola raccolta di mappe pronte nello stesso
stile dipinto, con muri e porte già messi. Da chiedere ancora: dove prende le mappe il DM del gruppo.

## Giro 2: in attesa dell'owner (05/10)

Pagina privata: <https://claude.ai/artifact/Frmp7PQc8YG2ZPBUpAKnox>. Le domande, con esempi:
scelte 2 Colori, 3 Caratteri, 4 Icone, 5 Pulsanti e campi (tre opzioni ciascuna, combinabili con
`?direction=bg3&variant=c2,t3,b1,i1`); stile delle icone dipinte (A, B, C); raccolta di mappe
pronte; dove prende le mappe il DM del gruppo. Registro e dettagli:
[choices](../changes/visual-01/choices.md). In corso: seconda parte della rifinitura premium
(P12–P24, `…/notes/phase-c-premium2.js`).

## Dopo il Giro 2

1. Registrare le risposte parola per parola come decisioni I-2xx in
   [DECISIONS dell'intervista](interview/DECISIONS.md) e aggiornare il registro.
2. Scelte 6–15 del registro, il sistema unico (token, specifica per ogni componente,
   [controllo dei valori](../changes/visual-01/audit/README.md) a zero fuori scala), l'applicazione a
   tutte le aree, i 189 percorsi del browser e la suite Node verdi, la revisione in un'altra
   sessione e l'approvazione esplicita dell'owner.
3. Produzione delle immagini (icone dipinte, mappe pronte) solo dopo che l'owner ha scelto lo stile
   dalla prova.

## Controlli per gli agenti

- Suite Node 2694/2694 al 02/10 (base 2681 + 13 del selettore, delle icone e del marchio). Garanzie: `node changes/visual-01/capture/guarantees.js --directions current,<id>` (server 8881 sorvegliato da `~/Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/notes/keep-8881.sh`). Con nessuna direzione l'app è
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
al prodotto copiato), I-250 (un solo design coerente), I-253/I-254 (Baldur's Gate 3 per tutta
l'app, premium e magico; nel dubbio chiedere con esempi). Continua il Giro 2 dentro BG3 (varianti
c/t/b/i, prove di icone dipinte e mappe pronte) e pubblica la pagina privata delle scelte 2–5;
registra ogni risposta dell'owner. Non
cambiare funzioni, percorsi, permessi o dati; suite Node e percorsi del browser verdi; WCAG AA.
Spiega in italiano semplice, manda screenshot di tutte le superfici toccate.
```
