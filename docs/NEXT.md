# Prossimo passo — intervista completa di prodotto

**Non avviare o riprendere demo, prototipi o mock.** Il proprietario ha corretto la sequenza con
[D-012](DECISIONS.md): vuole concordare l'intera app attraverso una lunga intervista Grill-me,
prima di qualunque progettazione visuale. Nessuna risposta all'intervista è ancora registrata.

Il [prompt completo](INTERVIEW_PROMPT.md) è pronto per la prossima sessione, che il proprietario
avvierà quando vuole. Nessun successore automatico per questo passaggio. Metodo e schema delle
pagine concettuali: [docs/interview](interview/README.md). Una domanda alla volta, attesa della
risposta, decisioni esplicite e nessuna scadenza artificiale all'approfondimento.

## Cosa resta e cosa è ritirato

Conservati: [ricerca sui prodotti](../evidence/research-01/coverage.md),
[affermazioni/fonti](../evidence/research-01/claims.md), inventario J01–J19,
[regole EN/IT verificate](../evidence/experience-01/rules.md),
[confronti documentali](../evidence/experience-01/references.md), skill e personalizzazioni.
Le raccomandazioni di sequenza e le inferenze storiche sono evidenza da discutere, non istruzioni
che sostituiscono le scelte del proprietario.

Ritirati: mappe e contratto del guado, casi di accettazione derivati, candidato design-01 e le due
direzioni. Non integrarli, completarli o recuperarli da cronologia/branch/backup come base della
nuova intervista. La storia Git resta tracciabile senza essere autorità progettuale.
Il ritiro non tocca d20 Folio o i suoi dati. [Registro del riallineamento](../changes/interview-reset/task.md).

## Ripresa e gate

Repository principale `/Users/salvatoredicara/Workspace/d20-studio`; un writer/worktree isolato
sotto `~/Workspace/Codex` per il nuovo lavoro documentale, dopo inventario dei task esistenti.
Consiglio: GPT-6 Astra/high; Max è disponibile se selezionato dal proprietario. Fonti e natura
provvisoria del consiglio nel prompt. Nessuna installazione, cambio automatico di sforzo o spesa.

Il coordinatore precedente è `01a096b8-6e9f-78e1-b937-7787fb67f31e`, host local. Non archiviarlo
mentre risponde o modificare altri task. Il nuovo task conserva l'intervista nel repository,
con area corrente e domanda successiva prima di ogni pausa. Revisione tecnica/documentale e
integrazione restano soggette a WORKFLOW; non sostituiscono l'approvazione del prodotto.

Il gate per i mock è l'approvazione esplicita del contratto complessivo da parte del proprietario,
con funzioni, pagine, navigazione, comandi, stati ed eccezioni concordati. Nessun silenzio vale
come consenso. Nessuna catena autonoma può superare questo gate.
