# Registro delle estensioni — B11 parte A: API per i costruttori e piano degli hook

24/09/2026. Parte A completata: registro, caricatore, estensione di prova e test.
La parte B (gli hook nei file esistenti, §3) è **applicata**: un'area registrata
compare e funziona nell'app. Comportamento effettivo, scelte rispetto a questo
piano e prove: [integrazione](blueprint-registry-integration.md); correzioni dopo
la review: [B11b e incremento 10](blueprint-b11b-inc10-fixes.md). Dove quei
rapporti divergono dal §3, valgono i rapporti.

File della parte A (nuovi, nessun file esistente toccato):

- `design/blueprint/registry.mjs` — punti d'estensione, validazione, ordine,
  ruoli, isolamento degli errori, sezioni di stato, stili, eventi, impostazioni,
  comandi e conflitti, rapporto.
- `design/blueprint/extensions.mjs` — elenco delle 48 aree pianificate
  (B12–B60, senza B31 che è solo CSS) e `loadExtensions(registry)`.
- `design/blueprint/tests/registry.test.mjs` — 17 test.
- `design/blueprint/tests/fixtures/sample-extension.mjs` — estensione di prova
  con un contributo per ogni punto; è anche l'esempio completo di modulo d'ingresso.

Pattern copiati: superfici di comando fisse di Owlbear (VTL-231: l'estensione
aggiunge strumenti, pannelli, voci di menu e livelli, non riscrive il tavolo);
registro unico dei comandi con scorciatoie di Improved Initiative (CMP-155–157);
impostazioni con ambito di Foundry (FVT-188: `client`/`user`/`world` diventano
`device`/`personal`/`campaign`); `Hooks.on`/`Hooks.callAll` di Foundry per il bus
di eventi. Verifica: `node --test design/blueprint/tests/registry.test.mjs`
(17/17) e prova nel browser reale descritta al §4.

## 1. Come si costruisce un'area

1. Il modulo d'ingresso si chiama come l'area in `extensions.mjs`
   (`token-menu.mjs`, `chat.mjs`, …), sta in `design/blueprint/` ed esporta
   `register(registry)` **sincrona**. L'id dell'estensione è il nome del file.
2. `register` riceve un oggetto dedicato all'area. Tutto ciò che registra entra
   in blocco solo se `register` termina senza errori; se lancia, l'area risulta
   `failed` e nulla di suo (contributi, stato, stili, gestori) resta registrato.
3. Gli id dei contributi e delle sezioni di stato sono l'id dell'area o
   iniziano con `<id>-` o `<id>.`. Un id del core si usa solo per sostituirlo
   (`replaces: true`, vedi §2.3).
4. Ogni testo visibile è `{ it, en }` (etichette) o passa da `ctx.t(it, en)`.
   L'HTML dinamico passa da `ctx.esc`.
5. Lo stato si cambia solo con `ctx.commit(label, mutator, options)` sulla propria
   sezione `state.ext.<id>` (`registry.slice(draft)`); mai fuori da un commit.
6. Il DOM si tocca solo dentro l'elemento ricevuto da `bind`. Eccezione: una
   sovrapposizione globale (es. dadi animati B56) crea un proprio elemento sotto
   `document.body`, con prefisso di classe dell'area.
7. Si possono importare funzioni pure dei moduli esistenti (`combat.mjs`,
   `character-access.mjs`, …) senza modificarli. Mai importare `app.mjs`.
8. Nessun file condiviso da modificare: `extensions.mjs` elenca già tutte le aree.

Esempio (area B27):

```js
// design/blueprint/safety.mjs
import { renderSafety, bindSafety } from "./safety-ui.mjs"; // own files only

export function register(registry) {
  registry.registerStateSlice("safety", {
    version: 1,
    undo: "preserve", // survives gameplay Undo, like narrative content
    seed: () => ({ lines: [], veils: [] }),
    normalize: (slice, fromVersion) => ({
      lines: Array.isArray(slice?.lines) ? slice.lines : [],
      veils: Array.isArray(slice?.veils) ? slice.veils : [],
    }),
  });
  registry.registerStyles(new URL("./safety.css", import.meta.url));
  registry.add("campaign-section", {
    id: "safety",
    label: { it: "Sicurezza", en: "Safety" },
    order: 65,
    render: (ctx) => renderSafety(ctx, registry.slice(ctx.state)),
    bind: (el, ctx) => bindSafety(el, ctx, registry),
  });
  registry.add("command", {
    id: "safety.pause",
    label: { it: "Chiedi una pausa", en: "Ask for a pause" },
    shortcut: "Mod+Shift+P",
    run: (ctx) =>
      ctx.commit(
        ctx.t("Pausa richiesta", "Pause requested"),
        (draft) => {
          registry.slice(draft).lines.push({ id: crypto.randomUUID(), kind: "pause" });
        },
        { undoable: false },
      ),
  });
  registry.on("turn-start", (payload, { ctx }) => {
    /* ids only: check access with ctx.role before showing anything */
  });
}
```

## 2. Riferimento API

### 2.1 Oggetto ricevuto da `register`

| Membro                                                                                                                                        | Uso                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| `id`                                                                                                                                          | id dell'area                                        |
| `add(point, def)`                                                                                                                             | registra un contributo (solo durante `register`)    |
| `registerStateSlice(name, def)`                                                                                                               | sezione `state.ext[name]` (solo durante `register`) |
| `registerStyles(url)`                                                                                                                         | CSS dell'area (solo durante `register`)             |
| `on(event, handler)`                                                                                                                          | gestore di evento (solo durante `register`)         |
| `emit(event, payload)`                                                                                                                        | evento core o `"<id>:<nome>"` (sempre)              |
| `slice(state, name = id)`                                                                                                                     | la propria sezione in `state` o in un `draft`       |
| `list`, `get`, `merge`, `label`, `slot`, `bindSlots`, `run`, `invoke`, `search`, `notifications`, `commandForKey`, `getSetting`, `setSetting` | lettura e servizi, uguali a quelli dell'host (§2.8) |
| `ctx`                                                                                                                                         | contesto dell'host, dopo `registry.attach(ctx)`     |

### 2.2 Punti d'estensione

Campi comuni: `id` (minuscole, `-` o `.`), `label: {it, en}` obbligatoria,
`description?: {it, en}`, `order?` (predefinito 100; a parità vale l'ordine di
caricamento), `roles?` (`["player"]`, `["dm"]` o entrambi, predefinito), `when?(ctx, ...args)`
(visibile se il risultato è vero), `replaces?: true`. Un campo sconosciuto è un
errore (intercetta i refusi). Ogni callback riceve `ctx` per primo, tranne
`bind(el, ctx, ...args)`, che segue la convenzione `bindX(root, ctx)`.

