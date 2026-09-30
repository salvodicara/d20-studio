# Condizioni e sopravvivenza — ricerca per l’incremento 10

## Stato e perimetro

Ricerca indipendente del 23/09/2026, stesso modello e sforzo della sessione
coordinatrice. File posseduto esclusivamente da `blueprint_characters`.
Nessuna modifica a sorgenti, contratti condivisi o NEXT; nessuna installazione,
prova nel browser dei prodotti, partita umana o nuova automazione attestata.
Il coordinatore sta ancora chiudendo l’incremento 9: questo documento non lo
certifica e non costituisce un’approvazione dell’intero blueprint.

Obiettivo successivo proposto: condizioni con origine e termine, movimento da
Prono e gestione di PF, incoscienza, tiri salvezza contro morte, stabilizzazione
e morte esplicita sullo stesso Tavolo e sulla stessa scheda. Le API sotto sono
vincoli e suggerimenti da concordare fra autori, **non API implementate**.

## Continuità con le decisioni

- [I-181 e I-182](../../docs/interview/DECISIONS.md): condizioni strutturate,
  origine e termine visibili, concentrazione, conseguenze individuali, dadi
  fisici/digitali e correzioni; nessuna scadenza universale a fine round.
- I-027/I-028 e [TABLE_REACTIONS](../../docs/interview/TABLE_REACTIONS.md):
  scomposizione dei risultati, autorità, conseguenze collegate e richieste
  persistenti; Esc non equivale a una risposta o a un tiro.
- [TABLE_MOVEMENT](../../docs/interview/TABLE_MOVEMENT.md): costo effettivo,
  movimento già percorso conservato, preview e annullamento distinti;
  nessuno Scatto automatico per pagare un movimento non autorizzato.
- [COMBAT_EXPLORATION](../../docs/interview/COMBAT_EXPLORATION.md): 0 PF non
  termina automaticamente lo scontro. Uscire dai turni non è un riposo e non
  restituisce risorse.
- [CHARACTER_ADVANCEMENT](../../docs/interview/CHARACTER_ADVANCEMENT.md):
  avanzare non cancella condizioni, PF temporanei o TS morte e non rialza un
  personaggio a 0 PF.
- [REST_TIME_FLOW](../../docs/interview/REST_TIME_FLOW.md), ricerche
  [R192](blueprint-rest-time-research.md) e
  [R193](blueprint-forms-companions-research.md): tempo narrativo distinto da
  quello reale; incoscienza da sonno con propria origine; Forma Selvatica,
  concentrazione e famigli hanno conseguenze specifiche, non un unico reset.
- R158/R169 in [RESEARCH](../../docs/interview/RESEARCH.md) restano precedenti;
  questa verifica li integra, non li sostituisce. La delega I-180/I-209 e
  l’autorizzazione D-013/I-218 consentono di proseguire senza nuovi sì/no su
  scelte ordinarie. Non sono autorizzati cambi di privacy o pubblicazioni.

## Fonti normative immutabili

Lettura diretta dei PDF ufficiali EN/IT, riaperti online e confrontati con le
copie locali già usate negli incrementi precedenti. Pagine indicate sono quelle
stampate; estrazione locale suddivisa per pagina, non snippet di un motore di
ricerca.

| ID   | Fonte e revisione                                                                                         | SHA-256 PDF verificato il 23/09/2026                               |
| ---- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| N-EN | [SRD 5.2.1 EN](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), baseline 2024    | `8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87` |
| N-IT | [SRD 5.2.1 IT](https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf), baseline 2024 | `a7b88b0cd4f6424624cf5046c96755652985a27a2d405e30948e44b1f5e1f718` |

Percorso delle copie: `/Users/salvatoredicara/Workspace/Codex/d20-studio-experience-evidence/`.
I riferimenti eseguibili futuri devono mantenere `kind: srd`, edizione `2024`,
revisione `5.2.1` e pagine pertinenti. Il testo italiano non autorizza a
mescolare il regolamento 2014 con quello 2024.

### Regole che cambiano effettivamente il comportamento

