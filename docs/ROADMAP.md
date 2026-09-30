# Piano — D-014 (01/10/2026)

Direzione dell'owner del 01/10/2026 ([D-014](DECISIONS.md#d-014--prima-le-funzioni-poi-laspetto-01102026)):
prima si definiscono l'app, le funzioni e gli schermi; l'aspetto grafico si fa dopo, in una fase
dedicata. Stato al 01/10/2026: A fatta, B accettata dall'owner con l'aggiunta dei calendari esterni
([I-245](interview/DECISIONS.md)), versione funzionale congelata con il tag locale `blueprint-functional-v1`;
si apre C. Il passo operativo corrente è sempre in [NEXT](NEXT.md); la mappa breve delle funzioni è
[FEATURE_MAP](interview/FEATURE_MAP.md).

| Fase                                      | Che cosa si fa                                                                                                                                                                                                                                                                                                                                                  | Quando è finita                                                                                                                                                                                |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **A. Contratto funzionale** (fatta)       | Tutte le funzionalità presenti, raggiungibili e funzionanti nel blueprint, con schermi e interazioni copiati dal mercato; la mappa breve delle funzioni per l'owner; il Markdown per gli agenti sincronizzato con l'app.                                                                                                                                        | Censimento senza lacune di costruzione, revisioni di chiusura corrette, mappa breve scritta, candidata identificata dal [manifest](../changes/interview-01/blueprint-candidate-manifest.json). |
| **B. Revisione dell'owner** (accettata)   | L'owner naviga l'app e legge la [mappa](interview/FEATURE_MAP.md), chiede correzioni in chat; l'agente corregge e ripresenta.                                                                                                                                                                                                                                   | Approvazione **esplicita** dell'owner: si congela la versione (nuovo manifest, commit e tag) come contratto dell'app. Visitare o non rispondere non approvano.                                 |
| **C. Design visivo** (prossima, sessione dedicata) | Direzione e sistema grafico copiati dai riferimenti, prodotto per prodotto, applicati al blueprint **senza cambiare le funzioni**. L'aspetto attuale e [DESIGN.md](../design/blueprint/DESIGN.md) sono provvisori, non approvati e sostituibili; l'arretrato grafico già raccolto è in [visual-phase-backlog](../changes/interview-01/visual-phase-backlog.md). | Approvazione dell'owner dell'aspetto; le funzioni della Fase B restano identiche (stessi percorsi e test).                                                                                     |
| **D. Nome e brand**                       | Fase dedicata già prevista ([D-005](DECISIONS.md)): nome, posizionamento, marchio; `d20 Studio` resta un nome di lavoro.                                                                                                                                                                                                                                        | Scelta dell'owner; nessun acquisto di domini o annuncio senza autorizzazione.                                                                                                                  |
| **E. Piano di implementazione reale**     | Architettura, dati, sicurezza (ogni identità riceve solo la propria proiezione), backend, costruzione a incrementi con test e review in un'altra sessione, staging, rilascio.                                                                                                                                                                                   | Rilascio solo con autorizzazione esplicita per deploy, dati reali, spesa e impegni esterni. d20 Folio resta invariato fino al rilascio del sostituto ([D-009](DECISIONS.md)).                  |

Regole che valgono in tutte le fasi: le decisioni dell'owner stanno in [DECISIONS](DECISIONS.md), le
scelte delegate in [DECISIONS dell'intervista](interview/DECISIONS.md); ogni funzione copia un prodotto esistente; il
blueprint è una simulazione locale, non una garanzia di backend, sicurezza o multiplayer reali;
le esclusioni dell'owner restano (musica ospitata, voce e video, vista 3D, marketplace, sessioni a
pagamento, IA come DM).

## Storico (non più operativo)

La sequenza che segue è quella di D-013 / I-218 (23/09/2026). È conservata per la storia delle
decisioni ed è sostituita dal piano qui sopra: la fase «Concordare e fissare il contratto» è ora
la Fase B, «Rifinire lo stile e l'identità» è divisa nelle Fasi C e D, «Prove mirate e
implementazione reale» e «Transizione e rilascio» sono la Fase E.

### Sequenza di lavoro — D-013 / I-218 (storica)

Il risultato corrente è un contratto visuale navigabile con Markdown
sincronizzato per gli agenti. [BLUEPRINT_CONTRACT](interview/BLUEPRINT_CONTRACT.md)
definisce criteri e autorità; [NEXT](NEXT.md) conserva l'unica azione operativa.
La precisazione dell'owner supera la precedente sequenza «approvare tutto il
Markdown prima di un prototipo», preservando ricerca e decisioni già acquisite.

| Fase                                         | Risultato concreto                                                                                                                       | Condizione per avanzare                                                                                                                       |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Adesso: costruire il blueprint integrato** | Una sola app locale navigabile con dati dimostrativi, ruoli, pagine, pannelli, comandi ed esiti; Markdown aggiornato in parallelo.       | Copertura verificata da funzioni e indici esterni; percorsi e interazioni provati, lacune risolte e review distinta. Non basta avere il menu. |
| Concordare e fissare il contratto            | L'owner visita e corregge la candidata; dopo approvazione esplicita si identifica la versione del visuale e del Markdown corrispondente. | Un'unica baseline funzionale, nessuna divergenza nascosta; l'owner non deve leggere tutto il corpus.                                          |
| Rifinire lo stile e l'identità               | Direzione estetica coerente, finiture e branding; il nome rimane provvisorio finché scelto.                                              | Scelte visive approvate senza reinterpretare arbitrariamente comportamento e struttura. Nessun acquisto implicito.                            |
| Prove mirate e implementazione reale         | Rischi tecnici, regole, dati, autorità, rete e poi percorsi reali completi con persistenza.                                              | Piano, test adeguati, app in esecuzione, review e integrazione secondo WORKFLOW; il prototipo non è promosso automaticamente a produzione.    |
| Transizione e rilascio                       | Copertura del contratto, recupero, coesistenza e trasferimenti verificati.                                                               | Autorizzazioni specifiche per deploy, release, spese e migrazioni reali; d20 Folio invariato fino al passaggio concordato.                    |

I-180/I-190/I-202/I-215 conservano ricerca ampia e scelte ordinarie delegate.
D-013/I-218 autorizza il codice dimostrativo locale necessario al blueprint:
non chiedere un sì per ogni funzione o schermata. Gli aggiornamenti mostrano
risultati collegati; domande soltanto sui conflitti sostanziali non risolti.
Grafica provvisoria non significa funzioni omesse. Prove della simulazione e
prove dell'app reale restano distinte. Nessuna scadenza, taglio di rilascio,
spesa o garanzia di fattibilità universale introdotti da questa sequenza.
