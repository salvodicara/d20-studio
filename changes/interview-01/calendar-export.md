# «Aggiungi al calendario» (01/10/2026)

Richiesta dell'owner: salvare la data di una sessione in Google Calendar o in un altro calendario
deve essere facile.

## Che cosa cambia

- **Un solo pulsante, un piccolo menu.** «Aggiungi al calendario» apre un menu con Google Calendar,
  Outlook.com, Microsoft 365 (lavoro o scuola), Yahoo Calendar e «Apple Calendario o altro
  (.ics)». In fondo, «Tutte le sessioni, sempre aggiornate…» apre il link personale (simulato).
  Copiato da Eventbrite e AddEvent (e dalle pagine evento di Sesh e Discord); indirizzi e campi
  come li costruisce il generatore open source add-to-calendar-button.
- **Dove.** Ogni data in Campagna › Sessioni (accanto alla campanella dei promemoria), Inizio ›
  Prossimo appuntamento (lo stesso menu, senza campanella), Integrazioni › Calendario › Prossima
  sessione. Dalla ricerca (⌘K) e da una notifica di sessione nuova, spostata o in arrivo si apre
  la stessa scelta in una finestra, con il link personale. Prima c'erano due strade diverse (una
  finestra con il solo .ics e un pulsante «Scarica .ics»): ora è una.
- **Niente invii automatici.** Il menu lo dice: il calendario scelto si apre in una nuova scheda
  (`target="_blank" rel="noopener noreferrer"`) con la sessione già compilata; controlli e salvi
  tu. Sono gli unici indirizzi reali dell'area Integrazioni e partono solo dal tuo clic.
- **Cosa c'è nell'evento.** Titolo «Campagna · sessione» (es. «Le lanterne di Bruma · Il sigillo
  della torre»); descrizione con ora concordata e fuso, durata e il link alla campagna; lo stesso
  link come luogo.

## Fusi orari e serie

- Google riceve l'ora locale concordata con il fuso della sessione (`ctz=Europe/Rome`); Outlook,
  Microsoft 365, Yahoo e il file .ics di una data ricevono l'istante in UTC. Una sessione a cavallo
  del cambio d'ora dura comunque le sue ore reali.
- **Serie ricorrenti.** Su una data di una serie compare «Tutta la serie (.ics, N date)»: un solo
  evento che si ripete (`RRULE` settimanale o ogni due settimane) nell'ora locale del fuso della
  serie (`DTSTART;TZID` con il suo `VTIMEZONE`), così le 21:00 restano le 21:00 dopo il cambio
  d'ora. Una data annullata diventa un'eccezione (`EXDATE`); una data spostata resta un evento a
  parte. Google, Outlook e Yahoo aggiungono solo la data scelta, e il menu lo dice.

## Limiti

- Il link personale (webcal) resta simulato: l'indirizzo `d20-studio.example` non raggiunge nessun
  server. Nel blueprint il link alla campagna nella descrizione è l'indirizzo locale dell'app.
- Un calendario già importato non si aggiorna da solo quando la sessione cambia: si riscarica il
  file (stesso `UID`, `SEQUENCE` più alto) o si usa il link personale nel prodotto reale.

## Prove

- `node --test design/blueprint/tests/*.test.mjs`: **2681/2681** (19 nuovi: 15 in
  `tests/calendar-export.test.mjs` per indirizzi, fusi Europa/Roma, New York, Kolkata e UTC,
  cambio d'ora, `VTIMEZONE`, ricorrenza, eccezioni e .ics della serie con il dominio reale delle
  serie; 4 in `tests/integrations.test.mjs` per menu, serie, Inizio e notifica).
- Browser (`playwright-cli`, sessione `d20-calendar`): `calendar-export-journey.js` nuovo, 8/8
  (menu, tastiera Invio/Tab/Esc, clic fuori, nuova scheda senza opener con risposta locale al
  posto di Google, .ics di una data e della serie, Inizio, notifica, Integrazioni, telefono 390 al
  tocco senza scorrimento laterale). Aggiornati al menu e verdi: `p9-sessions-journey.js` (7/7) e
  `integrations-journey.js` (9/9, anche in inglese su telefono). Prove e immagini in
  `~/Workspace/Codex/d20-blueprint-evidence/2026-10-01/phase-c-prep/calendar/`.