| ID  | Regola verificata                                                                                                                                                                                                                                                               | EN / IT                   | Conseguenza per il blueprint, proposta                                                                                                                                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| N01 | Una condizione non si somma a sé stessa; Indebolimento è l’eccezione. Origini specifiche definiscono come termina.                                                                                                                                                              | 179 / 206                 | Più istanze possono sostenere un solo stato effettivo. Terminare una fonte non deve cancellare le altre. Questa struttura dati è una nostra deduzione necessaria, non uno schema prescritto dal libro.                                                                     |
| N02 | Incapacitato impedisce azione, azione bonus, reazione e parola; interrompe la concentrazione. Se presente quando si tira iniziativa dà svantaggio. Non azzera da solo la Velocità.                                                                                              | 184 / 208                 | Un controllo unico per disponibilità, separato da immobilità. Anche Stordito 2024 include Incapacitato ma non impone Velocità 0: EN189/IT216.                                                                                                                              |
| N03 | Prono consente strisciare oppure spendere movimento pari a metà Velocità, arrotondato per difetto, per rialzarsi. A Velocità 0 non ci si rialza.                                                                                                                                | 186 / 212                 | **Rialzati** mostra costo e residuo; non usa un’azione. Budget insufficiente non autorizza Scatto implicito. Non si spende metà del movimento residuo. Vedi raccordo unità sotto.                                                                                          |
| N04 | Strisciare costa un’unità extra per ogni unità percorsa; sul terreno difficile costa due unità extra.                                                                                                                                                                           | 179 / 216                 | Costo totale 2× normale, 3× sul difficile, non 4×. Conservare distanza e costo distinti lungo ogni tratto.                                                                                                                                                                 |
| N05 | Prono dà svantaggio ai propri attacchi. Contro il bersaglio prono: vantaggio se l’attaccante è entro 1,5 m/5 ft, altrimenti svantaggio.                                                                                                                                         | 186 / 212                 | Il criterio è la distanza, non semplicemente arma in mischia/a distanza. Le cause di vantaggio/svantaggio vanno spiegate e combinate secondo le regole.                                                                                                                    |
| N06 | Privo di sensi include Incapacitato e Prono e fa cadere quanto si tiene. Velocità 0 non aumentabile; vantaggio agli attacchi contro di sé; fallimento automatico TS For/Des. Un attacco che colpisce è critico se l’attaccante è entro 1,5 m/5 ft. Quando termina, resta Prono. | 191 / 212                 | Nessun tiro fittizio per un TS automaticamente fallito; non è un colpo automatico. Curare non significa rialzare. Oggetti tenuti non equivale a tutto l’equipaggiamento indossato.                                                                                         |
| N07 | A 0 PF una creatura muore subito o diventa Priva di sensi secondo i casi. Il mostro normalmente muore a 0; il DM può trattare un singolo mostro come un personaggio. PF massimi ridotti a 0 causano morte.                                                                      | 17 / 19                   | Politica esplicita per creatura; non dedurla dall’essere una pedina PNG o dall’avere un controller giocatore. Un massimo sconosciuto non vale 0.                                                                                                                           |
| N08 | Quando un danno porta il personaggio a 0, il danno rimanente pari o superiore ai PF massimi causa morte istantanea.                                                                                                                                                             | 17 / 19                   | Con PF6/max12, danno18 lascia12 e uccide; danno17 lascia11 e non uccide per questa regola. Tenere PF temporanei e danno effettivo nel calcolo.                                                                                                                             |
| N09 | All’inizio del proprio turno, a 0 PF e non Stabile, occorre un TS morte. È 1d20, non associato a una caratteristica: almeno10 riesce. Terzo successo rende Stabile; terzo fallimento causa morte. I due conteggi tornano a0 quando si recuperano PF o si diventa Stabili.       | 17–18 / 19–20             | Richiesta identificata dall’evento di turno, non da ogni render. Nessun bonus COS inventato. Eventuali modificatori devono avere una fonte applicabile.                                                                                                                    |
| N10 | Sul d20 del TS morte, 1 naturale dà due fallimenti; 20 naturale restituisce1 PF.                                                                                                                                                                                                | 18 / 20                   | Separare faccia naturale e totale modificato. Non importare questo comportamento negli altri TS. Il 20 attiva anche il normale raccordo di recupero PF.                                                                                                                    |
| N11 | Danno ricevuto mentre si è già a0 PF dà un fallimento, due se proviene da un critico; danno almeno pari ai PF massimi causa morte.                                                                                                                                              | 18 / 20                   | Non ricontare come fallimento il solo colpo che ha portato da PF positivi a0. Un evento applicato due volte non deve raddoppiare i fallimenti.                                                                                                                             |
| N12 | Aiuto per stabilizzare richiede una prova Saggezza (Medicina) CD10. Stabile resta a0 e Privo di sensi, senza TS morte; un nuovo danno fa perdere la stabilità. Senza cura recupera1 PF dopo1d4 ore.                                                                             | 18 / 20                   | Aiutare non garantisce1 PF. Il d4 può essere fisico o digitale e il tempo è quello narrativo. Non usare un timer di ore reali o sostituire il risultato con una media.                                                                                                     |
| N13 | Cura restituisce PF entro il massimo. PF temporanei si perdono prima dei PF, non sono cura, non si sommano e non risvegliano chi è a0 PF.                                                                                                                                       | 17–18 / 19–20             | Mostrare danno, assorbimento temporaneo, perdita PF e sovracura. La regola parla di danno ricevuto a0, non soltanto di PF persi: se i temporanei assorbono tutto, N11 resta applicabile. È lettura combinata dei due paragrafi, non un esempio esplicito separato del SRD. |
| N14 | Una creatura morta non recupera PF prima di essere riportata in vita dalla magia pertinente. Il ritorno non cancella universalmente condizioni ancora in corso.                                                                                                                 | 180 / 210                 | Pozione, riposo o campo Cura non devono resuscitare. **Correggi stato** è distinto da una resurrezione eseguita e conserva motivo/provenienza.                                                                                                                             |
| N15 | Il knockout 2024 con un attacco in mischia porta invece a1 PF e Privo di sensi, iniziando un riposo breve. Il termine del riposo, una cura o un’azione con Medicina CD10 terminano questa incoscienza.                                                                          | 17 / 19                   | Non riusare il ramo Stabile0 del 2014 o di un videogioco. La causa di incoscienza deve essere distinta da 0PF. Nessuna cura implicita per gli altri presenti.                                                                                                              |
| N16 | Indebolimento 2024 è cumulativo: −2 per livello alle prove con d20, −5 ft/1,5m per livello alla Velocità; livello6 causa morte. Riposo lungo ne rimuove un livello, salvo restrizioni della causa.                                                                              | 181 / 208                 | Non usare la vecchia scala2014. Il TS morte è un TS/prova con d20: applicare la penalità con fonte, mantenendo i casi della faccia naturale N10. Non basta un’icona numerata.                                                                                              |
| N17 | Incapacitazione o morte interrompono direttamente la concentrazione; altrimenti il danno richiede il TS previsto. Eventi simultanei durante un turno hanno l’ordine scelto dalla persona di cui è il turno.                                                                     | 179,184,187 / 206,208,207 | Prima di chiedere un TS concentrazione ormai inutile, risolvere il nuovo stato. Cura e TS morte entrambi a inizio turno richiedono ordine esplicito quando rilevante; nessun ordine di rete assunto come regola.                                                           |

