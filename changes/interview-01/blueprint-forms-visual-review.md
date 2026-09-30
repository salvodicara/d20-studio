# Forme — review visiva circoscritta

23/09/2026. Reviewer `/root/review_journey`, modello/sforzo ereditati.
Lettura indipendente della UI dell'altro autore, senza browser condiviso,
modifiche al source o approvazione owner. Direzione grafica provvisoria
Operate conservata; nessuna valutazione del branding finale.

**Nessun rilievo materiale P1/P2 nei tre frame esaminati.**

- `companion-map-desktop-it.png`: nome/controllo del compagno, PF, CA,
  movimento e comandi principali sono distinguibili. I controlli della mappa
  e la barra azioni non si sovrappongono. Il fondo del testo descrittivo
  dell'inspector è fuori dal frame utile; la CSS prevede `overflow:auto`
  nell'inspector. Dal solo screenshot non risulta un comando indispensabile
  nascosto o tagliato.
- `familiar-completion-desktop-it.png`: colonne di stato e confronto separate,
  tempo 60/60 minuti, costi di incenso/slot e momento di consumo leggibili.
  Applica è visibile e distinguibile da Annulla preview e Chiudi. Nessuna
  sovrapposizione del pulsante con testo o footer nel frame.
- `forms-mobile-en.png`: titolo su due righe, controllo di chiusura e pulsanti
  principali entro la larghezza disponibile; testi e collegamenti vanno a
  capo senza overflow orizzontale visibile. Il corpo è già scorso: il testo
  tagliato al bordo superiore e quello sotto il footer sono compatibili con
  il contenitore scrollabile previsto dalla CSS (`max-height:60vh`). Applica
  non è visibile a questa posizione: il frame non prova né nega che lo si
  raggiunga scorrendo. La CSS delle azioni della sezione fissa altezza minima
  di 44px e passa a una colonna sotto 780px.

Limiti: non sono stati provati scroll, tastiera, focus, click/touch, zoom del
testo o annunci assistivi. Nessuna attestazione WCAG, di performance o di
successo del percorso deriva da queste immagini. I test di interazione del
root restano evidenza separata. `forms-cat-desktop-it.png` non è stato incluso
nella review: il suo capture scrolled non viene interpretato come difetto o
come schermata approvata dall'owner.

Skill Impeccable applicata in modo circoscritto alla richiesta; letti il
contesto, la guida audit e le CSS pertinenti, senza estendere il lavoro a
redesign o inizializzazione del prodotto.

## Evidenza esaminata

Directory delle immagini:
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-23/`.
Hash effettivi dei frame e CSS letti; non SHA di un commit.

| File                                 | SHA-256                                                            |
| ------------------------------------ | ------------------------------------------------------------------ |
| `companion-map-desktop-it.png`       | `3d5dea848723504147b22a05dda09f3ca8c0ad95b33b45615185d07385ea80ca` |
| `familiar-completion-desktop-it.png` | `caf50793be4a065b7f2bb419070072f3ef0ce77b174547548b8ac52d9b632cc2` |
| `forms-mobile-en.png`                | `98fa1bfb6ae66d11fa7ed09e4cacc6c207850185479b7b61568a73748b2f3b77` |
| `design/blueprint/forms-ui.css`      | `6d4576fd51f4388df551968ebda9d79d384b5fa541dc9de56e032e8d400022d1` |
| `design/blueprint/styles.css`        | `5b11d0a8c738bdeeb96cf8024cfbb5e5a2d520bbdb9c41f480987cabb05777dc` |
