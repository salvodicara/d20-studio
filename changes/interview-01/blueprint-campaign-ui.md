# Campagna e appunti — UI incremento 7

Checkpoint autore: 23/09/2026. Autore `blueprint_module_review`, modello e sforzo
ereditati; worktree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`.
Implementazione consegnata alla review separata di `blueprint_characters`;
recheck UI sugli hash riportati concluso senza P1/P2 residui nel perimetro letto.
Non è un'approvazione indipendente né una dichiarazione di prodotto completo.

Ownership: soltanto `design/blueprint/campaign.mjs`, `campaign.css`,
`tests/campaign-ui.test.mjs` e questo rapporto. Dominio di `review_journey`;
shell/stato/browser del coordinatore. Gli altri file e le loro modifiche sono
conservati. Nessun commit, installazione o browser condiviso usato dall'autore.

Riferimenti: [ricerca campagna R191](blueprint-campaign-research.md),
[piano incremento 7](blueprint-build-plan.md),
[Campagna](../../docs/interview/pages/campaign.md),
[API e invarianti del dominio](blueprint-campaign-domain.md),
I-044–051/094/099/100/117. Si amplia il sistema visivo esistente: liste/editor
operativi e testo da leggere, tipografia e colori già presenti. Impeccable:
controlli nativi, gerarchia di lettura, errori recuperabili, misura del testo e
composizione responsive. Nessuna nuova identità grafica o dipendenza.

## Piano eseguito

1. Concordare schema/proiezioni con il dominio e route/guardie con root.
2. Collegare hub, raccolte Diario/Mondo/Appunti, dettaglio, gruppo e link leggibili.
3. Implementare bozza privata, contesto, destinatari, preview, save/cancel/reload,
   conflitti, cronologia e ripristino; distinguere lettura, modifica e inviti.
4. Collegare data diretta, disponibilità, risposta personale/ritiro e conferma,
   modifica e cancellazione dell'organizzatore.
5. Verificare handler su nodi ricreati, formatter, sintassi e rilevatore; consegnare
   a browser/review indipendenti con hash dei file effettivi.

## Comportamento dimostrabile

- Panoramica con ultimo resoconto leggibile, prossimo appuntamento, personaggi
  accessibili, materiale rivelato e ingresso al Tavolo. Gruppo riusa le query
  delle schede. Dopo revoca della membership le viste della campagna non
  mostrano più gruppo o materiale rivelato; note proprie e bozze private
  restano recuperabili. Impostazioni dichiara il ramo amministrativo incompleto.
- Appunti autonomi, raccolta Diario con resoconti/obiettivi e Mondo con
  persone/luoghi/fazioni/altre voci. Ricerca sul testo proiettato e filtri
  persistenti durante la visita. Conteggi, estratti, titoli e link derivano dalle
  query autorizzate del dominio.
- Titolo facoltativo: basta testo. Le note possono avere contesto personale
  senza campagna oppure campagna esplicita. Il contesto non condivide il testo;
  senza campagna rimane disponibile soltanto «Solo io».
- Bozza privata salvata separatamente dall'applicazione. Stato non salvato,
  salvataggio nel dispositivo e indisponibilità della memoria sono distinti.
  Un errore conserva i dati di lavoro, anche dopo render. Il guard permette
  restare, salvare solo la bozza o scartare solo le modifiche non salvate.
- Destinatari «Solo io», «Io e i DM», persone scelte e gruppo; permessi
  individuali leggere/modificare/invitare distinti. Solo il proprietario gestisce
  ACL e sezioni. Le sezioni limitano i lettori: il diritto di modifica deriva
  dalla voce, come spiegato accanto al controllo. Nessuna falsa delega di
  modifica/invito per sezione. Un editor vede/modifica solo le sezioni proiettate; la scrittura
  del dominio conserva quelle nascoste e i contributi già salvati dopo revoca.
- Anteprima «Come lo vedrà…» tramite `previewCampaignAudience`: destinatari
  effettivi della proposta, intersezione di ciò che autore della bozza e
  destinatario possono leggere. Non cambia identità e non interroga liberamente
  un'altra identità. Le sezioni e i link privati sono esclusi dalla preview del
  destinatario senza rivelarne il numero.
- Link aggiungibili a voci leggibili; un link tra resoconto e luogo conserva una
  sola origine tipizzata per ritornare al resoconto anche dopo reload. I ritorni
  di Notes conservano il contesto Library→builder già validato dal dominio.
- Cronologia leggibile, autore/data ignoti espliciti e ripristino attraverso
  nuova bozza/nuova revisione. Non ripristina ACL o partita. Conflitti mostrano
  la versione corrente e richiedono confronto esplicito prima di adottare la
  nuova base conservando il testo della bozza.
- Resoconto con sessione e personaggio narrante opzionali; obiettivo con stato
  dichiarato senza premi automatici. Sessione giocata registrabile anche senza
  data inventata. Nessuno di questi comandi chiude il Tavolo o applica riposi.
- Le date di hub, appuntamenti e alternative mostrano ora locale primaria con
  nome IANA del dispositivo e una riga distinta per ora/fuso concordati, anche
  quando le due date di calendario sono diverse.
- Appuntamento diretto con data/ora/fuso; gap DST invalido e fold con scelta
  esplicita dell'istante. Alternative di disponibilità, partecipanti, propria
  risposta sì/forse/no e ritiro. «Nessuna risposta» non significa «No».
  Disponibilità e maggioranza non confermano una data: l'organizzatore rivede
  l'alternativa e conferma. Modifica/annullamento hanno bozza e preview separate;
  conflitto sulla base richiede nuovo confronto senza perdere i campi.
- Ogni commit include `undoable:false`; le bozze sono locali/private. Per
  applicare, l'UI rispetta `preview.commit` e l'autorità del dominio. ACL e
  disponibilità richiedono connessione. Titoli dei log sono neutri e non
  includono testo o nomi privati.

## API UI e punti di integrazione

`renderCampaign(ctx)`, `bindCampaign(root,ctx)`,
`startCampaignEntry(ctx,{kind,entryId?,sessionId?,campaignId?,restoreRevisionId?,returnTo?})`,
`hasCampaignDraft()`, `confirmCampaignNavigation(ctx,callback)`,
`resetCampaignView()`, `getCampaignSection(ctx)`.

Route `campaign` e `notes`; `tab=entry&id=entry-id&revision=...` per il dettaglio,
`tab=edit&id=draft-id` per l'editor. Note è servizio autonomo, senza nuovo elemento
nella navigazione principale. Root collega navigate/hash/Back, cambio ruolo e
beforeunload; Home e ricerca usano le query del dominio. `getCampaignSection`
permette alla sidebar di mantenere Diario/Mondo/Sessioni durante dettaglio/editor.

`returnTo` conserva page/id/tab/revision, validati attraverso
`validCampaignReturn`. Il solo contesto annidato ammesso è quello tipizzato della
Biblioteca. Il passaggio tra voci aggiunge una sola origine, senza catena
ricorsiva e senza URL arbitrari. I campi di ritorno non concedono accesso al dato.

Selector stabili per browser:

| Azione                 | Selector                                                                               |
| ---------------------- | -------------------------------------------------------------------------------------- |
| Crea voce              | `data-campaign-new="note/world/recap/quest"`                                           |
| Apri/modifica          | `data-campaign-open`, `data-campaign-edit`                                             |
| Campi                  | `data-campaign-path="data.title/data.body/..."`                                        |
| Contesto nota          | `data-campaign-context` (vuoto = nessuna campagna)                                     |
| Audience               | `data-campaign-access-mode="access"`, `data-campaign-grant`                            |
| Preview destinatario   | `data-campaign-preview-person`                                                         |
| Bozza/applica          | `data-campaign-save`, `data-campaign-apply`, `data-campaign-discard`                   |
| Ritorno/conflitto      | `data-campaign-return`, `data-campaign-rebase`                                         |
| Sezioni                | `data-campaign-details="sections"`, `data-campaign-add-section`                        |
| Link                   | `data-campaign-details="links"`, `data-campaign-link-choice`, `data-campaign-add-link` |
| Cronologia             | `data-campaign-history`, `data-campaign-restore`                                       |
| Sessione               | `data-campaign-new-session="direct/poll/played"`                                       |
| Disponibilità          | `data-campaign-response`, `data-campaign-withdraw`, `data-campaign-confirm-slot`       |
| Modifica/cancella data | `data-campaign-change-session`, `data-campaign-cancel-session`                         |

I gruppi di campi espandibili conservano apertura sui render di aggiunta,
rimozione, audience e salvataggio. L'aggiunta di una sezione porta il focus al
nuovo titolo senza riposizionare la pagina in alto. Il focus sul titolo pagina
si aggiorna soltanto quando cambia la route, non a ogni checkbox.

## Verifiche autore

- `node --test design/blueprint/tests/campaign-ui.test.mjs`: **20/20**.
- UI + `campaign-content.test.mjs` + `campaign-sessions.test.mjs`: **55/55**
  allo snapshot sotto. La combinazione verifica compatibilità; non attribuisce
  all'autore UI la paternità o review indipendente dei test del dominio.
- `node --check design/blueprint/campaign.mjs`: PASS.
- Prettier sui tre file UI/test e sul rapporto: PASS.
- Impeccable detector, chiamata su `campaign.mjs` e `campaign.css`: risultato
  `[]`; l'assenza di pattern segnalati non sostituisce il controllo visivo.

Il harness ricrea i nodi dopo ogni render e decodifica gli attributi come il DOM.
I test riacquisiscono i controlli correnti. Coprono nota privata/reload,
fallimento recuperabile, guardia save-only, data diretta, contesto campagna,
ritorno Library, preview riservata, editor e revoca, confronto/ripristino,
sondaggio/ritiro/conferma, fold DST, ACL offline, modifica/cancellazione data,
bozza indisponibile, apertura dei dettagli, ritorno da un link al resoconto,
fusi attraverso mezzanotte, revoca membership e audience delle sezioni.

Il browser è esclusivo del coordinatore. Suoi riscontri al checkpoint: percorso
base Note con tre gruppi PASS; World con due gruppi PASS dopo correzione della
chiusura dei `details` e del ritorno resoconto→luogo. La review indipendente e
lo screenshot Sessioni hanno riprodotto il label errato del fuso: corretto con
ora locale esplicitamente etichettata e ora concordata distinta; test RED→GREEN
UTC/Roma attraverso mezzanotte. Ulteriori rilievi del reviewer su membership e
permessi delle sezioni sono corretti e coperti da test RED→GREEN. Il reviewer `blueprint_characters` ha ripetuto indipendentemente i probe
cross-midnight, revoca membership e grant di sola lettura su nodi freschi:
tutti PASS su `31fadc55…`/`fb32c278…`; suo gruppo esteso di test 75/75 PASS.
Non rileva P1/P2 UI residui nel perimetro letto. Root prosegue le verifiche
browser e il report complessivo attende il suo snapshot della shell: questo
rapporto non sostituisce quelle attività.

## Snapshot consegnato alla review

| File                                          | SHA-256                                                            |
| --------------------------------------------- | ------------------------------------------------------------------ |
| `design/blueprint/campaign.mjs`               | `31fadc55773acad2ddfe70c2d8f9905c5b4175693a96c0a0814072f58b8cc3bf` |
| `design/blueprint/campaign.css`               | `d2bda7dab5c2144f6085cd9948cac2977f3e3238f20a9b66a39d6697ebdc389f` |
| `design/blueprint/tests/campaign-ui.test.mjs` | `fb32c2787981533641feac36dee0b7481bd347117a0ff4de60a33def4eca6070` |

## Limiti mantenuti aperti

- La demo usa le sole identità player/dm esistenti. Non è autenticazione,
  collaborazione distribuita, coediting in tempo reale o sistema completo di
  ruoli/inviti; le autorizzazioni sono proiezioni e comandi verificati localmente.
- Testo semplice e sezioni: nessun editor ricco, allegato/media, impaginazione
  editoriale completa o composizione automatica di resoconti. Le descrizioni
  scritte restano dell'utente e non vengono tradotte automaticamente.
- Il picker aggiunge link a voci. Le proiezioni sanno leggere anche link ad
  attori/scene/Homebrew già presenti; i rispettivi picker completi restano da
  integrare. Le mappe rivelate riusano il comando esistente della shell.
- Amministrazione della campagna, creazione/ingresso/inviti reali, co-DM,
  trasferimenti, mappe e calendario narrativo completo restano obblighi aperti.
- Sondaggi disponibili con creazione/risposta/ritiro/conferma; non esiste ancora
  un editor dedicato per cambiare o chiudere un sondaggio aperto. La modifica e
  cancellazione riguardano l'appuntamento confermato. Nessuna notifica,
  sincronizzazione con calendario esterno o messaggio inviato a terzi.
- Persistenza sul dispositivo e guardie non dimostrano sincronizzazione fra
  dispositivi, backup remoto o recupero del testo non salvato dopo arresto.
  Il salvataggio di bozza è esplicito.