**Raccordo EN/IT da fissare prima di implementare N03.** Entrambi i PDF dicono
di arrotondare per difetto, ma esprimono Velocità rispettivamente in piedi e
metri. Fare `floor(9 / 2)` sul valore metrico darebbe4 m; dimezzare30 ft dà15 ft,
cioè4,5 m con la conversione D&D. Raccomandazione tecnica: una sola unità
canonica delle regole e conversione di presentazione, con esempio30 ft→15 ft,
non arrotondamento diverso cambiando lingua. Per velocità dispari o manuali
serve dichiarare la granularità scelta e testarla; nessuna errata ufficiale
su questo punto è stata trovata. Non è un motivo per bloccare il resto o
chiedere al proprietario di risolvere un dettaglio numerico dell’implementazione.

**Controevidenza linguistica già nota in R169.** IT208 introduce Incapacitato
con la parola «paralizzato» nel primo periodo. I suoi effetti e EN184 chiariscono
la voce; non attribuire a Incapacitato la Velocità0 di Paralizzato.

### Indice completo delle condizioni SRD da mantenere nel catalogo

Questa tabella identifica le definizioni; non attesta che tutte le relative
automazioni siano già presenti. Le condizioni dipendenti da fonte, vista,
bersaglio o immunità richiedono quei dati, non semplici interruttori universali.

| ID EN         | Nome IT ufficiale | Pagina EN / IT |
| ------------- | ----------------- | -------------- |
| Blinded       | Accecato          | 177 / 202      |
| Charmed       | Affascinato       | 178 / 202      |
| Deafened      | Assordato         | 181 / 204      |
| Exhaustion    | Indebolimento     | 181 / 208      |
| Frightened    | Spaventato        | 182 / 216      |
| Grappled      | Afferrato         | 182 / 203      |
| Incapacitated | Incapacitato      | 184 / 208      |
| Invisible     | Invisibile        | 184 / 209      |
| Paralyzed     | Paralizzato       | 186 / 210      |
| Petrified     | Pietrificato      | 186 / 211      |
| Poisoned      | Avvelenato        | 186 / 204      |
| Prone         | Prono             | 186 / 212      |
| Restrained    | Trattenuto        | 187 / 218      |
| Stunned       | Stordito          | 189 / 216      |
| Unconscious   | Privo di sensi    | 191 / 212      |