| Punto                 | Campi propri                                                                                                                                       | Firma dei callback                                                 | Dove appare (dopo la parte B)                                                                              |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `route`               | `render`, `bind?`, `nav?`, `icon?`                                                                                                                 | `render(ctx)`                                                      | pagina `#<id>`; con `nav: true` voce della navigazione principale e del menu App                           |
| `service`             | `run`, `header?`, `icon?`                                                                                                                          | `run(ctx)`                                                         | con `header: true` pulsante icona dell'intestazione; sempre via `data-service="<id>"`                      |
| `campaign-section`    | `render`, `bind?`, `group?` (B62, §5.3)                                                                                                            | `render(ctx)`                                                      | voce di un gruppo della barra laterale della campagna, `#campaign?tab=<id>`                                |
| `sheet-tab`           | `render`, `bind?`, `category?` (B62, §5.3)                                                                                                         | `render(ctx, actor)`                                               | sottosezione di una categoria della scheda personaggio, `#characters?id=…&tab=<id>`                        |
| `sheet-section`       | `tab`, `render`, `bind?`                                                                                                                           | `render(ctx, actor)`                                               | riquadro in fondo alla scheda `tab` (core o di un'area)                                                    |
| `preparation-section` | `render`, `bind?`, `group?` (B62, §5.3)                                                                                                            | `render(ctx)`                                                      | sezione di un gruppo di Preparazione, `#preparation?tab=<id>`                                              |
| `library-section`     | `render`, `bind?`                                                                                                                                  | `render(ctx)`                                                      | sezione della Biblioteca accanto a Disponibili/La mia/Campagna                                             |
| `home-widget`         | `render`, `bind?`                                                                                                                                  | `render(ctx)`                                                      | blocco di Inizio                                                                                           |
| `table-tool`          | `icon?`, `group?` (B61, §5), `activate?`, `deactivate?`, `onPointerDown?`, `onPointerMove?`, `onPointerUp?`, `onClick?`, `onKeyDown?`              | `onClick(ctx, event, table)`, `activate(ctx, table)`               | strumento del suo gruppo nella barra verticale a sinistra della mappa; quando è attivo riceve il puntatore |
| `table-panel`         | `render`, `bind?`, `placement?` (`inspector` predefinito = scheda Creatura, `sidebar-tab`, `cover`, `dock`, `dock-row`), `icon?`, `section?` (B62) | `render(ctx, tableView)`                                           | riquadro nella scheda Creatura o sottoscheda di una scheda della barra laterale destra (B61, §5)           |
| `token-menu`          | `run`, `icon?`, `group?`, `submenu?` (B62, §5.3)                                                                                                   | `run(ctx, target)`, `when(ctx, target)`                            | voce del menu della pedina o di un suo sottomenu (interfaccia del menu: B12)                               |
| `map-layer`           | `svg`, `bind?`, `interactive?`                                                                                                                     | `svg(ctx, tableView)` → markup SVG                                 | livello sulla mappa; `order` < 60 sotto le pedine, ≥ 60 sopra; senza `interactive` non riceve il puntatore |
| `search`              | `search`                                                                                                                                           | `search(ctx, query)` → `[{title, page, params?, excerpt?}]`        | risultati della ricerca (massimo 20 per fornitore)                                                         |
| `command`             | `run`, `shortcut?`, `context?`, `group?`                                                                                                           | `run(ctx)`                                                         | palette (B23) e scorciatoia; `context` è `global` o l'id di una pagina                                     |
| `settings`            | `scope`, `fields`                                                                                                                                  | —                                                                  | sezione delle impostazioni (§2.7)                                                                          |
| `notifications`       | `collect`                                                                                                                                          | `collect(ctx)` → `[{id, title, body?, time?, category?, target?}]` | centro notifiche (B24)                                                                                     |
| `draft-guard`         | `hasDraft`, `confirm`                                                                                                                              | `hasDraft(ctx, next)`, `confirm(ctx, proceed)`                     | domanda prima di lasciare modifiche non salvate                                                            |

`tableView` (render) è `{scene, selectedActorId, mode, zoom, pan}`. `table`
(bind e strumenti) aggiunge `svg`, `root`, `point(event)` → coordinate della
scena, `message(text)`, `select(id)`, `setMode(id)`, `render()`.
`target` del menu è `{actorId, tokenId, sceneId}`.

### 2.3 Id del core e sostituzione

Gli id del core sono riservati (`CORE` in `registry.mjs`). Quelli marcati
sostituibili si prendono con `replaces: true`; il sostituto eredita la posizione
del core se non dichiara `order`. Se il sostituto non è visibile al ruolo (o
`when` è falso), resta l'elemento del core. Un solo sostituto per id.

| Punto                                    | Sostituibili                                                               | Solo riservati                                                                                   |
| ---------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `route`                                  | `home` (B30), `characters` (B21), `campaigns` (B13)                        | `library`, `builder`, `campaign`, `preparation`, `table`, `notes`                                |
| `service`                                | `search` (B23), `notes`, `requests` (B24), `preferences` (B22)             | `app-menu`, `scope`, `reset`, `new-journal`                                                      |
| `campaign-section`                       | `overview`, `group`, `sessions`, `journal`, `world`, `settings`            | `preparation`, `notes`, `entry`, `edit`                                                          |
| `sheet-tab`                              | `actions`, `inventory`, `spells`, `features`, `story`, `extras`            | —                                                                                                |
| `home-widget`                            | `resume` (10), `summary` (20: personaggio e resoconto), `appointment` (30) | —                                                                                                |
| `table-tool`                             | `measure`, `pointer` (B18)                                                 | `move`, `plan`, `pan`                                                                            |
| `table-panel`                            | `log` (B17; ordine 10, seconda scheda della barra laterale)                | —                                                                                                |
| `preparation-section`, `library-section` | —                                                                          | `scenes`, `edit`, `preview`; `available`, `personal`, `campaign`, `edit`                         |
| `map-layer`, `search`, `command`         | —                                                                          | livelli `base`…`doors`; fornitori `pages`, `characters`, `campaign`; scorciatoie del core (§2.6) |

Ordini del core: navigazione 10/20/30/40, servizi 10–40, campagna 10–70,
scheda 10–60, strumenti 10–50, livelli 10–70. Un sostituto di `characters` che
vuole conservare la scheda delega a `renderCharacters`/`bindCharacters`
quando `ctx.view.id` è presente.

### 2.4 Sezioni di stato

`registerStateSlice(name, { version, seed(), normalize(slice, fromVersion), undo? })`.

- Dati in `state.ext[name]`, versione in `state.extVersions[name]`; viaggiano
  con lo stato: commit, istantanea per Undo, salvataggio locale, reload.
- All'avvio: sezione assente → `seed()`; presente → `normalize(copia, versione salvata)`
  (0 se sconosciuta). Deve restituire il valore, idempotente; per una versione
  futura deve lanciare. Se `seed`/`normalize` lancia, i dati salvati restano
  intatti e compare un avviso circoscritto.
- "Ripristina esempio" rigenera tutte le sezioni con `seed()`.
- `undo: "snapshot"` (predefinito): Undo ripristina la sezione con il resto.
  `undo: "preserve"`: Undo la lascia com'è (chat, diario, impostazioni); i suoi
  commit usano `{ undoable: false }`.
- La sezione di un'area non caricata non viene mai cancellata.
- Solo dati sintetici. Le regole di privacy dei dati restano quelle del core:
  una sezione condivisa è visibile a entrambi i ruoli nello stesso browser; si
  proietta con `ctx.role` prima di mostrare.

### 2.5 Stili

`registerStyles(url)` con `new URL("./area.css", import.meta.url)` (consigliato),
un percorso relativo al documento o `data:text/css,…`. Il `<link>` è inserito
solo se l'area si registra; un URL già inserito non si duplica. Prefisso di
classe proprio (`.token-menu-…`). Nessuno stile in `styles.css`.

### 2.6 Eventi

`on(event, handler)`; `handler(payload, { event, emitter, ctx })`. I gestori
sono chiamati in modo sincrono nell'ordine di registrazione; un gestore che
lancia diventa un avviso e gli altri proseguono. Catene oltre 8 livelli si
interrompono con un avviso. Un gestore non chiama `ctx.render()` durante
`navigate`. Eventi propri: `"<id>:<nome>"`; ascoltabili da tutti.

Eventi del core. Quelli di stato sono **derivati** dall'host dopo un commit o un
Undo riuscito (`deriveStateEvents(before, after)`), quindi mai per anteprime o
mutazioni rifiutate; ogni payload ha `correction: true` se nasce da un Undo.

| Evento                                                         | Payload                                     | Origine nello stato                                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `commit`                                                       | `{id, label, kind, controller, visibility}` | nuova voce di `state.log`                                                                                                                |
| `roll-accepted`                                                | `{logId, roll}` (copia)                     | `rolls[]` della voce di registro (state.mjs `acceptedRolls`: combattimento, iniziativa, Dadi Vita, creazione); tiri `superseded` esclusi |
| `combat-start` / `combat-end`                                  | `{sceneId, round}`                          | `combat.active`                                                                                                                          |
| `turn-start` / `turn-end`                                      | `{actorId, round}`                          | `combat.turn`/`round` (anche all'avvio e alla fine)                                                                                      |
| `scene-activated`                                              | `{sceneId, previousSceneId}`                | `activeSceneId`                                                                                                                          |
| `rest-completed`                                               | `{restId, actorId, kind, benefitId}`        | beneficio `applied` nuovo in `restTime.rests[].participants[].benefits[]`                                                                |
| `condition-changed`                                            | `{actorId}`                                 | `actor.conditions` o `actor.exhaustion`                                                                                                  |
| `navigate`                                                     | `{page, id, tab, from}`                     | cambio di vista                                                                                                                          |
| `role-changed`, `language-changed`, `offline-changed`, `reset` | `{role}`, `{lang}`, `{offline}`, `{}`       | controlli della shell                                                                                                                    |

I payload portano identificatori (più la copia del tiro); prima di mostrare
qualcosa si verifica l'accesso (`rollVisibleTo(roll, ctx.role)` per i tiri,
`canViewActor` per gli attori). Un'area che conserva tiri nella propria sezione
(es. B34) emette `roll-accepted` da sé; l'host non lo ripete.

Scorciatoie riservate al core: `Escape`, `Tab`, `Shift+Tab` ovunque; `Mod+Z`,
`Enter`, `Space`, frecce sul Tavolo. `Mod` = Ctrl o Cmd. Due comandi con la
stessa scorciatoia, contesti sovrapposti (uguali o uno `global`) e ruoli in comune
sono in conflitto: vince il primo caricato; l'altro resta nella palette senza
scorciatoia (`shortcutConflict`) e il conflitto appare in `conflicts()` e negli avvisi.
Stesso tasto con ruoli disgiunti o pagine diverse non è un conflitto.

### 2.7 Impostazioni

```js
registry.add("settings", {
  id: "dice-3d-look",
  label: { it: "Dadi animati", en: "Animated dice" },
  scope: "personal", // "device" | "personal" | "campaign"
  fields: [
    { id: "enabled", label: { it: "Mostra", en: "Show" }, type: "boolean", default: true },
    {
      id: "color",
      label: { it: "Colore", en: "Colour" },
      type: "choice",
      default: "gold",
      options: [{ value: "gold", label: { it: "Oro", en: "Gold" } }],
    },
  ],
});
registry.getSetting(ctx, "dice-3d-look.enabled"); // value or declared default
registry.setSetting(ctx, "dice-3d-look.enabled", false);
```

Tipi: `boolean`, `number` (`min`, `max`), `text` (`maxLength`, predefinito 500),
`choice` (`options`). `device`: questo browser (`localStorage`), nessun commit.
`personal`: `state.ext["core-settings"].personal[role]`, commit locale e privato.
`campaign`: `state.ext["core-settings"].campaign`, commit condiviso, solo DM.
Mai annullate dall'Undo di gioco. Valore salvato non valido → valore predefinito.
Gli errori per l'utente hanno `{it, en}`, come nel resto dell'app.

### 2.8 Servizi dell'host (anche per le aree)

- `list(point, ctx, ...args)`: contributi visibili al ruolo, filtrati da `when`, ordinati.
- `get(point, id, ctx?, ...args)`: con `ctx` solo se visibile; senza, grezzo. `null` se assente.
- `merge(point, coreItems, ctx, ...args)`: elementi del core `{id, order?, roles?, …}` e
  contributi in un'unica lista ordinata; gli elementi del core hanno `core: true`.
- `slot(point, c | id, ctx, ...args)`: markup avvolto in `data-ext-slot` (`<div style="display:contents">`,
  `<g>` per i livelli). Se `render` lancia o non restituisce una stringa, al suo posto
  un avviso circoscritto (`.ext-error`).
- `bindSlots(root, ctx, { points?, args? })`: chiama `bind(el, ctx, ...args)` una volta per slot.
- `run(c, ctx, ...args)` / `invoke(c, method, ctx, ...args)`: esegue un'azione; `true` se completata.
  Errore con `{it, en}` → toast con quel testo; altro errore → avviso + toast breve.
- `call(c, method, fallback, ...args)`: interrogazione isolata con valore di riserva.
- `search(ctx, query)`, `notifications(ctx)`, `commandForKey(eventOrText, ctx)`, `pendingDraft(ctx, next)`.
- Solo host: `use`, `attach`, `initState`, `afterUndo`, `emitStateEvents`, `emit`, `on`,
  `report`, `reportHTML`, `extensions`, `warnings`, `conflicts`, `styles`, `slices`.

### 2.9 Caricatore e rapporto

`loadExtensions(registry)` sonda con `HEAD` e importa in parallelo, poi registra in
ordine di piano (l'ordine non dipende dalla rete). Stati: `built`; `not-built`
(il file d'ingresso non esiste: silenzioso, un solo `HEAD` 404 in console, mai
importato); `failed` (il file esiste ma non si importa, manca un suo import,
manca `register`, `register` lancia o è asincrona). In Node si usa
`ERR_MODULE_NOT_FOUND` sull'URL esatto. Il server statico deve rispondere a
`HEAD` (lo fa `serve-nocache.py`). `registry.reportHTML(ctx)` produce il riquadro
per "Cosa è pronto": conteggi, aree pronte, aree con errore e motivo, elenco
richiudibile delle aree da costruire e degli avvisi.

## 3. Piano degli hook — parte B

Solo aggiunte; firme ed esiti provati invariati. Nei moduli d'area gli hook usano
`ctx.registry?.`, così i test esistenti con `ctx` finti restano identici. Ancore
per nome di funzione o testo (i numeri di riga sono del 24/09 e possono spostarsi).

### 3.1 `app.mjs`

1. Import: `import { createRegistry } from "./registry.mjs";` e
   `import { loadExtensions } from "./extensions.mjs";`.
2. Prima di `const store = createStore({ storage });` (riga 37), con top-level await
   (il `<script type="module">` lo consente; il caricatore non rifiuta mai):
   ```js
   const registry = createRegistry();
   await loadExtensions(registry);
   const fixture = new URLSearchParams(location.search).get("fixture");
   if (/^[a-z0-9-]+$/.test(fixture ?? ""))
     await loadExtensions(registry, {
       entries: [{ id: fixture, file: `./tests/fixtures/${fixture}.mjs` }],
     });
   ```
   Il parametro `?fixture=` carica solo file di `tests/fixtures/` (percorso fisso).
3. Subito dopo `createStore`: `if (registry.initState(store.state).changed) store.persist();`
   (con `storageError === "read"` `persist` non sovrascrive i dati illeggibili).
4. `readRoute()`: `page: routes.includes(parts[0]) || registry.get("route", parts[0]) ? parts[0] : "home",`.
5. `commit()`: `const before = store.state;` prima di `store.commit(...)`; dopo:
   `registry.emitStateEvents(before, store.state);` e poi `render()`.
6. `undo()`, nel `try`:
   ```js
   const current = store.state;
   store.undo(role);
   registry.afterUndo(current, store.state);
   store.persist();
   registry.emitStateEvents(current, store.state, { kind: "correction" });
   render();
   ```
7. `ctx`: aggiungere `registry,`; dopo l'oggetto: `registry.attach(ctx);`.
8. Navigazione (render, riga 403, e menu `app-menu`, riga 530) da un helper:
   ```js
   const mergedNav = () =>
     registry
       .merge(
         "route",
         navItems.map(([id, glyph, it, en]) => ({ id, glyph, it, en })),
         ctx,
       )
       .filter((item) => item.core || item.nav || item.replaces)
       .map((item) =>
         item.core
           ? [item.id, item.glyph, item.it, item.en]
           : [
               item.id,
               item.icon ?? navItems.find((n) => n[0] === item.id)?.[1] ?? "book",
               esc(item.label.it),
               esc(item.label.en),
             ],
       );
   ```
9. Servizi dell'intestazione: i quattro `<button … data-service>` letterali di
   `.service-nav` (riga 406) diventano
   `registry.merge("service", coreServices, ctx).filter((s) => s.core || s.header || s.replaces)`
   con `coreServices = [{id:"search",glyph:"search",it:"Cerca",en:"Search"}, {id:"notes",…},
{id:"requests",…}, {id:"preferences",…}]`; `aria-label` da `t(it,en)` o
   `esc(registry.label(s, lang))`, icona `s.icon ?? glyph del core`.
10. `service(name)`, prima istruzione:
    `const extension = registry.get("service", name, ctx); if (extension) return void registry.run(extension, ctx);`.
11. `service("scope")`: aggiungere `${registry.reportHTML(ctx)}` in fondo al corpo.
12. `service("reset")`, dopo `store.reset();`:
    `registry.initState(store.state); store.persist(); registry.emit("reset", {});`.
13. Barra laterale della campagna (righe 411–417): sostituire il `filter` sui ruoli e
    la `map` con `registry.merge("campaign-section", campaignItems.map(([id, it, en]) =>
({ id, it, en, roles: ["preparation", "settings"].includes(id) ? ["dm"] : undefined })), ctx)`;
    etichetta `item.core ? t(item.it, item.en) : esc(registry.label(item, lang))`;
    la regola `active` resta quella attuale, con `item.id`.
14. Contenuto (riga 419): `const extRoute = registry.get("route", view.page, ctx);` e
    `const lockedRoute = !extRoute && !routes.includes(view.page) && registry.get("route", view.page);`.
    `<main>` mostra `registry.slot("route", extRoute, ctx)` se `extRoute`, poi uno stato
    vuoto "Pagina non disponibile per questo ruolo / Page not available for this role"
    se `lockedRoute`, altrimenti la catena attuale. Nei bind (righe 422–427): con `extRoute`
    solo `registry.bindSlots(content, ctx, { points: ["route"] })`, altrimenti i bind
    attuali (così un sostituto di `characters` non riceve un secondo `bindCharacters`).
    I `refresh…UI` e `bindMapPlacement` restano fuori dal ramo.
15. `renderHome()`, ramo con campagna accessibile: i tre blocchi attuali diventano
    `[{ id: "resume", html: <section.resume-scene> }, { id: "summary", html: <div.home-bottom> },
{ id: "appointment", html: <section.campaign-entry> }]`, resi con
    `registry.merge("home-widget", blocks, ctx).map((b) => (b.core ? b.html : registry.slot("home-widget", b, ctx))).join("")`
    dopo l'intestazione. In `render()`: se `view.page === "home"` e non `extRoute`,
    `registry.bindSlots(content, ctx, { points: ["home-widget"] })`.
16. Ricerca (`draw()` di `service("search")`): aggiungere alle pagine
    `registry.list("route", ctx).filter((r) => r.nav && !r.replaces)` (titolo `registry.label`)
    e in coda ai risultati `registry.search(ctx, query).map((r) => ({ title: label(r.title),
excerpt: r.excerpt ? label(r.excerpt) : "", page: r.page, params: r.params ?? {} }))`.
17. Scorciatoie, a livello di modulo accanto al gestore di `.skip-link`:
    ```js
    document.addEventListener("keydown", (event) => {
      if (event.defaultPrevented || event.isComposing || document.querySelector("#dialog")?.open)
        return;
      const typing = event.target.closest?.("input,textarea,select,[contenteditable=true]");
      if (typing && !(event.ctrlKey || event.metaKey || event.altKey)) return;
      const command = registry.commandForKey(event, ctx);
      if (!command) return;
      event.preventDefault();
      registry.run(command, ctx);
    });
    ```
    I tasti del Tavolo sono riservati, quindi nessun comando li intercetta.
18. Bozze: `const guardFailed = Symbol("guard");` a livello di modulo.
    `navigate()`, prima di `closeDialog()`:
    ```js
    const guard = !confirmed && registry.pendingDraft(ctx, { page, ...params });
    if (guard) {
      const proceed = () => navigate(page, params, true);
      if (registry.call(guard, "confirm", guardFailed, ctx, proceed) === guardFailed) proceed();
      return;
    }
    ```
    Stesso blocco nel gestore `hashchange` prima di `view = next;`, preceduto da
    `history.replaceState(null, "", "#" + view.page + "?" + new URLSearchParams(routeParams(view)))`.
    Nel cambio di ruolo un ramo prima di `else changeRole();` con
    `registry.pendingDraft(ctx, { ...view, role: nextRole })`. In `beforeunload`
    aggiungere `|| registry.pendingDraft(ctx, null)`. Un `confirm` che lancia non
    blocca l'utente: si prosegue.
19. Eventi della shell: in `changeRole()` dopo `role = nextRole;`
    `registry.emit("role-changed", { role });`; nelle preferenze, dopo il salvataggio,
    `language-changed`/`offline-changed` solo se il valore è cambiato; all'inizio di
    `render()`: `if (view !== announcedView) { const from = announcedView?.page ?? null;
announcedView = view; registry.emit("navigate", { page: view.page, id: view.id, tab: view.tab, from }); }`
    con `let announcedView = null;`.

### 3.2 `table.mjs`

1. Variabile di modulo `let openDrawer = null;`, azzerata in `resetTableView()`.
2. `renderTable`, dopo `const bounds`:
   ```js
   const reg = ctx.registry;
   const tableView = { scene, selectedActorId: selected, mode, zoom, pan: { ...pan } };
   const layers = (above) =>
     (reg?.list("map-layer", ctx, tableView) ?? [])
       .filter((c) => c.order >= 60 === above)
       .map((c) => reg.slot("map-layer", c, ctx, tableView))
       .join("");
   const panels = (placement) =>
     (reg?.list("table-panel", ctx, tableView) ?? []).filter(
       (c) => c.placement === placement && !c.replaces,
     );
   ```
3. Barra strumenti: dopo `chip("pointer", …)`,
   `${(reg?.list("table-tool", ctx, tableView) ?? []).filter((c) => !c.replaces).map((c) => chip(c.id, esc(c.label.it), esc(c.label.en), c.icon ?? "flag")).join("")}`.
4. `.table-topline .toolbar`, prima del pulsante Registro: un pulsante per pannello
   `drawer`: `<button class="button quiet" data-table-drawer="<id>" aria-expanded="…">`.
5. Mappa: `${layers(false)}` subito prima di `<g id="tokens">`; `${layers(true)}` tra la
   chiusura di `#tokens` e `<g class="door-controls">`.
6. Ispettore, prima del blocco `showLog`: per ogni `panels("inspector")`
   `<section class="table-ext-panel"><h3>${esc(reg.label(c, ctx.lang))}</h3>${reg.slot("table-panel", c, ctx, tableView)}</section>`.
   Nel blocco `showLog`: se `reg?.get("table-panel", "log", ctx, tableView)` rendere quello slot
   al posto del registro del core.
7. Cassetto: tra `</aside></div>` e `${renderCombatBar(…)}`, se `openDrawer` è visibile,
   `<section class="table-drawer" aria-label="…">${reg.slot("table-panel", openDrawer, ctx, tableView)}</section>`.
8. `bindTable`, dopo la definizione di `message` (riga 234):
   ```js
   const table = {
     scene,
     svg,
     root,
     point,
     message,
     get mode() {
       return mode;
     },
     get selectedActorId() {
       return selected;
     },
     select: (id) => select(id), // function declaration, hoisted
     setMode: (id) => {
       mode = id;
       ctx.render();
     },
     render: () => ctx.render(),
   };
   const tool = () => ctx.registry?.get("table-tool", mode, ctx, table) ?? null;
   ctx.registry?.bindSlots(root, ctx, { points: ["map-layer", "table-panel"], args: [table] });
   root.querySelectorAll("[data-table-drawer]").forEach(
     (b) =>
       (b.onclick = () => {
         openDrawer = openDrawer === b.dataset.tableDrawer ? null : b.dataset.tableDrawer;
         ctx.render();
       }),
   );
   ```
9. Delega del puntatore allo strumento attivo (anche ai sostituti di `measure`/`pointer`),
   ciascuna con `ctx.registry.invoke(tool(), "<handler>", ctx, e, table); return;`:
   `onpointerdown` dopo il blocco `pan` e prima di `hasCombatPreview`; `onpointermove` dopo
   `panning` e il controllo porte; `onpointerup` dopo il blocco `panning`; `onclick` dopo il
   blocco `hasCombatPreview` e prima di `if (e.target.closest("[data-actor]")) return;`;
   `onkeydown` dopo Escape e `Mod+Z`, con ritorno solo se `e.defaultPrevented`.
   Se lo strumento non ha quel gestore, resta il comportamento del core.
10. Gestore `[data-tool]`: prima di cambiare `mode` `invoke(previous, "deactivate", ctx, table)`,
    dopo `invoke(next, "activate", ctx, table)`; il resto invariato.
11. Nessun menu della pedina nel core: B12 lo costruisce da un proprio `map-layer`
    (`bind` riceve `table.svg`) leggendo `list("token-menu", ctx, target)`.

### 3.3 `characters.mjs`

1. Riga 426: `const tabItems = ctx.registry?.merge("sheet-tab", Object.entries(tabs).map(([id, names]) => ({ id, names })), ctx, actor) ?? Object.entries(tabs).map(([id, names]) => ({ id, names, core: true }));`
   e `const tab = tabItems.some((item) => item.id === ctx.view.tab) ? ctx.view.tab : "actions";`.
2. Navigazione (riga 496): iterare `tabItems`; testo `item.core ? t(...item.names) : esc(ctx.registry.label(item, ctx.lang))`.
3. Contenuto (riga 511): `const extTab = tabItems.find((item) => item.id === tab && !item.core);`
   → `(extTab ? ctx.registry.slot("sheet-tab", extTab, ctx, actor) : sections[tab](ctx, actor))`
   seguito da `ctx.registry?.list("sheet-section", ctx, actor).filter((c) => c.tab === tab).map((c) => ctx.registry.slot("sheet-section", c, ctx, actor)).join("") ?? ""`.
4. `bindCharacters`, dopo `bindConditionsSummary`: con `ctx.view.id`,
   `ctx.registry?.bindSlots(root, ctx, { points: ["sheet-tab", "sheet-section"], args: [getEffectiveActor(ctx.state.actors[ctx.view.id])] })`.

### 3.4 `preparation.mjs`

1. `renderPreparation`, dopo il controllo DM e prima di `const selected`:
   ```js
   const section =
     !ctx.view.id && ctx.view.tab
       ? ctx.registry?.get("preparation-section", ctx.view.tab, ctx)
       : null;
   if (section)
     return `<section class="prep-collection">${prepSections(ctx, section.id)}${ctx.registry.slot("preparation-section", section, ctx)}</section>`;
   ```
2. Nuovo helper `prepSections(ctx, current)`: `ctx.registry?.merge("preparation-section", [{ id: "scenes" }], ctx)`;
   con meno di due voci restituisce `""` (interfaccia attuale invariata), altrimenti `<nav class="tabs">`
   di pulsanti `data-prep-section` (etichetta del core `Scene / Scenes`). Inserirlo nella raccolta
   dopo `</div>` della `.page-heading`.
3. `bindPreparation`, in testa: `[data-prep-section]` → `ctx.navigate("preparation", id === "scenes" ? {} : { tab: id })`
   e `ctx.registry?.bindSlots(root, ctx, { points: ["preparation-section"] })`.

### 3.5 `library.mjs`

1. `renderLibrary`, in testa: `const section = !ctx.view.id ? ctx.registry?.get("library-section", ctx.view.tab, ctx) : null;`
   se presente, `<section class="library-page">` con intestazione "Biblioteca", navigazione
   degli ambiti e `ctx.registry.slot("library-section", section, ctx)`.
2. Estrarre la `<nav>` degli ambiti di `renderCollection` (array alla riga 391) in
   `libraryScopes(ctx, current)`, aggiungendo
   `...(ctx.registry?.list("library-section", ctx) ?? []).map((c) => [c.id, ctx.esc(ctx.registry.label(c, ctx.lang))])`.
   I pulsanti usano già `data-library-scope`, che naviga con `tab`.
3. `bindLibrary`, subito dopo il ciclo `[data-library-scope]` (riga 702, prima di ogni `return`):
   `ctx.registry?.bindSlots(root, ctx, { points: ["library-section"] });`.

### 3.6 `campaign.mjs`

1. `renderCampaign`, nel `try`, prima della catena `if (ctx.view.tab === "edit")`:
   ```js
   const sectionId =
     ctx.view.page === "campaign" && !["edit", "entry"].includes(ctx.view.tab)
       ? ctx.view.tab || "overview"
       : null;
   const section = sectionId ? ctx.registry?.get("campaign-section", sectionId, ctx) : null;
   if (section) body = ctx.registry.slot("campaign-section", section, ctx);
   else if (ctx.view.tab === "edit") body = editor(ctx); // existing chain continues
   ```
2. `bindCampaign`, prima istruzione: `ctx.registry?.bindSlots(root, ctx, { points: ["campaign-section"] });`.
   `getCampaignSection` restituisce già `ctx.view.tab` per le sezioni nuove.

### 3.7 `state.mjs` — nessuna modifica

`commit` copia l'intero stato (quindi `ext` entra nell'istantanea di Undo), `persist`
salva tutto, il caricamento conserva `ext` e `extVersions` senza toccarli, `reset`
ricrea lo stato. Seme, normalizzazione, conservazione su Undo e ripristino sono
gli hook di `app.mjs` (§3.1 punti 3, 6, 12), provati nel test
"the real store keeps slices…" con il vero `createStore`. B50 ripristina
un'istantanea dentro un commit che sostituisce i campi del `draft`; le prove dei
dadi già accettate restano immutabili per le regole esistenti del commit.

### 3.8 `index.html`

Un `<link rel="stylesheet" href="registry.css" />` dopo `preparation.css`, con un nuovo
`registry.css` della parte B (poche regole con i token esistenti): `.ext-error`,
`.ext-report`, `.table-ext-panel`, `.table-drawer`. Gli stili delle aree arrivano da
`registerStyles`. Il modulo `app.mjs` supporta già il top-level await.

### 3.9 `combat.mjs`, `combat-ui.mjs`, `rest-time.mjs` — nessuna modifica

Gli eventi di dominio sono derivati dal passaggio di stato confermato (§2.6), non
emessi dalle funzioni pure: nessuna dipendenza del dominio dal registro, nessun
evento per anteprime o commit rifiutati, Undo coerente. Provenienza verificabile:
`turn-start`/`turn-end` da `advanceTurn` (combat.mjs), `startPreparedEncounter`
(preparation.mjs) e `reconcileFormsAfterMutation` (state.mjs); `combat-start` dal commit
di `startEncounter` (app.mjs), `combat-end` dal commit "Concludi" (table.mjs);
`roll-accepted` da `resolveRoll`/`resolveAutomaticRolls` (combat.mjs), `resolveHitDie`
(rest-time.mjs), iniziativa e tiri di creazione tramite `acceptedRolls` (state.mjs);
`rest-completed` da `completeRest` (rest-time.mjs, `benefit.applied`); `condition-changed`
dai comandi di conditions.mjs. Limite noto: il "Tiro libero" del Tavolo registra solo
un'etichetta, quindi non produce `roll-accepted`; B34 lo sostituisce ed emette l'evento.

### 3.10 Prove della parte B

- Suite Node completa verde (gli hook sono opzionali nei `ctx` finti).
- `changes/interview-01/blueprint-checks/registry-smoke-journey.js` su
  `/?fixture=sample-extension#sample-extension`: voce "Prova" nella navigazione tra
  Personaggi e Campagne; nota aggiunta dal pulsante e da `Mod+Shift+N`; reload conserva;
  Undo toglie la nota e conserva il registro; "Ripristina esempio" rigenera; il DM vede
  sezione di Preparazione e pannello, il giocatore no; sezione di campagna, scheda "Scheda
  di prova" su Livia (non sui goblin), strumento e livello sul Tavolo; CSS presente solo con
  la fixture; nessun overflow a 390 e 1440; "Cosa è pronto" elenca le 48 aree.
  Per l'isolamento nel browser serve una seconda fixture che fallisce (nuovo file della parte B).
- I percorsi esistenti controllano `pageerror`: i 404 delle aree non costruite sono
  risorse, non errori di pagina.

## 4. Verifiche svolte e limiti

- `node --test design/blueprint/tests/registry.test.mjs`: 17/17. Coprono ogni punto,
  ruoli e `when`, ordine e sostituzione, validazione e transazione, sezioni di stato con un
  adattatore e con il vero `createStore` (seme, migrazione v1→v2, reload, Undo con
  `snapshot`/`preserve`, reset, sezione orfana conservata, normalizzazione fallita), conflitti
  di scorciatoie, bus di eventi, eventi derivati, isolamento di render/bind/run/when/search/
  notifications, impostazioni nei tre ambiti, stili, caricatore (`built`, `not-built`, sei
  modi di `failed`), sonda del browser e piano completo delle 48 aree.
- Browser reale (Chromium, server statico sulla porta 8911, 24/09): 48 aree `not-built` in
  ~30 ms con un solo `HEAD` 404 ciascuna; fixture `built` con CSS applicato; slot in
  `display: contents`; il pulsante legato da `bindSlots` esegue il commit; dipendenza
  mancante di un modulo esistente riportata `failed`; `reportHTML` reso nella pagina.
  L'app non era coinvolta: la parte B non è applicata.
- Limiti: finché mancano le aree, la console mostra un 404 per area (non un errore di
  pagina). Eventi e impostazioni sono locali a questo browser: nessun backend, nessuna
  sincronizzazione tra partecipanti. Il campione SRD `srd-sample.mjs` della scheda B11
  non fa parte della parte A.

## 5. Struttura del Tavolo e dove mettere un comando (B61, 24/09/2026)

Con 22 aree la testata del Tavolo aveva 16 pulsanti d'area. B61 adotta la disposizione di
consenso del mercato (prove e misure: [struttura del Tavolo](blueprint-table-structure-evidence.md)):
strumenti a sinistra, barra laterale a schede a destra, azioni in basso, ordine dei turni in alto.

### 5.1 Nuovi posti del registro

- **`table-panel` con `placement: "sidebar-tab"`**: scheda propria della barra laterale destra
  (Foundry sidebar tabs FVT-007, Roll20 barra laterale, D&D Beyond Maps DDB-133). Campi usati:
  `icon` (sulla scheda; senza, `flag`), `label` (nome accessibile e suggerimento al passaggio),
  `order`, `roles` (una scheda solo DM non esiste per il giocatore), `when`. Il pannello aperto ha
  `id="table-drawer"`, titolo e «Chiudi pannello» (`data-table-drawer-close`); la scheda porta
  `role="tab"`, `data-table-drawer="<id>"`, `aria-selected` e `aria-expanded`. Ogni controllo
  dell'area con `data-table-drawer="<id>"` apre la scheda; premuto a scheda aperta torna a
  Creatura (come il vecchio cassetto). `"drawer"` resta accettato come vecchio nome.
- **Ordine delle schede** (B62, §5.3): le schede sono le sezioni di `TABLE_SIDEBAR_SECTIONS`
  in ordine fisso; dentro una sezione le sottoschede seguono l'`order` del pannello (Registro 10
  prima in Chat). Un pannello `sidebar-tab` **senza** `section` ha ancora una scheda propria
  (comportamento B61), ma una nuova area deve dichiarare la sezione.
