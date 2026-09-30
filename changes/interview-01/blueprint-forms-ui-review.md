# Review distinta — UI forme e compagni, incremento 9

23/09/2026. Reviewer `blueprint_characters`; modello e sforzo ereditati.
Worktree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Nessuna modifica a sorgenti o test. Nessun browser: la sessione condivisa e
le prove reali sono riservate al root. Questo documento valuta un candidato
dirty mediante hash dei file; non inventa un candidate SHA Git.

## Perimetro e stato

Review di `forms-ui.mjs`, `forms-ui.css`, `tests/forms-ui.test.mjs` e del
rapporto dell'autore, con lettura dei soli raccordi necessari al dialogo,
alla proiezione del dominio e alla selezione del punto sulla mappa. Sono
distinte la review del dominio e la futura verifica finale dei consumer root.
Non è un'approvazione dell'intero incremento 9.

La prima lettura completa ha coperto input e moduli, preview e costi,
applicazione/riprova, errori e conservazione campi, forme note, correzioni,
attività persistenti, tempi personali, controllori, ruolo/revoca, callback
tardive, ripresa dopo reload, EN/IT e struttura di accessibilità nel codice.
I probe indipendenti eseguono gli handler reali con store e dominio reali,
riacquisendo i controlli dopo ogni render. Non equivalgono a un browser.

Stato finale del perimetro: **nessun P1/P2 residuo; R1 e R2 chiusi dopo recheck indipendente**.

## R1 — P2, oggetti a terra o esauriti bloccavano le forme successive

`equipmentHTML` e `wildSelection` usavano tutte le righe della proiezione
dell'inventario. Il dominio accetta invece solo la disposizione degli oggetti
trasportati: quantità positiva e posizione diversa da `ground`.

Riproduzione indipendente attraverso UI/store:

1. Personaggio sintetico con due usi disponibili; scegliere Gatto.
2. Impostare il mantello su «Cade», vedere la preview e applicare.
3. Tornare alla forma originale, poi scegliere Topo.
4. La preview resta invalida anche con un uso disponibile: chiede una
   disposizione per ogni oggetto trasportato. Non esiste un controllo per
   rimuovere il mantello dalla selezione.

Una riga con `quantity: 0` provoca lo stesso errore già alla prima forma.
Il problema non riguarda il bug B1 del primo clic trovato dal root.

L'autore ha introdotto `carriedEquipment` condiviso da visualizzazione e
payload. Recheck indipendente sul source `34f9ea4f…`: Gatto → drop → ritorno →
Topo, con scelta esplicita dei PF temporanei e una riga vuota aggiuntiva,
passa. Il mantello resta a terra, la riga vuota rimane nell'inventario e sono
spesi esattamente due usi. Nessun recupero o cancellazione impliciti. **Chiuso.**

## R2 — P2, la nuova comparsa ereditava l'identità del compagno precedente

Nel candidato `34f9ea4f…`, `changeTab` non azzera `panel.companionId` e
`requestAppearance` lo inoltra anche fuori dal contesto della creatura
gestita. La selezione sulla mappa usa quell'ID per escludere una pedina dalle
collisioni, mentre la creazione della nuova creatura non la esclude.

Riproduzione indipendente:

1. Creare compagno manuale A e collocarlo a `(300,250)`; genitore a `(250,250)`.
2. Aprire la gestione di A → Creature collegate → Compagno Selvatico.
3. Nome B, profilo Topo, «Scegli il punto sul Tavolo».
4. Il callback riceve `companionActorId: A` pur preparando B. Usando gli stessi
   argomenti del consumer mappa, `previewTokenPlacement` restituisce
   `available: true` sul punto occupato da A.
5. Restituire quel punto al pannello e chiedere la preview: Apply è disabilitato
   con «This space is unavailable».

Il dominio impedisce l'esecuzione e non spende risorse; l'errore è la falsa
indicazione di spazio libero e il contesto della richiesta. Inviato a root e
autore UI, senza modifica del reviewer.

L’autore ha azzerato gli ID contestuali uscendo dalla gestione e limita
`companionActorId` alla ricomparsa della creatura corrente. Recheck indipendente
sul source `d6bd59e2…`: il punto occupato da A è rifiutato già dalla preview
spaziale; un punto libero consente preview e applicazione di B una sola volta.
A è invariato, esistono due identità distinte e il costo è un solo uso. **Chiuso.**

## B1 già assegnato dal root

Il blur del nome/numero smontava il controllo tra pointerdown e click.
L'autore ha corretto il render al `change`: testo/numero aggiornano la scelta
e invalidano la preview mantenendo il nodo; SELECT e checkbox conservano il
render strutturale. Ho letto il delta e rieseguito il test che controlla
l'identità del pulsante prima/dopo il blur. L'esito browser appartiene al
root, non viene dedotto dal test né duplicato come nuovo finding.

## Verifica eseguita e limiti

Checkpoint finale: `node --test` sui tre file `forms-ui.test.mjs`,
`forms-companions.test.mjs`, `state.test.mjs`: **70/70 PASS** (23 UI, 31 dominio, 16 store).
Probe supplementari R1 e R2 eseguiti tramite import in memoria del vero
harness UI; nessun test o file applicativo aggiunto dal reviewer. Altri tre
probe indipendenti passano: commit rifiutato conserva campi escaped e consente
riprova; doppio evento di un vecchio Apply non rispende; handler catturato prima
del cambio ruolo non applica la scelta sotto la nuova identità.

Le preview rileggeranno la proiezione corrente e confrontano il key prima del
commit; i pulsanti non consumano alla selezione. I dati vengono escaped e i
link fonte consentono HTTPS. Il pannello non annida form, i pulsanti operativi
sono `type=button`, ci sono label native, titolo della preview focalizzabile,
messaggi live/alert e breakpoint CSS. Le prove di tastiera, touch, focus e
resa reali restano parte del browser coordinato, non certificate da questa
lettura. Catalogo e meccaniche ancora dichiarate non implementate non vengono
promossi a capacità complete dalla review.

## Hash finali del perimetro UI

| File                                              | SHA-256                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------ |
| `forms-ui.mjs`                                    | `d6bd59e26a5ed7ed3119f4778c7106fa8f95ce3d436a1436658c0699fbfad7a6` |
| `forms-ui.css`                                    | `6d4576fd51f4388df551968ebda9d79d384b5fa541dc9de56e032e8d400022d1` |
| `tests/forms-ui.test.mjs`                         | `69a7c183792051b417baa847a7b9ff62c43274bc5b5dfd00ecbde87e6cbd7309` |
| `forms-companions.mjs` (dipendenza in evoluzione) | `5a8c21a84b6f2e2afc6e8a4ec3b2cfda1cb7d92407c88962fdcac04ffae89586` |
| `companion-map.mjs` (raccordo letto)              | `d25eee2d431ba09f15c7eb3042b0925c2672dbdd61e764b69776c5cd294e2809` |

I raccordi root e il nuovo `forms-profile.mjs` hanno una review distinta: questo
esito non attesta quel codice né i percorsi browser ancora in verifica.