Stabile, morto, concentrazione, Schivare e marcature personalizzate non vanno
falsamente presentati come altre condizioni di questo elenco. Possono stare
nello stesso pannello, con tipo e comportamento distinguibili.

## Pattern pubblicati dei prodotti

Fonti primarie consultate il 23/09/2026. “Pubblicato” significa documentazione
o changelog del produttore, **non osservazione di runtime nella presente
ricerca**. Nessun prodotto è prova che ogni sua decisione sia ottimale per
questo contratto; i limiti sotto servono proprio a evitare una copia errata.

| ID  | Fonte, versione/data                                                                                                                                                                                                   | Evidenza circoscritta                                                                                                                                                                           | Sintesi proposta e limite                                                                                                                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P01 | [Foundry Active Effects](https://foundryvtt.com/article/active-effects/), pagina corrente senza release unica dichiarata                                                                                               | Effetti modificano i dati effettivi preservando quelli di base; gestione da scheda, stato attivo/disattivo, provenienze Actor/Condition/Item.                                                   | Riutilizzare la separazione tra base e conseguenze temporanee. Non consegnare all’utente comune editor di percorsi tecnici né attribuire al core ogni automatismo del sistema.                                                                             |
| P02 | [DnD5e Active Effects](https://github.com/foundryvtt/dnd5e/wiki/Active-Effects), [testo ufficiale letto](https://raw.githubusercontent.com/wiki/foundryvtt/dnd5e/Active-Effects.md), pagina marcata **6.0.0**          | Effetti temporanei con durata o evento di scadenza; fine riposo breve/lungo; inizio/fine prossimo turno di fonte/bersaglio. Gli eventi speciali sostituiscono la durata standard.               | Selettore di termini comprensibili legati alla creatura giusta; non due timer concorrenti per lo stesso effetto. Il documento è modificabile, non un hash di eseguibile e non prova tutti i casi fuori iniziativa.                                         |
| P03 | [Foundry Tokens](https://foundryvtt.com/article/tokens/), documentazione corrente                                                                                                                                      | HUD contestuale con icone di stato; overlay grande separato; manipolazione limitata ai token controllati. Dati di Actor collegato e token indipendente sono distinti.                           | Icona compatta sulla pedina, dettaglio accessibile, identità canonica della creatura. Non trasformare l’overlay “caduto” nella cancellazione della scheda o del turno.                                                                                     |
| P04 | [D&D Beyond Maps: Condition Tracking](https://www.dndbeyond.com/posts/2212-condition-tracking-comes-to-the-maps-vtt), **23/07/2026**                                                                                   | Dal token si apre un modal di condizioni standard; icone nel menu contestuale. L’articolo dichiara sincronizzazione con la scheda e ammette talvolta un refresh per riallinearla.               | Stesso accesso da Tavolo e scheda e stesso stato. La fonte non dimostra automazioni numeriche complete né marcatori sempre sovrapposti alla mappa; non usare i commenti degli utenti come prova contraria o positiva.                                      |
| P05 | [Roll20 scheda D&D2024: Header](https://roll20.net/compendium/dnd5e/00%20Start%20Here%3AHelp-%20DnD%20Fifth%20Edition%20Character%20Sheet-%20Header), documentazione corrente senza release esposta                    | PF correggibili; comandi Danno/Cura con temporanei prima dei PF e tetto alla cura. A0 PF l’area cambia per mostrare TS morte e conteggi automatici.                                             | Una zona vitale contestuale, non una pagina nuova. La correzione diretta rimane distinta dall’esecuzione di danno/cura. Il prodotto non documenta qui il nostro registro dei dadi fisici o il nostro Undo.                                                 |
| P06 | [Roll20 scheda D&D2024: Sidebars](https://roll20.net/compendium/dnd5e/00%20Start%20Here%3AHelp-%20DnD%20Fifth%20Edition%20Character%20Sheet-%20Sidebars), documentazione corrente                                      | Sezione condizioni con scelta, toggle, testo della regola e modifiche espandibili; livello di Indebolimento; effetti persistenti non sempre attivi solo perché conosciuti.                      | Mostrare cosa cambia e perché; “conosco la magia” non significa “ho già l’effetto”. Header/Sidebars letti anche tramite estrazione indicizzata primaria: alcune riaperture hanno dato timeout e accesso HTTP diretto403, nessuna prova runtime.            |
| P07 | [Fantasy Grounds: 5E Effects for Advanced Automation](https://fantasygroundsunity.atlassian.net/wiki/spaces/FGCP/pages/996642031/5E%20Effects%20for%20Advanced%20Automation), pagina “Updated Sep06”, anno non esposto | Combat Tracker espone On/Skip/Off, visibilità GM, fonte AppliedBy, bersagli e momento di decremento. Stabile può sopprimere i TS morte. La guida distingue automatismi e casi senza meccaniche. | Origine, destinatario e termine nello stesso dettaglio. **Controevidenza:** la tabella Prono semplifica mischia/distanza e Indebolimento non cambia automaticamente la velocità. Non copiarli come regole2024 corrette in tutti i casi; applicare N05/N16. |
| P08 | [BG3 Patch1](https://baldursgate3.game/news/patch-1-now-live_87), **25/08/2023**                                                                                                                                       | Corregge scomparsa della UI dei TS morte dopo salvataggio, testo della causa di vantaggio per KnockedOut e “0” ingannevole per concentrazione senza numero fisso di turni.                      | Riferimento forte per persistenza della richiesta, spiegazione del tiro e termini veritieri. È una lista di correzioni storiche, non prova del layout corrente né fonte delle regole da tavolo.                                                            |
| P09 | [Solasta: Palace of Ice, full release notes](https://www.solasta-game.com/solasta-crown-of-the-magister/news/174-palace-of-ice-full-release-patch-notes), **25/05/2023**                                               | Il produttore esplicita che Incapacitato impedisce anche il movimento nel videogioco, diversamente dal tavolo; corregge tooltip e documenta feedback sugli effetti inattivi.                    | Copiare chiarezza e feedback, non la regola divergente. Il catalogo di condizioni del videogioco contiene effetti custom, non soltanto le quindici definizioni SRD.                                                                                        |

Questa famiglia non richiede un nuovo pannello di chat, un sistema di chiamata,
un cronometro reale o asset dei prodotti citati. Nessuna fonte sopra autorizza
un’imitazione letterale del loro stile grafico o una promessa di parità totale.

## Sintesi del percorso raccomandato

**Tavolo e scheda, stessa creatura.** Vicino ai PF mostrare stato vitale e
condizioni autorizzate, con icona, nome e termine breve. Dal comando Condizioni
si cerca il catalogo o si registra un’etichetta manuale. Il dettaglio contiene
origine, applicazione, effetti realmente supportati, termine, responsabile e
correzione. Più fonti dello stesso stato si aprono come voci distinte, senza
duplicare penalità. Questo combina P01–P06; non inventa una nuova mappa di pagine.

**Prono.** Nel contesto movimento: Rialzati con costo e residuo, oppure percorso
strisciando con la stessa mappa, ostacoli, waypoint e opportunità già presenti.
Niente rialzata automatica al clic sulla destinazione. Aumentare la Velocità
effettiva o Scattare non restituisce movimento già speso. Su input impossibile,
spiegazione puntuale, correzione raggiungibile e nessun consumo.

**0 PF.** La zona PF cambia stato come P05: Privo di sensi, conteggi e prossimo
TS quando dovuto. Da lì si apre il tiro fisico/digitale o la correzione. Il
controllore conserva la scheda; non esce dalla scena, dal gruppo o dalla
campagna. Chi sta aiutando può selezionare Stabilizza con CD e risorsa esplicite.
Non confondere con una cura o con il pronto soccorso del knockout a1 PF.

**Guarigione e morte.** L’anteprima distingue PF recuperati, condizioni che
terminano e Prono che resta. Morte e relativa causa rimangono leggibili ai
destinatari autorizzati; nessuna cancellazione della creatura, fine scontro,
salvataggio sovrascritto o resurrezione implicita. La correzione del DM e del
controllore autorizzato resta possibile, con la distinzione tra situazione
corretta e evento di gioco realmente eseguito.

## Vincoli API e dati suggeriti, non implementati

1. **Definizione, istanza ed effetto effettivo separati.** Catalogo con ID,
   nomi EN/IT, fonte immutabile e lista di meccaniche supportate. Ogni
   applicazione ha identità propria, creatura, origine/evento, autore,
   eventuale creatura fonte, visibilità, stato attivo/terminato e motivo.
   La query effettiva aggrega condizioni senza sommarle; Indebolimento mantiene
   livello e origini pertinenti. Un’etichetta custom non esegue codice dedotto
   dal nome o dalla prosa.
2. **Termine tipizzato.** Manuale; timestamp nel clock narrativo identificato;
   inizio/fine turno della fonte o del bersaglio; fine di un riposo pertinente;
   fine della concentrazione identificata; evento specifico della capacità.
   Durata ignota non è0. Il passaggio fuori iniziativa o a un altro clock
   richiede riconciliazione esplicita quando manca una conversione certa.
3. **Query e comando distinti.** Preview pura di applicazione/rimozione,
   rialzata, stabilizzazione e correzione vitale; comando atomico con revisione
   dei soli dati pertinenti e ID operazione. Il confronto sopravvive al render,
   ma si rivalida su stato, permessi, condizioni e risorse correnti al comando.
   Nessun registro aggiuntivo solo per duplicare il risultato già nel comando.
4. **Politica a0 esplicita.** Personaggio con TS morte; mostro che muore;
   eccezione del DM; creatura che scompare secondo la propria capacità; caso
   manuale non ancora modellato. Per un famiglio già coperto da R193 rispettare
   il lifecycle esistente. Una forma del personaggio non è un secondo serbatoio
   PF o un secondo set di TS morte.
5. **Transizione vitale con causa.** Danno, cura, correzione e ripristino Undo
   sono eventi distinti. Non dedurre retroattivamente un critico, danno
   massiccio, tiro fallito o morte da una semplice differenza fra snapshot PF.
   Per un vecchio salvataggio incoerente, proporre riconciliazione, conservando
   i dati; non simulare eventi mai registrati.
6. **Conseguenze collegate.** Per un danno applicato una sola volta: temporanei,
   PF e stato vitale; incoscienza/incapacitazione; fine concentrazione e forma
   quando dovute; eventuali richieste ancora pertinenti. Se non c’è più
   concentrazione non chiedere un tiro senza effetto. Un fallimento automatico
   For/Des ha una spiegazione, ma non facce inventate nel registro dei dadi.
7. **Richieste durevoli.** TS morte legato a creatura e inizio turno; Medicina
   all’effettivo tentativo di Aiuto; d4 di recupero a una stabilizzazione
   identificata. Valori naturali, modificatori con fonte, esito e prima/dopo
   restano consultabili dopo reload e Undo. Un risultato annullato non torna
   un dado sconosciuto da ritirare implicitamente. Chiudere non tira né risponde.
8. **Privacy nell’origine e nel presente.** Controllo della creatura non dà
   automaticamente accesso al nome dell’incantesimo nemico, CD, autore privato
   o note della fonte. Query, storia, log, ricerca, attributi HTML e messaggi di
   errore devono usare la medesima proiezione. La condivisione successiva non
   rende pubblico un tiro personale precedente; una revoca impedisce nuovi
   comandi anche da un dialogo già aperto.
9. **Correzione senza perdita della fonte.** Modifica manuale di durata,
   conteggi, stato o valori con motivo distinto dalla definizione originale.
   Terminare un’istanza non elimina la sua storia né tutte le altre. Il DM
   conserva discrezione sui dati di campagna accessibili; i contenuti Solo io
   restano privati anche al DM.

### Punti minimi di integrazione osservati nel codice

Lettura sola, 23/09/2026, durante i raccordi9 ancora in evoluzione. Sono punti
da integrare e testare, non finding di regressione o attestazioni di completezza.

| File/funzioni osservati                                                                                       | Raccordo necessario                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `combat.mjs`: `applyDamage`, `completeAvailableOutcomes`, `resolveRoll`, `requestConcentration`               | Il danno già distingue temporanei e PF e notifica riposi/forme. Inserire la transizione vitale prima di chiedere conseguenze ormai non pertinenti; propagare informazione critico e origine del danno.                                |
| `combat.mjs`: `isIncapacitated`, `canSee`, `expireTurnEffects`                                                | Oggi coesistono condizioni stringa, oggetti e flag. Una query canonica evita che una condizione strutturata funzioni per le azioni ma non per la vista. Le scadenze devono identificare turno/fonte/istanza.                          |
| `state.mjs`: `previewMovement`, `spendMovement`, `resetTurnMovement`, `grantDash`; `spatial.mjs`: `tracePath` | Applicare il costo del modo di movimento senza raddoppiare due volte il terreno. Rialzarsi spende budget ma non sposta il token. Non ricreare un secondo conto del movimento.                                                         |
| `table.mjs`/`app.mjs`: avanzamento turni; `state.mjs`: `reconcileFormsAfterMutation` e `pendingTurnStart`     | Primo turno, successivo, cambio round e rimozione di un compagno devono emettere lo stesso evento di inizio una sola volta; l’eventuale TS morte non nasce da un render.                                                              |
| `characters.mjs`: `editHitPoints`, `beginHealing`, `resolveHealing`                                           | Correzione PF già distinta dalla cura. Riutilizzare un’unica transizione vitale per cure reali, senza risveglio o resurrezione da una mera assegnazione numerica. La pozione su sé stessi non diventa utilizzabile da Privo di sensi. |
| `rest-time.mjs`: `activity`, `wake`, conclusione del riposo e clock                                           | Il sonno ha già una condizione con `restId` e risveglio mirato. Preservare quell’origine; aggiungere Prono residuo e rispettare N12/N15 senza rimuovere incoscienza da altre cause.                                                   |
| `forms-companions.mjs`: `getEffectiveActor`, `observeFormsEvent`; `forms-profile.mjs`                         | Base mentale, forma fisica e risorse condivise già distinte. Incapacitazione termina la forma; il famiglio a0 scompare. Non introdurre TS morte o doppie restituzioni di risorse in questi casi.                                      |
| `state.mjs`: `acceptedRolls`, preservazione dei risultati e Undo                                              | Estendere l’evidenza immutabile alle sole nuove richieste realmente risolte. Faccia, esito, contesto originario e autorizzazioni devono sopravvivere anche quando Undo rimuove l’intera richiesta giocabile.                          |
| `character-access.mjs` e proiezioni di Tavolo/scheda/storia                                                   | Compagni delegati, personaggi privati e membership corrente vanno verificati anche dopo reload/cambio ruolo; non riaprire tutti i PNG per consentire un TS al proprio compagno.                                                       |

## Incremento concreto proposto e prove

Un modulo di condizioni/stato vitale con adapter agli eventi esistenti, un
pannello condiviso Tavolo/scheda e richieste nella coda già usata. Primo
percorso completo: applicare Prono → strisciare/rialzarsi → danno a0 → TS fisico
o digitale → stabilizzazione/cura → correzione e Undo. Catalogo completo delle
quindici condizioni consultabile; ogni effetto non ancora eseguito deve essere
indicato come manuale o parziale. Non dichiarare completato il motore completo
di vista, lotta, immunità, tutte le durate, resurrezioni o danni periodici.

| Prova                     | Esito verificabile richiesto prima della consegna                                                                                                                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T01 Due origini           | Due condizioni Avvelenato con termini diversi: una sola penalità; terminandone una resta l’altra. Nomi/fonti private non appaiono al ruolo non autorizzato.                                                                                   |
| T02 Turni e reload        | Fine prossimo turno della fonte distinta da fine del bersaglio; reload e doppio comando non anticipano o raddoppiano la scadenza. Fine round non le termina entrambe.                                                                         |
| T03 Prono e budget        | Velocità9 m, residuo6: rialzata costo4,5 secondo la normalizzazione concordata, residuo1,5. Con residuo3 non avviene consumo; Velocità0 blocca. Azione resta invariata.                                                                       |
| T04 Strisciare            | Percorso3 m normale +3 m difficile costa6+9=15, non18. Budget stop e opportunità usano il punto effettivamente raggiunto e il costo già speso.                                                                                                |
| T05 Regole2024            | Stordito/Incapacitato non diventano automaticamente Velocità0; Paralizzato/Privo di sensi sì. Prono a1,5 m e oltre cambia i modificatori in base alla distanza, non al tipo nominale di arma.                                                 |
| T06 Danno a0              | PF6/max12:17 danni causano incoscienza;18 morte massiccia. Un danno che porta da6 a0 non aggiunge da solo un fallimento morte. Provare anche assorbimento con PF temporanei.                                                                  |
| T07 Danno già a0          | Danno positivo aggiunge1 fallimento, critico2, zero nessuno. TempHP assorbenti non equivalgono ad assenza di danno. Retry stesso evento non riapplica.                                                                                        |
| T08 TS morte              | All’inizio corretto nasce una richiesta. Fisico pending→reload→input errato conservato→faccia valida; digitale stessa formula. Facce1/20, tre successi/fallimenti e modificatori espliciti hanno esiti distinti.                              |
| T09 Stabile               | Terzo successo azzera i conteggi, conserva0PF/incoscienza; il turno seguente non richiede un TS. Danno toglie Stabile. D4 ore non passa con il solo tempo reale e non si ritira al reload.                                                    |
| T10 Cura                  | Da0 recuperare1PF azzera TS e rimuove la causa0PF, lascia Prono e altre cause di incoscienza. TempHP non risveglia; cura normale non resuscita un morto.                                                                                      |
| T11 Stabilizza e knockout | Aiuto consuma l’azione solo all’effettivo tentativo e richiede MedicinaCD10; non cura. Knockout2024 resta1PF con origine propria e termine N15, non il ramo Stabile0.                                                                         |
| T12 Conseguenze collegate | Caduta a0 interrompe concentrazione e Forma Selvatica, blocca la ripresa del movimento e non chiede TS concentrazione ormai inutile. Famiglio0 segue scomparsa, senza generare un personaggio morente.                                        |
| T13 Correzione e Undo     | Correzione motivata non finge danno/critico/riposo. Undo restituisce stato giocabile ma conserva faccia accettata e conseguenza annullata, anche dopo rimozione della richiesta e JSON reload.                                                |
| T14 Privacy e revoca      | Aprire controllo come proprietario, poi revocare membership: applicazione e risoluzione negate. Storico personale conserva origine privata dopo condivisione; sorgenti nemiche non passano attraverso tooltip, ricerca o log.                 |
| T15 Effetti simultanei    | Cura e TS a inizio turno: risolvere l’ordine pertinente senza FIFO globale; se si recuperanoPF prima del tiro, la richiesta non più dovuta si chiude senza inventare una faccia.                                                              |
| T16 UI reale              | Tavolo→scheda→ritorno stessa creatura; tastiera, Esc/minimizza, touch, EN/IT, offline e reload. Toggle o cambio valore seguito subito da clic non perde il primo clic. Il dettaglio aperto non viene sostituito da una richiesta concorrente. |

Le prove T01–T16 sono proposte, non eseguite in questa ricerca. Le verifiche
browser restano al coordinatore e devono usare solo fixture sintetiche.

## Limiti e questioni da non mascherare

- La norma generale non basta a conoscere il termine di ogni condizione:
  durata, TS ripetuti, concentrazione, immunità e rimozione dipendono dalla
  capacità che la applica. Un campo vuoto richiede dato esplicito, non la fine
  del prossimo turno inventata.
- Il ramo morte va distinto dalla scelta narrativa: le regole note possono
  produrre uno stato esplicito e correggibile senza far scomparire il personaggio
  o concludere la sessione. Le eccezioni DM mantengono una propria provenienza.
- “Lascia cadere ciò che tiene” richiede dati su oggetti tenuti. L’inventario
  attuale usa soprattutto equipaggiamento e posizione: non trattare tutta
  l’armatura indossata come oggetti da buttare. Se non si conoscono le mani,
  esporre la conseguenza da riconciliare invece di inventare gli oggetti.
- Più dardi, effetti simultanei e danni periodici conservano le rispettive
  istanze di danno. La convenzione già dichiarata per TS concentrazione di
  Dardo incantato non prova automaticamente il conteggio di ogni altro evento:
  precisare l’unità di danno nel nuovo adapter, con fonte o scelta dichiarata.
- Stabilizzazione fuori iniziativa e attività con tempi ignoti richiedono
  eventi espliciti; nessun server che avanza ore o tira dadi in segreto è
  autorizzato da questo rapporto.
- Nessuna nuova domanda di prodotto necessaria al momento. Normalizzazione
  delle unità, contratto degli eventi e migrazione sono lavoro degli autori.
  Una futura proposta di rendere pubblici conteggi o fonti private sarebbe
  invece un cambiamento sostanziale di privacy, da non introdurre di nascosto.

## Verifica di questa ricerca

Completate lettura normativa EN/IT, confronto delle fonti primarie pubblicate,
riverifica dei due hash PDF e lettura circoscritta dei raccordi locali. Nessun
test del codice o browser dei prodotti viene rivendicato. I dati delle fonti
variabili sono datati al 23/09/2026; la versione 5.2.1 e gli hash fissano invece
la baseline normativa. Formattazione e collegamenti locali verificati prima
della consegna.

Attribuzione: questo documento usa materiale del _System Reference Document
5.2.1_ di Wizards of the Coast LLC, disponibile su
[D&D Beyond SRD](https://www.dndbeyond.com/srd), distribuito con licenza
[Creative Commons Attribution 4.0 International](https://creativecommons.org/licenses/by/4.0/).
Le sintesi, i raccordi e le proposte applicative sono originali di questo
progetto e sono distinti dalle regole citate.