- **`table-tool` con `group`**: gruppo della barra a sinistra (Foundry scene controls FVT-108,
  Roll20 R20-127). Gruppi (`TABLE_TOOL_GROUPS` in `registry.mjs`, valori validati):
  `select` (Muovi, Pianifica, Sposta vista, Seleziona più pedine), `measure` (Misura, Sagoma),
  `draw` (Disegna, Spillo), `fog` (solo se B35 registra uno strumento), `ping` (Puntatore),
  `dm` (Posiziona creatura, Pedina a più facce), `more` (strumenti senza gruppo). Un gruppo con
  un solo strumento visibile mostra lo strumento stesso; altrimenti un pulsante di gruppo e, per
  il gruppo attivo, i suoi strumenti in colonna accanto. Il gruppo torna all'ultimo strumento
  usato. Zoom e «Centra» stanno in basso a destra della mappa (Owlbear, DDB-120).
- **Scheda Creatura**: l'ispettore della creatura selezionata e i pannelli `inspector`. Selezionare
  una pedina non cambia scheda (Foundry): i pannelli d'area agiscono sulla selezione. Avviare
  l'anteprima di un'azione o il percorso pianificato riporta una volta la scheda Creatura, dove
  stanno dettagli e conferma.
- **Memoria**: ogni identità ritrova la sua ultima scheda e lo stato compresso su questo
  dispositivo (`localStorage` `d20-studio-table-sidebar`); «Ripristina esempio» la dimentica.
