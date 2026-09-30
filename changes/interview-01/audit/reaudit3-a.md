# Re-audit 3, slice A: first-time user check of 13 capabilities (interview-01)

Date: 29/09/2026. This was a read-only re-audit session. No product source, test or shared document was changed. Branch
`codex/interview-01`, working tree `/Users/salvatoredicara/Workspace/Codex/d20-studio-interview-01`, nothing committed.
Server `http://127.0.0.1:8879/`. Browser: playwright-cli session `d20-reaudit-a`, started from
`/Users/salvatoredicara/Workspace/Codex/d20-blueprint-evidence/2026-09-27/reaudit-a/`, which also holds the evidence:
scripts `s*.src.js`, outputs `logs/s*.log`, screenshots `s*.png` and the suite log `logs/node-suite.log`.

## In breve (IT)

Ho provato 13 capacità come farebbe una persona al primo uso, solo con ciò che si vede sullo schermo. **10 funzionano, 3
sono parziali.** Nessuna risulta rotta, mancante o difficile da trovare.

Funzionano:

- Da un selettore del costruttore si crea la propria classe o specie e si torna con la scelta già fatta.
- Una sottoclasse homebrew compare nel costruttore e aggiunge il suo privilegio.
- «Aggiungi un mio personaggio» dal Gruppo.
- La bozza in sospeso si riprende, e il conflitto tra due schede viene bloccato e confrontato.
- La CA mostra da cosa è composta e si corregge solo indicando un motivo. Il Gruppo mostra gli stessi numeri della scheda.
- Forma Selvatica dalla barra rapida: la pedina diventa «Lupo (Mira)» e con un clic torna com'era.
- Metamorfosi rifiuta un incantatore senza slot di 4° livello e spiega perché.
- Le cavalcature seguono chi le cavalca.
- La Benedizione aggiunge il suo d4 sia agli attacchi al Tavolo sia ai tiri chiesti dal DM.
- «Assegna PE e monete» aggiorna la scheda.
- Il vantaggio homebrew viene applicato davvero al tiro.

Parziali:

- **Incantesimi legacy 2014:** compaiono accanto a quelli 2024. Però se tengo acceso solo il filtro «Legacy 2014» l'elenco
  resta vuoto.
- **Arma forgiata:** una Spada lunga +1 data a Doran (Guerriero di livello 3) colpisce con +1 invece di +3, perché manca il
  bonus di competenza. Il danno +1 è corretto.
- **Pacchetti di compatibilità:** si importano, si abilitano e si leggono. Però le creature e la sottoclasse del pacchetto non
  compaiono nel bestiario del Tavolo, nella ricerca della Biblioteca o nel costruttore. Resta aperta la decisione del
  proprietario sui contenuti.

Un problema trasversale: «Applica a una scheda…» propone anche i personaggi della campagna come «prerequisiti soddisfatti».
Poi fallisce con «Contenuto non utilizzabile qui. / Content cannot be used here.», scritto in tutte e due le lingue e senza
dire cosa manca. In realtà serve un passo di condivisione: il DM deve abilitare la voce e la voce deve essere leggibile da
chi vede la scheda.

La suite Node passa: **2543/2543**.

## Method

Each capability was driven in the running app using visible labels, clicks, keys and the command palette. The test data was
the sample campaign «Le lanterne di Bruma». The scripts used «Ripristina esempio»-equivalent resets (`localStorage.clear()`)
and switched roles with the header «Visita come» select. Most checks ran in Italian at 1440×900. Four flows were also checked
in English at 390×844 with touch emulation: Party add button, XP award, the Bless toggle and the Wild Shape quick-bar slot.

Status meanings:

- **WORKS:** the natural first place works end to end.
- **PARTIAL:** a named part of the capability is missing or wrong.

Source files were read only to name a probable cause. The table below shows no «T» (test-only) rows: every row was driven in
the browser.

## Results

The «Before» column is the status in `reaudit.md` (25/09).