- **Barra in basso** (core, B62: una sola barra alla BG3): a sinistra ritratto, nome e risorse
  (Azione, Bonus, Reazione, Movimento); al centro le pagine «Azioni» (azioni della creatura,
  Scatto, Schivata, Disimpegno e i comandi `dock` come «Mosse» di B40) e «Barra rapida» (le righe
  `dock-row` di B53), con modalità dei dadi e «Tiri e risultati» accanto; a destra Muovi,
  Rialzati, Azioni della scheda, Tira i dadi, Esc, Annulla ultima modifica e Termina turno per
  ultimo. Le aree non vi aggiungono pulsanti propri: usano `dock` (un comando accanto alle azioni)
  o `dock-row` (una pagina). La pagina scelta è ricordata per identità (`hotbar`). Da 721 px le
  azioni stanno in al massimo due righe (le altre scorrono dentro la barra) e Termina turno è
  alto quanto le due righe di comandi: la barra ha la stessa altezza qualunque creatura sia
  selezionata. In combattimento la mappa cede l'altezza della riga dell'ordine dei turni, così
  il Tavolo sta in 1440 × 900 senza scorrere la pagina. Revisione di B62: i comandi `dock`
  stanno in una colonna propria accanto alle azioni (`.combat-dock`), che non scorre mai; da
  1280 a 1499 px il ritratto lascia la sua larghezza alle azioni e sotto i 1440 px modalità dei
  dadi e «Tiri e risultati» mostrano solo il controllo e la campanella, così a 1366 × 768 le
  azioni restano in due righe accanto a «Mosse».
- **Telefono (≤ 720 px)**: la barra laterale segue la mappa nella pagina; le schede sono una
  barra fissata in basso sotto la barra delle azioni (B62: tre righe basse fissate sopra le
  schede, la mappa in vista resta ≥ 60 % dello schermo), con «Mappa» per primo (ogni scheda
  mostra icona ed etichetta) e «Tutti i pannelli» in fondo; scorrono solo le schede in mezzo
  (revisione di B61: «Tutti i pannelli», anche nella barra verticale del computer, elenca ogni
  pannello — B62: raggruppato per scheda —, così un pannello resta a due tocchi anche quando la
  barra non basta). Il contenuto delle schede deve funzionare anche nella colonna da 300–420
  px: la colonna è un contenitore `table-panel`, quindi
  `@container table-panel (max-width: 600px) { … }` ripete le regole «telefono» dell'area.

### 5.2 Dove mettere un comando (regola per chi costruisce un'area)

1. **Agisce sulla mappa con il puntatore** → `table-tool` con il `group` del suo tema. Mai un
   pulsante nuovo in cima alla barra.
2. **Si consulta o si lavora accanto alla mappa** (elenchi, strumenti del DM, materiali) →
   `table-panel` `placement: "sidebar-tab"` con la `section` del suo tema (§5.3), `icon`
   distinta, `order` dentro la sezione, `roles` se è solo del DM. Diventa una sottoscheda della
   sezione: mai una scheda nuova della barra. Mai un pulsante nella riga del titolo del Tavolo:
   lì stanno solo i comandi di scena del core (Avvia/Concludi combattimento, Scene, Riposi, Tempo).