| ID    | Before  | Now         | What I did (visible UI) and what I saw                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Evidence                                                                          |
| ----- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| PG-06 | PARTIAL | **WORKS**   | Player › Personaggi › «Crea personaggio» › «Classi e punti ferita» › «Sfoglia le classi…» › Mago › «Crea variante nell’editor homebrew…». The create dialog is locked to «Classe» (a single option) and preselects «Struttura del Mago (SRD)». Then «Crea bozza privata» › «Nome · italiano» › «Salva». The app returns to `#builder…&tab=class` with Classe = «Mago delle lanterne» and the source line «Homebrew · SRD 5.2.1 · 2024». Species: «Background e specie» › «Sfoglia le specie…» › Nano › «Crea variante…» (preselects «Nano (SRD)») › save › returns with «Nano delle lanterne». **Friction (X-A3):** the class template starts with an empty level-1 «Concessione di privilegi» row, so the first «Salva» is refused with «Non salvato: Livello 1: ogni privilegio concesso ha un nome.». Background round trip not driven.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `logs/s6b…s6g.log`, `s6e-after-save.png`, `s6f-after-save.png`, `s6g-species.png` |
| BI-22 | PARTIAL | **WORKS**   | Biblioteca › «Crea contenuto» › Sottoclasse › «Crea bozza privata» › name and author › Avanzamento: Classe Mago, Livello 3, «Aggiungi avanzamento», Privilegio «Luce della lanterna» › «Salva» («Revisione salvata e immutabile»). In a new builder draft (Mago, level 3), «Sottoclasse» offers «Invocatore, Scuola delle lanterne · homebrew». After choosing it, «Capacità e talenti» › «Privilegi registrati dalle fonti (5)» lists «Luce della lanterna · Homebrew · Il nostro gruppo · 2024». Homebrew classes are offered too (PG-06).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `logs/s7b…s7h.log`, `s7e-builder.png`, `s7h-summary.png`                          |
| PG-85 | PARTIAL | **WORKS**   | Player › Campagne › Gruppo › «Aggiungi un mio personaggio» (page header). The dialog lists Iria and offers two modes: «Collega la stessa scheda» and «Porta una copia indipendente». It says «Privacy iniziale: solo tu e il DM». «Aggiungi alla campagna» shows the toast «Iria ora è nella campagna Le lanterne di Bruma.», and Iria is listed on the Gruppo page for both the player and the DM. EN 390: «Add one of my characters» is visible and there is no horizontal scroll (scrollWidth 390).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `logs/s2.log`, `s2-pg85-after.png`, `logs/s16e.log`, `s16e-party-en-390.png`      |
| CA-10 | PARTIAL | **WORKS**   | Resume: DM › Mondo › «Nuova voce del mondo» › title and body › «Salva contenuto per questi destinatari» › «Modifica» › edit › «Salva bozza e aggiorna anteprima» › «Torna indietro» › «Modifica». This opens «Hai già una bozza di questa voce» with the draft date and three buttons: «Nuova bozza», «Annulla», «Riprendi la bozza». «Riprendi la bozza» restores the body «BOZZA NON SALVATA». Two tabs: tab 1 edits «VERSIONE A». In tab 2, «Modifica» offers the same resume dialog (same person); I chose «Nuova bozza», wrote «VERSIONE B» and saved. Tab 1 keeps A, and «Salva» is blocked with «Qualcuno ha cambiato la voce mentre scrivevi: confronta nell’anteprima e scegli «Usa questa base».». The preview shows «Confronta con il testo corrente» with B. «Ho confrontato: usa questa base e conserva la mia bozza» then «Salva» gives the revisions `["ORIGINALE","VERSIONE B","VERSIONE A"]`.                                                                                                                                                                                                                                                                                                                                                                                                            | `logs/s5c.log`, `logs/s5d.log`, `s5c-resume.png`, `s5d-conflict.png`              |
| PG-25 | PARTIAL | **WORKS**   | Livia’s sheet shows AC 13 as «12 base · Mantello della protezione +1». Clicking «Classe armatura» opens a breakdown with sources and pages, «Per cambiare i valori passa a Modifica: le modifiche chiedono un motivo.» and «Passa a Modifica». In «Correggi valori» the AC is not an input: it reads «13 · Cambia con un motivo…». That opens «Aggiungi una modifica motivata» (Tipo, Valore, «Motivo (resta accanto al valore)»). Adding +2 with «Scudo magico del DM (prova)» gives AC 15 «12 base · modifiche motivate · Mantello…», with the row «Aggiungi o togli +2 · Scudo magico del DM (prova) (giocatore) 12 → 14 · Togli». The DM Gruppo shows CA 15 and the same saves as the sheet (INT +6, DES +3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `logs/s4.log`, `logs/s4b.log`, `logs/s4c.log`, `logs/s17.log`, `s4c-sheet.png`    |
| PG-77 | PARTIAL | **WORKS**   | Player › Tavolo › Mira’s token › «Barra rapida» › slot «4: Forma Selvatica · capacità di classe · 1 di 2 usi» › Forme dialog › Lupo › «Vedi trasformazione» › «Applica». The token becomes «Lupo (Mira)» with the «FORMA» silhouette emblem (`data-token-form=srd2024:wolf`), and slot 4 becomes «Torna alla forma originale». Clicking it gives back the token «Mira» and a slot reading «0 di 2 usi · Nessun uso rimasto». The Forme dialog keeps «Annulla ultima modifica». EN 390 touch: «4: Wild Shape · class feature · 1 of 2 uses» is visible in «Quick bar». Minor: the dialog button «Annulla preview» uses an English word (X-A2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `logs/s10…s10d.log`, `s10c-wolf-zoom.png`, `s10d-return.png`, `s16g-mira-390.png` |
| PG-79 | MISSING | **WORKS**   | Polymorph: DM › Doran’s token menu › Azioni › «Trasforma…» opens a dialog with creature, preset (Metamorfosi or «Trasformazione personalizzata»), 8 Beasts with CR, HP, AC and speed, «Incantatore (spende slot e Azione, tiene la Concentrazione)» and «Doran resiste: tiro salvezza su Saggezza». Lupo feroce with Livia as caster is refused: «Livia non ha uno slot libero di 4° livello o superiore: Metamorfosi è un incantesimo di 4° livello… oppure «Nessuno»» (SRD 2024 · 5.2.1 · p. 164). With «Nessuno» the token reads «Lupo feroce (Doran)». Mounts: the palette word «cavalcatura» lists «Porta una cavalcatura», «Monta in sella», «Cavalca» and «Smonta». Doran › Strumenti DM › «Porta una cavalcatura qui» adds «Cavallo da galoppo». Doran › Azioni › «Monta in sella…» opens a popover (Controllata or Indipendente, cost 4,5 m, SRD 5.2.1 IT p. 17) › «Esegui: Monta in sella». Dragging Doran moves the horse with him (doran 400,438 → 472,292; horse 400,450 → 472,304), with the toast «Cavalca per 4,39 m». Minor: after switching the caster to «Nessuno», the old refusal line stays in the dialog, although «Trasforma» works.                                                                                                                                                              | `logs/s11…s11e.log`, `s11-transform.png`, `s11d-montain.png`, `s11e-ride.png`     |
| PG-47 | PARTIAL | **WORKS**   | Setup: Livia’s sheet › EFFETTI › toggle «Benedizione» (+1d4); the Table creature panel then shows «Tira 1d4 · Disattiva». DM request: DM › Tavolo › Dadi › Richieste › «Tiro salvezza» Saggezza CD 13 › «Invia la richiesta». The player answers through «Tiri e risultati» › «Risolvi tiro». The dialog reads «Livia · d20 + d4 (Benedizione) + 4», with the result «11 + [1] (Benedizione) + 4 = 16». Combat: DM «Avvia combattimento» › «Tira tutti» › «Inizia combattimento» › «Termina turno» ×4 to reach Livia. The player picks «Dardo di fuoco» and clicks Esploratore: the 3D dice show d20 + d4 + d10, and «Tiri e risultati» reads «Attacco 14 + [2] (Benedizione) + 5 = 21». EN: the sheet shows «EFFECTS Bless Bane». Minor: before the player rolls, the DM’s open request reads «Livia · In attesa · d20 +4» and does not mention the Bless die.                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `logs/s9…s9s.log`, `s9m-roll-dialog.png`, `s9r-target.png`, `logs/s16f.log`       |
| PG-53 | PARTIAL | **PARTIAL** | Livia’s sheet › Magie › «Gestisci magie» › «Lista di classe». With the switch off, the source line says «…Il DM può metterle accanto alle 2024 in Fonti.». DM › Impostazioni › Fonti › switch «Versioni legacy 2014 (SRD 5.1) accanto alle 2024» → «Disponibile a tutti». The player’s list then shows the chips «SRD 2024 · Homebrew della campagna (0) · Legacy 2014». Under «Dardo di fuoco … 2024» comes «Dardo di fuoco · Legacy 2014 · SRD 5.1 · … · Cosa cambia · Preferisci la 2014», plus the CC BY 4.0 SRD 5.1 attribution. **Defect:** with «SRD 2024» off and «Legacy 2014» on, the list reads «Nessuna magia con questi filtri». Legacy rows are drawn only under their 2024 row, so a 2014-only view (D&D Beyond source toggles) is impossible. Turning «Legacy 2014» off correctly hides the legacy rows.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `logs/s12c…s12g.log`, `s12e-legacy.png`, `s12g-chips.png`                         |
| PG-17 | PARTIAL | **WORKS**   | DM › Gruppo › «Assegna PE e monete» opens a dialog with XP, the five coins, «Da dividere tra i destinatari» or «A ciascuno», the recipients Livia, Doran and Mira, «Motivo», the preview «A testa: 300 PE + 30 mo» and an SRD 5.2.1 note. «Assegna» changes Livia’s sheet from «Livello 3 · 900 / 2700 PE» to «1200 / 2700 PE». The sheet’s «Gestisci PE» opens «PE: 1200 · Livello 4 a 2700 PE · Aggiungi PE · Correggi il totale». EN 390: «Award XP and coins» is visible and opens the English dialog. Not verified: deselecting one recipient (my script’s label match failed, so this is not claimed as a product defect).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | `logs/s3d.log`, `s3d-gestisci-pe.png`, `logs/s16f.log`, `s16f-award-en-390.png`   |
| BI-18 | PARTIAL | **WORKS**   | Biblioteca › «Crea contenuto» › Talento › name › Modificatori › «Aggiungi modificatore» › Valore «Prove di Percezione · manuale», Operazione «Vantaggio». The preview says «Automazione completa · Vantaggio o svantaggio applicato al tiro». «Salva» › «Applica a una scheda…» › Iria. Iria’s sheet › Capacità lists «Occhio di falco · Talento». «Tira Percezione +4» opens a roll dialog with «Occhio di falco (homebrew): vantaggio» and «Scelto dalla scheda: vantaggio», and the result is «[(1), 19] + 4 = 23». Campaign sheet: after «Condividi in lettura con il DM» and the DM’s «Abilita questa revisione in campagna», the feat applies to Livia and her Perception dialog also preselects advantage. Minor: the target option label ends in «· manuale» while the preview says the effect is fully automated. Applying to Livia before the DM enabled the feat fails (see X-A1).                                                                                                                                                                                                                                                                                                                                                                                                                             | `logs/s8…s8i.log`, `s8h-roll.png`, `s8i-result.png`, `logs/s15…s15d.log`          |
| BI-24 | PARTIAL | **PARTIAL** | DM › Biblioteca › «Crea contenuto» › «Oggetto magico · Forgia: oggetto di base + modello» opens the Forge (base object SRD 5.2.1 Spada lunga, template «Arma +1 · Non comune · SRD EN p.253 / IT p.243») › «Crea la bozza forgiata» › «Salva» › «Applica a una scheda…» › Doran. This is refused with «Contenuto non utilizzabile qui. / Content cannot be used here.», still refused after «Abilita in campagna», and accepted only after «Condividi in lettura con i giocatori» (X-A1). Inventario › «Equipaggia» is refused with the correct toast «Hai già le mani occupate (Scudo, Ascia): riponi prima qualcosa.». After «Riponi» on the Spada lunga and the Ascia, the forged sword equips. Sheet: «Spada lunga +1 · Attacco in mischia con arma: 1d8 (1d10 a due mani) + Forza · Maestria: Fiaccare · +1» (aria «Tiro per colpire con Spada lunga +1 +1»). Table: the detail reads «1d8 + 1 (Spada lunga +1)», and the attack on Esploratore gives «Attacco 13 + 1 = 14 · Danni 8 + 1 = 9». **Defect:** the attack roll leaves out Doran’s Proficiency Bonus. Doran is a level-3 Fighter with STR 10 and a sheet COMPETENZA of +2, so SRD 5.2.1 expects +0 + 2 + 1 = **+3**; the app gives **+1**. The configured plain longsword reads +2. The damage +1 is correct. Probable cause (see «Notes for the fixer»). | `logs/s13…s13s.log`, `logs/s13u.log`, `logs/s18.log`, `s13s-attack.png`           |
| BI-45 | MISSING | **PARTIAL** | Biblioteca › «Pacchetti di compatibilità» › «Prova il pacchetto di esempio» shows «Valle di Bruma · esempio (simulazione) v1.0 · Solo meccaniche · 2 creature · 1 oggetto · 1 incantesimo · 1 sottoclasse · Regole SRD 5.2.1: pronto». «Abilita in questa campagna» → «Abilitato in questa campagna». The pack page shows only numbers and page references, for example «Lanterna vagante CA 13 PF 22 (5d6+5)… GS 1 PE 200 · Vampata +5 · 2d6+3 fuoco · Testo: nel vostro manuale, p. 42» and the subclass «Custode del faro · Mago · Livelli 3, 6, 10, 14 · p. 60». It carries the licence line «Solo meccaniche… i diritti restano all’editore». The player sees «Abilitati dal DM in questa campagna». **Gap:** the enabled content is not usable anywhere else. Table › «Aggiungi creature» «Lanterna» and «Custode» → «Nessuna creatura con questo nome». Biblioteca search «Lanterna vagante» → «Contenuti (0)». The palette finds nothing. The Mago subclass list in Livia’s «Rivedi scelte» offers only «Invocatore». Foundry and Shard packs feed the bestiary and the builder. The owner content and licensing decision is still pending (census: «MISSING (decisione contenuti)»); the fixer labelled this a delegated simulation (I-233).                                                                     | `logs/s14…s14j.log`, `s14c-pack.png`, `s14h-add.png`                              |

## Counts

| Status       | Before (25/09) | Now    |
| ------------ | -------------- | ------ |
| WORKS        | 0              | **10** |
| PARTIAL      | 11             | **3**  |
| MISSING      | 2              | 0      |
| BROKEN       | 0              | 0      |
| HARD_TO_FIND | 0              | 0      |
| Total        | 13             | 13     |

## New findings (not in the 13 rows)

1. **X-A1 — «Applica a una scheda…» is a trap for campaign sheets.**
   - What happens: the dialog lists every sheet, including Livia, Doran and Mira, as «prerequisiti soddisfatti». Applying to
     a campaign sheet then fails with the raw bilingual error «Contenuto non utilizzabile qui. / Content cannot be used here.».
     No reason is given and no next step is offered.
   - Why: the revision must be enabled in the campaign by the DM, and it must be readable by every identity that sees the
     sheet. Player content has to be shared with the DM; DM content has to be shared with the players.
   - Reproduced by: the player’s feat on Livia and the DM’s forged sword on Doran. Both apply once the missing steps are done
     (BI-18, BI-24 rows).
   - Code: `homebrew.mjs:607`. `homebrewAvailability` already builds a «context-unavailable» reason, but the dialog shows the
     generic `fail`.
   - Pattern to copy: D&D Beyond homebrew sharing to a campaign. List the missing step next to the sheet, or offer it, and
     show one language.
2. **X-A2 — English leaks in the Italian UI.**
   - «Annulla preview» (Forme dialog).
   - «Preview · nessun consumo» (Table action detail).
   - SRD class feature names left in English in the builder («Spellcasting, Ritual Adept, Arcane Recovery, Scholar», also in
     the class picker preview).
   - Doran’s attack notes repeat «Longsword: Versatile 1d10; mastery Sap.» under the Italian line.
   - Forge source line «Longsword + Weapon +1».
   - «Gittata 1.5 m» uses a decimal point where the rest of the app writes «1,5 m».
3. **X-A3 — class variant template blocks the first save.**
   - «Struttura del Mago (SRD)» creates an empty level-1 grant row, and «Salva» is refused until the user names a privilege.
   - The species template saved at once.
   - dnd5e and D&D Beyond templates carry the SRD structure: names and numbers only, never SRD text.

## Notes for the fixer (read-only inspection, not a fix)

- **BI-24 proficiency.** `forms-companions.mjs` `getEffectiveActorBase` always returns
  `combatProfile: { ...(a.combatProfile ?? {}) }`. That object is truthy even when the actor has no profile. As a result,
  `combat.mjs` `profileFor` never falls back to its default `{ proficiencyBonus: 2, … }` for an actor without an explicit
  `combatProfile`.
  - In the sample, Doran has none (`rawCP: null`, `effCP: {}` from an in-page `import("/forms-companions.mjs")`), while Livia
    has one.
  - `inventoryWeaponActions` then computes `pb = 0` although `weaponProficient` is true (`buildSeed.classes` = fighter).
  - The sheet’s «+1» comes from the same action.
- **PG-53 filter.** The legacy row appears to render only as a child of its 2024 row in `spells-plus.mjs` `renderClassList`.
  A «Legacy 2014 only» chip state should list the 2014 rows on their own.
- **BI-45.** `adventures.mjs` packs are read on the pack page only. For Foundry/Shard parity, the enabled pack’s creatures
  would need to reach the Table bestiary, and its subclass the builder. That needs an owner content decision first.

## Node suite

`node --test design/blueprint/tests/*.test.mjs` ran in the background under a 600 s alarm: **2543 tests, 2543 pass, 0
fail**, about 10.7 s (`logs/node-suite.log`).

## Limits

- One run per flow; no repeated or randomised runs.
- Most flows were checked in Italian at 1440. English at 390 with touch emulation covered only the four flows named in
  Method.
- Keyboard-only paths were not driven, except the palette (Ctrl+K).
- Background homebrew round trip and recipient deselection in «Assegna PE e monete» were not driven.
- Clicks were issued through Playwright; this is not a human playtest.