3. **Dice qualcosa della creatura selezionata** (poche righe) → `table-panel` `inspector`.
4. **Agisce su una pedina precisa** → `token-menu`, con il `submenu` del suo tema (§5.3); in
   cima solo i comandi più frequenti (condizioni, PF, scheda, centra, selezione, esamina, cerca).
5. **Tasto rapido** → `command` con `context: "table"` (la palette B23 lo elenca); il controllo
   visibile porta `data-command="<id>"` e ottiene da B23 il tasto nel suggerimento.
6. **Servizio globale** → `service`; `header: true` solo se serve in ogni pagina: l'intestazione
   del telefono ha una riga al Tavolo (Aiuto passa nel menu App) e due fuori; se non c'è posto il
   servizio va nel menu App o nella palette, mai in una nuova riga.
7. **Pagina** → `route`; `nav: true` solo per le 5–6 destinazioni principali. Le sezioni d'area
   stanno nelle loro pagine (campagna, scheda, Biblioteca, Preparazione) e dichiarano dove:
   `campaign-section` → `group`, `preparation-section` → `group`, `sheet-tab` → `category`
   (§5.3). Senza, la voce resta separata (in «Altro», in fondo o come scheda propria) e allunga
   la navigazione: la revisione la rimanda.
8. **Avviso che chiede un'azione** (tiri, danni da applicare, segnali) → `notifications` (campana
   B24) oltre al proprio pannello: una scheda chiusa non deve nascondere una richiesta.
9. **Sovrapposizioni globali** (dadi, carta X, suggerimenti) non trattengono i clic della pagina,
   salvo una schermata modale voluta e rara (la prova BG3 con CD avviata da sé, B56). I
   suggerimenti al primo incontro (B30) sono spenti per impostazione (I-236): l'aiuto si apre su
   richiesta («?» nell'intestazione, F1, menu App) e i suggerimenti si accendono da Aiuto › Tour
   e suggerimenti.
10. **Un'azione delle regole ha un solo comando.** Se due aree coprono la stessa azione SRD
    (esempio: Cercare, EN 187 / IT 212, per creature nascoste B46, trappole B41 e punti di ricerca
    B45), una sola area la offre e le altre forniscono il confronto con lo stesso tiro
    (`searchForTrapsWithRoll`, `searchPointsWithRoll`); i loro pulsanti lasciano il posto al
    comando unico.

### 5.3 Architettura dell'informazione dopo le 48 aree (B62, 25–26/09/2026)

Con tutte le aree costruite il DM aveva 21 schede nella barra del Tavolo (5 oltre la barra a
1440 × 900), 24 sezioni di campagna (9 sotto la piega), 11 sezioni di Preparazione, fino a 11
schede nella scheda personaggio, 29 voci nel menu della pedina (1491 px di scorrimento in un
riquadro da 882) e due barre in basso. B62 raggruppa per tassonomie di mercato, dichiarate nel
registro (`registry.mjs`) e validate: un valore sconosciuto fa fallire la registrazione con il
suo messaggio. Prove e misure: [consolidamento IA](blueprint-ia-consolidation-evidence.md).

| Punto e campo               | Valori (`registry.mjs`)                                                                                                                                                                           | Modello                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `table-panel.section`       | `TABLE_SIDEBAR_SECTIONS`: `creature` (core), `chat` (core, con il Registro), `combat`, `scene`, `exploration`, `items`, `journal`, `tables`, `reference`                                          | schede della barra di Foundry (FVT-007), barra di Roll20, Maps di D&D Beyond (DDB-133) |
| `campaign-section.group`    | `CAMPAIGN_SECTION_GROUPS`: `campaign` (aperto di default: Panoramica, Sessioni, Diario, Archivio, Gruppo, Mondo, Preparazione), `story`, `world`, `play`, `manage` («Strumenti» per il giocatore) | gruppi di moduli di Kanka (CMP-23), categorie di World Anvil                           |
| `preparation-section.group` | `PREPARATION_GROUPS`: `scenes` (con le Scene del core), `encounters`, `materials`, `sessions`                                                                                                     | cartelle di Foundry, barra delle pagine di Roll20                                      |
| `sheet-tab.category`        | `SHEET_CATEGORIES`: `actions`, `spells`, `inventory`, `features`, `story`, `notes`, `extras` (le schede del core sono la propria categoria)                                                       | sezioni della scheda di D&D Beyond (DDB-027, DDB-053)                                  |
| `token-menu.submenu`        | `TOKEN_MENU_SUBMENUS`: `actions`, `look`, `visibility`, `items`, `dm` («Altro» per il giocatore)                                                                                                  | Token HUD di Foundry (FVT-119), menu della pedina di D&D Beyond (DDB-117)              |

Come si vedono:

- **Barra laterale del Tavolo**: una scheda per sezione con almeno un pannello visibile (DM 9,
  giocatore 7; 8 con Bottino o Bottega aperti ai giocatori). La scheda della sezione porta
  `data-table-section` e `data-table-tab="<sezione>"`; se la sezione ha più pannelli, sopra il
  contenuto compaiono le sottoschede (`.table-subtabs`, WAI-ARIA tab, frecce/Home/End) con
  `data-table-subtab`, `data-table-drawer` per i pannelli d'area e `data-table-tab="<pannello>"`.
  Premere la scheda della sezione aperta torna a Creatura; la sezione ricorda l'ultima
  sottoscheda (`sections`). I pannelli che non sono sottoschede visibili hanno una maniglia
  nascosta in `.table-panel-index` (`data-table-drawer`, `aria-expanded`): il codice d'area che
  preme `[data-table-drawer="<id>"]` apre ancora il suo pannello. «Tutti i pannelli» elenca ogni
  pannello raggruppato per sezione, con l'interruttore «Nella barra» (`hidden`, per identità: una
  sezione nascosta resta nell'elenco e compare nella barra solo mentre è aperta).
- **Barra della campagna**: gruppi richiudibili (`[data-campaign-group]`, pulsante
  `[data-campaign-group-toggle]` con `aria-expanded`), stato ricordato per identità
  (`d20-studio-campaign-rail`); il gruppo della sezione aperta è sempre aperto; una sezione senza
  gruppo va in «Altro», aperto. «Tutte le sezioni» elenca per gruppo. `rail-groups.mjs`.
- **Preparazione**: prima striscia con i gruppi (`[data-prep-group]`; un gruppo di una sola
  sezione porta anche `data-prep-section` e la apre), seconda striscia con le sezioni del gruppo
  aperto (`.prep-sections.is-sub [data-prep-section]`). Con un solo gruppo resta la striscia
  unica di prima. «Tutte» elenca per gruppo. `prepSectionModel(ctx)`.
- **Scheda personaggio**: sette categorie nell'ordine di D&D Beyond; una categoria con più
  membri mostra le sottosezioni (`.character-subtabs`, `data-character-subtab`; i membri d'area
  anche `data-character-tab="<id>"`). L'indirizzo `tab=` accetta la categoria o il membro.
  `sheetCategories(ctx, items)`.
- **Menu della pedina**: in cima i comandi senza `submenu`, poi un'entrata per sottomenu
  (`data-token-menu-category`, conteggio, `aria-haspopup`); un sottomenu con un solo comando
  visibile mostra direttamente quel comando. Vista `cat:<id>` con Indietro, nome del sottomenu e
  i comandi con le loro scorciatoie (i comandi da tastiera `command` restano globali). Freccia
  destra apre, freccia sinistra ed Esc tornano all'entrata. Sul telefono il foglio cresce fino
  all'altezza dello schermo (revisione di B62), quindi le 12 voci del DM non restano sotto la
  piega.

Revisione di B62 (26/09/2026): l'ordine delle schede segue Foundry anche per Oggetti prima di
Diario; «Esplorazione» (viaggio, mappa del mondo, calendario) non ha una scheda in Foundry e
resta accanto a Scena. Gli strumenti del gruppo attivo della mappa partono dalla cima della
barra (come i controlli di scena di Foundry). Dopo una scelta nelle strisce della scheda e della
Preparazione il fuoco resta sul controllo scelto. Prove: [consolidamento IA](blueprint-ia-consolidation-evidence.md),
«Revisione e correzioni».
