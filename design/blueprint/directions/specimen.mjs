// Dev-only component specimen (Phase C, visual-01, owner rules I-248 and I-250): every shared
// component of the blueprint on one page, with the app's real markup and stylesheets, skinned
// by a direction through the same loader the app uses. Open it on a loopback host:
//   http://127.0.0.1:8881/directions/specimen.html?direction=bg3   (or current, off, an id)
//   …specimen.html?direction=bg3&variant=c2,t3   (round-2 options, directions/README.md «Variants»)
// The page is never linked from the app and nothing in the app imports this module.
//
// Fidelity rules (changes/visual-01/specimen/README.md):
// - Stylesheets: specimen.html carries index.html's eleven static links in their order; this
//   module appends the 48 that registry.injectStyles (registry.mjs:1032-1041) appends at
//   runtime, in the same order and with the same attributes, then startDirection() appends the
//   direction sheets last, exactly as app.mjs:69-80 does. checkSheets() reports any sheet that
//   failed or drifted from index.html; the capture script also compares the whole list with a
//   running app page.
// - Markup: each fragment is the HTML its module renders (file:line on every cell), taken from
//   the running app on 8881 (01/10/2026, the example after «Ripristina esempio», Player unless
//   noted) with the icons and the logo produced by ui.mjs's own icon() and logo(), so a
//   direction's icons.mjs and brand.mjs apply. index.html's <link rel="icon"> is copied into
//   the head before the loader runs, so a direction's favicon replaces it as in the app. Inline styles that table.mjs fitHud adds after a render
//   (top, margin-top, bottom) are left out. «composto» marks a fragment assembled from the
//   module's template for a state the example does not reach (named in the cell).
// - Context: each component sits inside the ancestors it has in the app (the workspace, the
//   sheet, the Table layout), drawn as display:contents boxes, so every scoped rule
//   (.home-page, .character-sheet, .table-layout, child combinators, :has() hooks) matches as
//   in the app while the specimen lays the cells out. The app itself wraps its extension
//   slots the same way (style="display: contents").
import { DIRECTIONS, activeDirection, directionMode, startDirection } from "./index.mjs";
import { esc, icon, logo } from "../ui.mjs";

const LOOPBACK = ["127.0.0.1", "localhost", "[::1]"]; // as directions/index.mjs and app.mjs
// The 48 stylesheets registry.injectStyles appends at runtime, in registration order, with
// their data-extension (observed on a running app page, 01/10/2026; code-map §b). The capture
// script fails the run when a running app page lists anything else.
const RUNTIME_STYLES = [
  ["token-menu.css", "token-menu"],
  ["campaign-members.css", "campaign-members"],
  ["session-view.css", "session-view"],
  ["handouts.css", "handouts"],
  ["compendium.css", "compendium"],
  ["chat.css", "chat"],
  ["annotations.css", "annotations"],
  ["encounter-builder.css", "encounter-builder"],
  ["campaign-settings.css", "campaign-settings"],
  ["character-library.css", "character-library"],
  ["preferences.css", "preferences"],
  ["command-palette.css", "command-palette"],
  ["notifications.css", "notifications"],
  ["tables-decks.css", "random-tables"],
  ["loot.css", "loot"],
  ["safety.css", "safety"],
  ["media.css", "media"],
  ["account.css", "account"],
  ["home.css", "home"],
  ["combat-tracker.css", "combat-tracker"],
  ["damage.css", "damage-tray"],
  ["dice.css", "dice-tray"],
  ["fog-vision.css", "fog-vision"],
  ["inventory-plus.css", "inventory-plus"],
  ["sheet-plus.css", "sheet-plus"],
  ["spells-plus.css", "spells-plus"],
  ["builder-plus.css", "builder-plus"],
  ["special-moves.css", "special-moves"],
  ["regions.css", "regions"],
  ["world.css", "world-map"],
  ["journal-plus.css", "quests"],
  ["party.css", "party"],
  ["exploration.css", "travel"],
  ["knowledge.css", "knowledge"],
  ["scene-assets.css", "scene-assets"],
  ["homebrew-editor.css", "homebrew-editor"],
  ["adventures.css", "adventures"],
  ["campaign-data.css", "campaign-data"],
  ["sessions-plus.css", "sessions-plus"],
  ["offline.css", "offline"],
  ["quickbar.css", "quickbar"],
  ["projects.css", "projects"],
  ["integrations.css", "integrations"],
  ["dice-3d.css", "dice-3d"],
  ["generators.css", "generators"],
  ["relations-graph.css", "relations-graph"],
  ["community.css", "community"],
  ["assistant.css", "assistant"],
];

// ------------------------------------------------------------------ stylesheets

/** registry.injectStyles, once per sheet: same element, attributes and order (absolute href). */
function injectStyles() {
  return Promise.all(
    RUNTIME_STYLES.map(([file, extension]) => {
      const link = document.createElement("link");
      link.setAttribute("rel", "stylesheet");
      link.setAttribute("href", new URL(`../${file}`, import.meta.url).href);
      link.setAttribute("data-extension", extension);
      const settled = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
        link.addEventListener("error", resolve, { once: true });
      });
      document.head.append(link);
      return settled;
    }),
  );
}

const appLinks = () =>
  [...document.head.querySelectorAll('link[rel="stylesheet"]')].filter(
    (link) =>
      !link.hasAttribute("data-specimen-sheet") && !link.hasAttribute("data-direction-sheet"),
  );
const staticLinks = () => appLinks().filter((link) => !link.hasAttribute("data-extension"));
const loaded = (link) => {
  try {
    return Boolean(link.sheet && link.sheet.cssRules.length);
  } catch {
    return false;
  }
};

/** Missing or empty sheets, and drift of the static list from index.html. */
async function checkSheets() {
  const sheets = [...appLinks(), ...document.querySelectorAll("link[data-direction-sheet]")];
  const missing = sheets.filter((link) => !loaded(link)).map((link) => link.getAttribute("href"));
  let drift = null;
  try {
    const html = await (await fetch("index.html", { cache: "no-store" })).text();
    const app = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    const ours = staticLinks().map((link) => link.getAttribute("href"));
    if (app.join() !== ours.join()) drift = { app, specimen: ours };
  } catch {
    drift = "index.html unreadable";
  }
  return {
    app: appLinks().map((link) => link.getAttribute("href")),
    direction: [...document.querySelectorAll("link[data-direction-sheet]")].map((link) =>
      link.getAttribute("href"),
    ),
    missing,
    drift,
  };
}

// ------------------------------------------------------------------ page helpers

const h = (...parts) => parts.join("");
const C = 'style="display:contents"';
/** The component inside its app ancestors, each a box that draws nothing (display:contents). */
// Container ancestors (marked "box:") stay real boxes where the app's container queries must
// measure them: the Table's inspector always (a table-panel container, 340 px in the app as
// in its cells); the sheet and its layout in the full-width cells (about 1340 px at 1440, as
// the app's 1344 px sheet, so bg3/ddb/foundry's @container character-sheet (min-width: 900px)
// rules match as in the app) and on a phone (characters.css:888-1020 and sheet-plus.css:1334
// lay the phone sheet out by its own width, which a 390 px stage matches). In the narrower
// desktop cells they draw nothing: no container, so the narrow-sheet queries match nothing,
// as on the app's 1344 px sheet (and no min-width query targets those components).
const PHONE = "(max-width: 720px)";
const phone = () => Boolean(globalThis.matchMedia?.(PHONE).matches);
const within = (tags, html) =>
  tags.reduceRight((inner, entry) => {
    const box = entry.startsWith("box:") || (entry.startsWith("phone-box:") && phone());
    const tag = entry.replace(/^(phone-)?box:/, "");
    const name = tag.match(/^<([a-z0-9]+)/)[1];
    return `${box ? tag : `${tag.slice(0, -1)} ${C}>`}${inner}</${name}>`;
  }, html);
// The ancestors each surface gives its components (read from the running app, 01/10/2026).
// The <main id="content"> of the app is a plain <div> here: no rule styles a component
// through it, only main's own box, and the id would wake page-level :has() rules.
const PAGE = ['<div class="workspace">', "<div>"];
const HOME = [
  ...PAGE,
  '<div data-ext-slot="route:home">',
  '<div class="home-dashboard">',
  '<div class="home-page" data-home-page="" data-fresh="false" data-home-lead="false">',
];
const HOME_MAIN = [...HOME, '<div class="home-layout">', '<div class="home-main">'];
const HOME_ASIDE = [
  ...HOME,
  '<div class="home-layout">',
  '<aside class="home-aside">',
  '<section class="home-panel">',
];
const CAMPAIGN = [
  '<div class="workspace with-sidebar">',
  "<div>",
  '<section class="campaign-page">',
];
const SHEET = [
  ...PAGE,
  '<div data-ext-slot="route:characters">',
  'phone-box:<div class="character-sheet" data-character-page="tab" data-character-category="actions">',
  'phone-box:<div class="character-layout">',
];
const SHEET_MAIN = [
  ...SHEET,
  'phone-box:<div class="character-body">',
  'phone-box:<div class="character-main">',
];
const SHEET_TAB = [...SHEET_MAIN, 'phone-box:<div class="character-tab-content">'];
/** A sheet chain for a full-width cell: the sheet and its layout are real boxes there. */
const wide = (chain) =>
  chain.map((entry) =>
    /class="character-(sheet|layout)"/.test(entry) ? entry.replace("phone-box:", "box:") : entry,
  );
const TABLE = ['<div class="workspace is-table">', "<div>", '<div class="table-layout">'];
const TABLE_STAGE = [...TABLE, '<div class="table-stage">'];
// The party column floats in the map area (.table-stage), from its bottom left: on a desktop
// that area reaches down beside the hotbar (BG3), on a phone it ends above it, over the map.
// So the column is drawn with the hotbar on a desktop and over the map on a phone, never
// twice; on a desktop it also gives the hotbar portrait its sample art (:has() hook).
const partyBeside = () => (phone() ? "" : within(['<div class="table-stage">'], party()));
const partyOver = () => (phone() ? party() : "");
// The sidebar panel has contain: size on a desktop (its grid row sets its height), so it only
// becomes a box on a phone, where the app makes it a sheet in the page flow.
const TABLE_PANEL = [...TABLE, 'phone-box:<div class="table-sidebar-panel">'];
const TABLE_INSPECTOR = [...TABLE_PANEL, 'box:<div class="table-inspector">'];

/** One component: its stage (the box it sits in) and a caption with name, class and source. */
function cell({ name, cls, src, html, size = "", stage = "" }) {
  const mods = (prefix, list) =>
    list
      .split(" ")
      .filter(Boolean)
      .map((m) => ` ${prefix}${m}`)
      .join("");
  return h(
    `<div class="specimen-cell${mods("is-", size)}">`,
    `<div class="specimen-stage${mods("is-", stage)}">${html}</div>`,
    `<div class="specimen-caption"><span class="specimen-name">${esc(name)}</span>`,
    `<span class="specimen-class">${esc(cls)}</span>`,
    `<span class="specimen-source">${esc(src)}</span></div></div>`,
  );
}
const rowTitle = (text) => `<div class="specimen-row-title">${esc(text)}</div>`;
function section(id, title, note, cells, grid = "") {
  return h(
    `<section class="specimen-section" id="specimen-${id}" aria-labelledby="specimen-${id}-title">`,
    `<div class="specimen-section-title" role="heading" aria-level="2" id="specimen-${id}-title">${esc(title)}</div>`,
    note ? `<span class="specimen-section-note">${esc(note)}</span>` : "",
    `<div class="specimen-grid${grid ? " is-" + grid : ""}">${cells.join("")}</div></section>`,
  );
}

// ------------------------------------------------------------------ shell

// app.mjs:759, the brand button of both headers: logo() (ui.mjs:94, a direction's brand.mjs
// replaces it) and the «d20 Studio» wordmark.
const brandButton = () =>
  `<button class="brand" data-nav="home" aria-label="d20 Studio">${logo()}<span>d20 <b>Studio</b></span></button>`;
// app.mjs:759 (header), app.mjs:609 (navButton), app.mjs:635 (serviceButtons), ui.mjs:94 logo().
const headerHome = () =>
  h(
    `<header class="app-header ">`,
    brandButton(),
    `<nav aria-label="Navigazione principale">`,
    `<button class="nav-link active" data-nav="home">${icon("home")}<span>Inizio</span></button>`,
    `<button class="nav-link " data-nav="characters">${icon("person")}<span>Personaggi</span></button>`,
    `<button class="nav-link " data-nav="campaigns">${icon("campaign")}<span>Campagne</span></button>`,
    `<button class="nav-link " data-nav="library">${icon("book")}<span>Biblioteca</span></button></nav>`,
    serviceNav(),
    `</header>`,
  );
const serviceNav = () =>
  h(
    `<div class="service-nav">`,
    `<button class="icon-button" data-service="search" aria-label="Cerca" title="Cerca (⌘K)" data-cmdk-base="Cerca" aria-keyshortcuts="Meta+K">${icon("search")}</button>`,
    `<button class="icon-button" data-service="notes" aria-label="Appunti personali" title="Appunti personali">${icon("note")}</button>`,
    `<button class="icon-button has-ext-count" data-service="requests" aria-label="Notifiche e richieste · 1 notifica" title="Notifiche e richieste" data-cmdk-base="Notifiche e richieste">${icon("bell")}<span class="ext-count" aria-hidden="true">1</span></button>`,
    `<button class="icon-button" data-service="preferences" aria-label="Preferenze" title="Preferenze">${icon("settings")}</button>`,
    `<button class="icon-button" data-service="home-help" aria-label="Aiuto" title="Aiuto (F1)" data-cmdk-base="Aiuto" aria-keyshortcuts="F1">${icon("help")}</button>`,
    `<button class="icon-button" data-service="offline" aria-label="In linea — tutto sincronizzato" title="In linea — tutto sincronizzato">${icon("check")}</button>`,
    `<button class="icon-button" data-service="account" aria-label="Account e profilo" title="Account e profilo">${icon("person")}</button></div>`,
  );
// app.mjs:759, the Table variant (no page links: App menu and Back to campaign).
const headerTable = () =>
  h(
    `<header class="app-header table-header">`,
    brandButton(),
    `<button class="button quiet" data-service="app-menu">${icon("menu")} App</button>`,
    `<button class="button quiet" data-nav="campaign" aria-label="Torna alla campagna" title="Torna alla campagna">${icon("arrow")}<span>Torna alla campagna</span></button>`,
    serviceNav(),
    `</header>`,
  );

// ------------------------------------------------------------------ brand (I-251)

// The tab icon: index.html's <link rel="icon"> href (own) and the one in this page's head after
// the loader ran (now: a direction's brand.mjs favicon, or own again). Set by addIconLink/boot.
const favicon = { own: null, now: null };
/** index.html's <link rel="icon">, copied into this page's head before the loader runs. */
async function addIconLink() {
  try {
    const html = await (await fetch("index.html", { cache: "no-store" })).text();
    const own = new DOMParser()
      .parseFromString(html, "text/html")
      .querySelector('link[rel="icon"]');
    if (!own) return;
    const link = document.createElement("link");
    for (const { name, value } of own.attributes) link.setAttribute(name, value);
    document.head.querySelector("title").after(link);
    favicon.own = link.getAttribute("href");
  } catch {}
}

// The header as a real box (its background, padding and 81 px height), or as context only.
const HEADER_BOX = ['box:<header class="app-header ">'];
const HEADER = ['<header class="app-header ">'];
const LOGO_SIZES = [16, 24, 32, 48, 96, 160];
/** logo() at a fixed size: an inline size wins over .brand .logo (34 px) and any direction's. */
const sizedLogo = (px) => logo().replace(/^<svg /, `<svg style="width:${px}px;height:${px}px" `);
// Each size in the header's brand context (display:contents), so the rules a direction writes
// on .brand .logo or .app-header .brand .logo (colour, shadow) apply as in the app.
const logoSizes = () =>
  h(
    `<div class="specimen-sizes">`,
    ...LOGO_SIZES.map(
      (px) =>
        `<div class="specimen-size">${within([...HEADER, '<span class="brand">'], sizedLogo(px))}<span class="specimen-size-label">${px} px</span></div>`,
    ),
    `</div>`,
  );
const tabIcon = (px) =>
  favicon.now
    ? `<img class="specimen-favicon" src="${esc(favicon.now)}" width="${px}" height="${px}" alt="">`
    : `<span class="specimen-size-label">nessuna icona</span>`;
const browserTabs = () =>
  ["is-dark", "is-light"]
    .map((tone) =>
      h(
        `<div class="specimen-tabstrip ${tone}">`,
        `<div class="specimen-tab">${tabIcon(16)}<span>d20 Studio · Blueprint</span></div>`,
        `<div class="specimen-tile ${tone}">${tabIcon(32)}<span class="specimen-size-label">32 px</span></div>`,
        `</div>`,
      ),
    )
    .join("");

const brandCells = () => {
  const source =
    favicon.now && favicon.now === favicon.own
      ? "l’icona di oggi (index.html)"
      : favicon.now
        ? "l’icona della direzione (brand.mjs, favicon)"
        : "nessuna";
  return [
    cell({
      name: "Testata di Inizio, 1×",
      cls: "header.app-header .brand .logo · .brand span · .brand b",
      src: "app.mjs:759 · ui.mjs logo()",
      size: "wide",
      stage: "flush",
      html: within(HEADER_BOX, brandButton()),
    }),
    cell({
      name: "Testata di Inizio, 2× (zoom CSS)",
      cls: "header.app-header .brand",
      src: "app.mjs:759",
      size: "wide",
      stage: "flush",
      html: `<div class="specimen-zoom is-2">${within(HEADER_BOX, brandButton())}</div>`,
    }),
    // On a phone the Table header hides the brand (styles.css, 720 px block): no cell there.
    phone()
      ? ""
      : cell({
          name: "Testata del Tavolo, 1×",
          cls: "header.app-header.table-header .brand",
          src: "app.mjs:759",
          size: "wide",
          stage: "flush",
          html: within(['box:<header class="app-header table-header">'], brandButton()),
        }),
    cell({
      name: "Il dado da solo, sullo sfondo della pagina",
      cls: "logo() a 16 · 24 · 32 · 48 · 96 · 160 px, nel contesto .app-header .brand",
      src: "ui.mjs logo() · directions/<id>/brand.mjs",
      size: "wide",
      html: logoSizes(),
    }),
    cell({
      name: "Il dado da solo, su un riquadro chiaro",
      cls: "logo() a 16 · 24 · 32 · 48 · 96 · 160 px",
      src: "ui.mjs logo() · directions/<id>/brand.mjs",
      size: "wide",
      html: `<div class="specimen-tile is-light">${logoSizes()}</div>`,
    }),
    cell({
      name: "Icona della scheda del browser, 16 e 32 px",
      cls: `link[rel="icon"]: ${source}`,
      src: "index.html:8 · directions/<id>/brand.mjs favicon",
      size: "half",
      html: browserTabs(),
    }),
    cell({
      // In the header's context (.app-header .brand rules apply): at ≤ 420 px the app hides the
      // wordmark (styles.css), so a phone shows the mark alone here too.
      name: phone()
        ? "Marchio completo, 2× (zoom CSS): sul telefono la testata mostra solo il dado"
        : "Marchio completo, 3× (zoom CSS)",
      cls: ".brand: dado e scritta «d20 Studio»",
      src: "app.mjs:759",
      size: "wide",
      html: `<div class="specimen-zoom is-3">${within(HEADER, brandButton())}</div>`,
    }),
  ].filter(Boolean);
};

// ------------------------------------------------------------------ typography

const typography = () => [
  cell({
    name: "Titolo di pagina (h1) con sottotitolo",
    cls: ".page-heading h1 + p",
    src: "campaign-members.mjs:2407",
    size: "half",
    html: within(
      PAGE,
      h(
        `<div class="page-heading"><div><h1>Campagne</h1><p>I tuoi gruppi: avvia una campagna, invita chi gioca e gestisci i membri.</p></div>`,
        `<div class="toolbar"><button class="button" data-cm="paste-link">Ho un link d’invito</button><button class="button primary" data-cm="create">${icon("plus")} Crea campagna</button></div></div>`,
      ),
    ),
  }),
  cell({
    name: "Titolo di sezione (h2)",
    cls: ".section-heading h2",
    src: "home-ui.mjs:183",
    html: within(PAGE, `<div class="section-heading"><h2>Il tuo personaggio</h2></div>`),
  }),
  cell({
    name: "Titolo di riquadro (h3)",
    cls: "h3",
    src: "sheet-plus.mjs:548",
    html: within(PAGE, `<h3>Tiri salvezza</h3>`),
  }),
  cell({
    name: "Testo",
    cls: "p",
    src: "app.mjs:1160",
    html: within(
      PAGE,
      `<p>Cancella modifiche, scene e appunti di questa dimostrazione in questo browser.</p>`,
    ),
  }),
  cell({
    name: "Testo secondario",
    cls: "p.muted",
    src: "account.mjs:1275",
    html: within(
      PAGE,
      `<p class="muted">Lo stesso nome e avatar che gli altri vedono nell’elenco dei membri della campagna e in chat.</p>`,
    ),
  }),
  cell({
    name: "Testo piccolo",
    cls: "small",
    src: "home-ui.mjs:183",
    html: within(PAGE, `<small>Maga · Livello 3</small>`),
  }),
  cell({
    name: "Errore",
    cls: "small.error",
    src: "conditions-ui.mjs:75 · conditions.mjs:60",
    html: within(PAGE, `<small class="error">Indica un motivo.</small>`),
  }),
  cell({
    name: "Tasto",
    cls: "kbd",
    src: "table.mjs:746",
    html: within(PAGE, `<kbd>Maiusc+X</kbd>`),
  }),
  cell({
    name: "Etichetta in maiuscoletto e numeri",
    cls: ".stats > .stat (strong, span)",
    src: "party.mjs:1079",
    size: "half",
    html: within(
      PAGE,
      `<div class="stats party-vehicle-stats"><div class="stat"><strong data-party-speed>9 m</strong><span>Velocità</span></div><div class="stat"><strong data-party-load>120 kg / 540 kg</strong><span>Carico</span></div><div class="stat"><strong data-party-aboard>3 / 4</strong><span>A bordo</span></div></div>`,
    ),
  }),
];

// ------------------------------------------------------------------ buttons

// One row per surface: a direction may skin buttons everywhere or only inside a surface.
const BUTTON_CONTEXTS = [
  ["Ovunque (Campagne, Biblioteca, finestre)", PAGE],
  ["Inizio", HOME_MAIN],
  ["Scheda", SHEET_TAB],
  ["Tavolo (pannello laterale)", TABLE_INSPECTOR],
];
const BUTTONS = [
  {
    name: "Normale",
    cls: ".button",
    plain: [
      "app.mjs:236",
      () => `<button type="button" class="button" data-close>Annulla</button>`,
    ],
    icon: [
      "quickbar.mjs:1751",
      () =>
        `<button type="button" class="button" data-qb-custom-new>${icon("plus")} Nuova azione personalizzata</button>`,
    ],
  },
  {
    name: "Principale",
    cls: ".button.primary",
    plain: [
      "app.mjs:236",
      () => `<button class="button primary" type="submit">Ripristina</button>`,
    ],
    icon: [
      "app.mjs:765",
      () =>
        `<button class="button primary" data-nav="table">${icon("play")} Entra al Tavolo</button>`,
    ],
  },
  {
    name: "Discreto",
    cls: ".button.quiet",
    plain: [
      "characters.mjs:581",
      () =>
        `<button type="button" class="button quiet" data-character-action="collection">← Personaggi</button>`,
    ],
    icon: [
      "table.mjs:746",
      () =>
        `<button type="button" class="button quiet" data-table="last-move" aria-pressed="false" aria-keyshortcuts="Shift+X">${icon("undo")} Ultima mossa <kbd>Maiusc+X</kbd></button>`,
    ],
  },
  {
    name: "Pericolo",
    cls: ".button.danger",
    plain: [
      "campaign-members.mjs:2516",
      () =>
        `<button class="button danger" data-cm="leave" data-id="lanterns">Esci dalla campagna…</button>`,
    ],
    icon: [
      "campaign-members.mjs:2516 + icon(), composto",
      () =>
        `<button class="button danger" data-cm="leave" data-id="lanterns">${icon("close")} Esci dalla campagna…</button>`,
    ],
  },
  {
    name: "Attivo",
    cls: ".button.active",
    plain: [
      "table.mjs:842 senza icona, composto",
      () => `<button class="button active" data-tool="move" title="Muovi">Muovi</button>`,
    ],
    icon: [
      "table.mjs:842",
      () =>
        `<button class="button active" data-tool="move" title="Muovi">${icon("move")} <span class="dock-text">Muovi</span></button>`,
    ],
  },
  {
    name: "Disattivato",
    cls: ".button:disabled",
    plain: [
      "conditions-ui.mjs:40",
      () =>
        `<button type="button" class="button" data-conditions-restore="livia" disabled>Riporta a 1 PF</button>`,
    ],
    icon: [
      "sheet-plus.mjs:903 + disabled, composto",
      () =>
        `<button type="button" class="button" data-shp-dialog="to-edit" disabled>${icon("pen")} Passa a Modifica</button>`,
    ],
  },
  {
    name: "Principale disattivato",
    cls: ".button.primary:disabled",
    plain: [
      "conditions-ui.mjs:2118",
      () =>
        `<button type="button" class="button primary" data-conditions-death-roll="livia" disabled>Tira il TS contro la morte</button>`,
    ],
    icon: [
      "conditions-ui.mjs:2118 + icon(), composto",
      () =>
        `<button type="button" class="button primary" data-conditions-death-roll="livia" disabled>${icon("dice")} Tira il TS contro la morte</button>`,
    ],
  },
];
const buttons = () =>
  BUTTON_CONTEXTS.flatMap(([where, tags]) =>
    ["plain", "icon"].flatMap((kind) => [
      rowTitle(`${where} · ${kind === "icon" ? "con icona" : "senza icona"}`),
      ...BUTTONS.map((b) =>
        cell({
          name: `${b.name}${kind === "icon" ? " con icona" : ""}`,
          cls: b.cls,
          src: b[kind][0],
          stage: "row",
          html: within(tags, b[kind][1]()),
        }),
      ),
    ]),
  );
const iconButtons = () => [
  cell({
    name: "Pulsante icona",
    cls: ".icon-button",
    src: "app.mjs:635",
    stage: "row",
    html: within(
      PAGE,
      `<button class="icon-button" data-service="search" aria-label="Cerca" title="Cerca (⌘K)" data-cmdk-base="Cerca" aria-keyshortcuts="Meta+K">${icon("search")}</button>`,
    ),
  }),
  cell({
    name: "Pulsante icona con contatore",
    cls: ".icon-button.has-ext-count .ext-count",
    src: "app.mjs:635 · registry.css:61",
    stage: "row",
    html: within(
      PAGE,
      `<button class="icon-button has-ext-count" data-service="requests" aria-label="Notifiche e richieste · 1 notifica" title="Notifiche e richieste" data-cmdk-base="Notifiche e richieste">${icon("bell")}<span class="ext-count" aria-hidden="true">1</span></button>`,
    ),
  }),
  cell({
    name: "Chiudi (finestra)",
    cls: ".dialog-heading .icon-button",
    src: "app.mjs:236",
    stage: "row",
    html: within(
      PAGE,
      `<button type="button" class="icon-button" data-close aria-label="Chiudi">${icon("close")}</button>`,
    ),
  }),
  cell({
    name: "Pulsante testo",
    cls: ".text-button",
    src: "party.mjs:1197",
    stage: "row",
    html: within(
      PAGE,
      `<button type="button" class="text-button" data-party-sheet="livia" data-tab="actions">Livia</button>`,
    ),
  }),
  cell({
    name: "Pulsante testo con icona",
    cls: ".text-button",
    src: "combat-ui.mjs:505",
    stage: "row",
    html: within(
      PAGE,
      `<button class="text-button" data-combat-requests="">${icon("bell")} Tiri e risultati</button>`,
    ),
  }),
];

// ------------------------------------------------------------------ fields

const fields = () => [
  cell({
    name: "Campo di testo",
    cls: ".field input",
    src: "campaign-members.mjs:3150",
    html: within(
      PAGE,
      `<label class="field">Nome della campagna<input name="name" required maxlength="80" autocomplete="off" value="Le lanterne di Bruma"></label>`,
    ),
  }),
  cell({
    name: "Campo vuoto con segnaposto",
    cls: ".field input::placeholder",
    src: "hp-widget.mjs:179",
    html: within(
      PAGE,
      `<label class="field dt-grow">Causa (facoltativa, resta nel registro)<input data-dt-note="livia" maxlength="200" autocomplete="off" value="" placeholder="per esempio: trappola a dardi"></label>`,
    ),
  }),
  cell({
    name: "Menu a tendina",
    cls: ".field select",
    src: "annotations.mjs:2456",
    html: within(
      PAGE,
      `<label class="field">Chi la vede<select name="audience"><option value="all">Tutto il tavolo</option><option value="me">Solo io</option></select></label>`,
    ),
  }),
  cell({
    name: "Area di testo",
    cls: ".field textarea",
    src: "annotations.mjs:2456",
    html: within(
      PAGE,
      `<label class="field">Nota (appare al passaggio del puntatore)<textarea name="text" maxlength="280" rows="3" required>La porta nord cigola: chi passa fa rumore.</textarea></label>`,
    ),
  }),
  cell({
    name: "Ricerca",
    cls: '.field input[type="search"]',
    src: "app.mjs:1219",
    html: within(
      PAGE,
      `<label class="field">Personaggi, pagine e testi accessibili<input name="query" type="search" placeholder="Prova Livia o Tavolo"></label>`,
    ),
  }),
  cell({
    name: "Numero",
    cls: '.field input[type="number"]',
    src: "account.mjs:1323",
    html: within(
      PAGE,
      `<label class="field">Anno di nascita<input name="year" type="number" inputmode="numeric" min="1900" max="2030" step="1" required value="1990"></label>`,
    ),
  }),
  cell({
    name: "Casella di spunta",
    cls: ".check-field input[type=checkbox]",
    src: "dice-3d.mjs:787 · home-ui.mjs:768",
    stage: "row",
    html: within(
      PAGE,
      h(
        `<label class="check-field"><input type="checkbox" data-dice3d-enabled checked> Mostra i dadi animati</label>`,
        `<label class="check-field"><input type="checkbox" data-home-tips-undiscovered> <span>Elenca anche quelli non ancora incontrati</span></label>`,
      ),
    ),
  }),
  cell({
    name: "Scelta singola",
    cls: ".account-choice input[type=radio]",
    src: "account.mjs:1662-1667",
    html: within(
      PAGE,
      `<fieldset class="account-choices"><legend>Colore</legend><label class="account-choice"><input type="radio" name="color" value="gold" checked> Oro</label><label class="account-choice"><input type="radio" name="color" value="sage" > Salvia</label><label class="account-choice"><input type="radio" name="color" value="sky" > Cielo</label></fieldset>`,
    ),
  }),
  cell({
    name: "Interruttore (offline, nella scheda)",
    cls: '.offline-switch input[role="switch"]',
    src: "offline.mjs:1321-1324",
    html: within(
      SHEET_TAB,
      h(
        `<section class="panel offline-sheet" aria-label="Disponibilità offline"><div class="offline-switch-block" data-offline-switch="sheet:livia">`,
        `<label class="offline-switch"><input type="checkbox" role="switch" data-offline-toggle="sheet:livia" aria-describedby="offline-switch-text-livia"><span class="offline-switch-track" aria-hidden="true"></span><span>Disponibile offline</span></label>`,
        `<p class="muted" id="offline-switch-text-livia">Solo online: senza rete la consulti, ma le modifiche restano bloccate.</p>`,
        `<button type="button" class="button quiet" data-offline-page-link="">${icon("settings")}Offline e sincronizzazione</button></div></section>`,
      ),
    ),
  }),
  cell({
    name: "Interruttore di base, spento e acceso",
    cls: '.switch (input[role="switch"])',
    src: "styles.css:544 · classe senza markup nell’app, composto",
    stage: "row",
    html: within(
      PAGE,
      h(
        `<input type="checkbox" role="switch" class="switch" aria-label="Spento">`,
        `<input type="checkbox" role="switch" class="switch" aria-label="Acceso" checked>`,
        `<input type="checkbox" role="switch" class="switch" aria-label="Non modificabile" disabled>`,
      ),
    ),
  }),
  cell({
    name: "Campo con suggerimento",
    cls: ".conditions-field .field + small.muted",
    src: "conditions-ui.mjs:67-75 · 1043",
    html: within(
      PAGE,
      `<div class="conditions-field"><label class="field"><span>Causa dichiarata</span><input aria-describedby="conditions-hint-originLabel" type="text" data-conditions-field="originLabel" value="" maxlength="120" autocomplete="off"></label><small class="muted" id="conditions-hint-originLabel">Per esempio: veleno della lama, incantesimo, caduta.</small></div>`,
    ),
  }),
  cell({
    name: "Campo con errore",
    cls: '.field input[aria-invalid="true"] + small.error',
    src: "conditions-ui.mjs:67-80 · 1110 · conditions.mjs:60",
    html: within(
      PAGE,
      `<div class="conditions-field"><label class="field"><span>Fonte della cura (obbligatoria)</span><input aria-describedby="conditions-error-reason" type="text" data-conditions-field="reason" value="" aria-invalid="true" autocomplete="off"></label><small class="error" id="conditions-error-reason">Indica un motivo.</small></div>`,
    ),
  }),
];

// ------------------------------------------------------------------ tabs, badges

const tabs = () => [
  cell({
    name: "Schede di sezione",
    cls: "nav.tabs > button.active",
    src: "campaign-members.mjs:2454",
    size: "wide",
    html: within(
      CAMPAIGN,
      `<nav class="tabs cm-tabs" aria-label="Sezioni della campagna"><button type="button" class="active" data-cm="tab" data-id="lanterns" data-tab="members" data-mode="campaign" aria-current="page">Membri</button><button type="button" class="" data-cm="tab" data-id="lanterns" data-tab="invites" data-mode="campaign" >Inviti <span class="cm-count">1</span></button><button type="button" class="" data-cm="tab" data-id="lanterns" data-tab="manage" data-mode="campaign" >Gestione</button></nav>`,
    ),
  }),
  cell({
    name: "Schede della scheda personaggio",
    cls: ".character-tabs-bar nav.tabs.character-tabs",
    src: "characters.mjs:664",
    size: "wide",
    html: within(
      wide(SHEET_MAIN),
      h(
        `<div class="character-tabs-bar"><nav class="tabs character-tabs" aria-label="Sezioni della scheda">`,
        `<button type="button" class="character-page-tab" data-character-page-tab="abilities">Caratteristiche</button>`,
        `<button type="button" class="character-page-tab" data-character-page-tab="skills">Abilità</button>`,
        `<button type="button" class="active" data-character-tab="actions" aria-current="page">Azioni</button>`,
        `<button type="button" class="" data-character-tab="spells">Magie</button>`,
        `<button type="button" class="" data-character-tab="inventory">Inventario</button>`,
        `<button type="button" class="" data-character-tab="features">Capacità</button>`,
        `<button type="button" class="" data-character-tab="story">Storia</button>`,
        `<button type="button" class="" data-character-tab="notes">Note</button>`,
        `<button type="button" class="" data-character-tab="extras">Extra</button></nav>`,
        `<button type="button" class="character-tabs-all" data-character-tabs-all="" aria-haspopup="dialog" aria-label="Tutte le sezioni della scheda" title="Tutte le sezioni della scheda">${icon("grid")}<span aria-hidden="true">Tutte</span></button></div>`,
      ),
    ),
  }),
  cell({
    name: "Pillole del pannello del Tavolo (DM)",
    cls: ".table-subtabs > .table-subtab.active",
    src: "table.mjs:717",
    html: within(
      TABLE_PANEL,
      h(
        `<div class="table-subtabs" role="tablist" aria-label="Creatura">`,
        `<button type="button" role="tab" id="table-subtab-creature" class="table-subtab active" data-table-subtab="creature" aria-selected="true" aria-expanded="true" aria-controls="table-sidebar-panel" tabindex="0"><span>Creatura</span></button>`,
        `<button type="button" role="tab" id="table-subtab-party" class="table-subtab" data-table-subtab="party" data-table-drawer="party" data-table-tab="party" aria-selected="false" aria-expanded="false" aria-controls="table-sidebar-panel" tabindex="-1">${icon("person")}<span>Riepilogo del gruppo</span></button></div>`,
      ),
    ),
  }),
];

const badges = () => [
  cell({
    name: "Etichetta",
    cls: ".badge",
    src: "account.mjs:1343",
    stage: "row",
    html: within(PAGE, `<span class="badge" data-account-2fa-state>Attiva</span>`),
  }),
  cell({
    name: "Etichetta «Nuova» (Inizio)",
    cls: ".badge.home-badge-new",
    src: "home-ui.mjs:730",
    stage: "row",
    html: within(HOME_ASIDE, `<span class="badge home-badge-new">Nuova</span>`),
  }),
  cell({
    name: "Visibilità del personaggio",
    cls: ".badge.clib-privacy",
    src: "character-library.mjs:1940",
    stage: "row",
    html: within(
      SHEET,
      `<span class="badge clib-privacy" data-privacy="campaign"><span aria-hidden="true">◎</span> Solo campagna</span>`,
    ),
  }),
  cell({
    name: "Costo dell’azione (scheda)",
    cls: ".badge.shp-econ.shp-econ-{action,bonus,reaction,other}",
    src: "sheet-plus.mjs:712",
    stage: "row",
    size: "half",
    html: within(
      [
        ...SHEET_TAB,
        '<section class="panel shp-actions">',
        '<div class="shp-action-group">',
        '<ul class="shp-action-list">',
        '<li class="shp-action">',
        '<div class="shp-action-copy">',
      ],
      h(
        `<span class="badge shp-econ shp-econ-action">Azione</span> `,
        `<span class="badge shp-econ shp-econ-bonus">Azione bonus</span> `,
        `<span class="badge shp-econ shp-econ-reaction">Reazione</span> `,
        `<span class="badge shp-econ shp-econ-other">Altro</span>`,
      ),
    ),
  }),
];

// ------------------------------------------------------------------ panels and cards

const panels = () => [
  cell({
    name: "Pannello",
    cls: "section.panel",
    src: "account.mjs:1334 · 1323",
    html: within(
      PAGE,
      `<section class="panel" aria-labelledby="account-age-title" data-account-age><h2 id="account-age-title">Età e consenso</h2><form data-account-age-form><label class="field">Anno di nascita<input name="year" type="number" inputmode="numeric" min="1900" max="2030" step="1" required></label><p class="muted">Si conserva solo la fascia d’età, non l’anno. Sotto i 14 anni serve il consenso di un genitore per i tavoli pubblici; sotto i 18 gli annunci per adulti restano nascosti.</p><button type="submit" class="button">Salva la fascia d’età</button></form></section>`,
    ),
  }),
  cell({
    name: "Pannello della scheda con titolo e stato vuoto",
    cls: "section.panel .section-heading + p.empty-state",
    src: "quickbar.mjs:1751",
    size: "half",
    html: within(
      SHEET_TAB,
      `<section class="panel qb-custom" data-qb-custom="" aria-labelledby="qb-custom-title"><div class="section-heading"><h2 id="qb-custom-title">Azioni personalizzate</h2><button type="button" class="button" data-qb-custom-new="">${icon("plus")} Nuova azione personalizzata</button></div><p class="muted">Attacchi e abilità che l'app non conosce ancora, con tiro per colpire e danno calcolati dalla scheda. Al Tavolo si usano dalla barra rapida.</p><p class="empty-state qb-custom-empty">Nessuna azione personalizzata.</p></section>`,
    ),
  }),
  cell({
    name: "Scheda dell’Inizio",
    cls: "section.home-card",
    src: "home-ui.mjs:740-768",
    html: within(
      HOME_ASIDE,
      h(
        `<section class="home-card" aria-labelledby="home-tours-title"><h3 id="home-tours-title">Tour guidati</h3><ul class="home-list">`,
        `<li class="home-row" data-home-tour-row="home" data-status="new"><div class="home-row-text"><strong>Inizio</strong><small>Dove ritrovi partita, lavoro in sospeso, novità e aiuto. · 5 passi</small></div><div class="toolbar"><button type="button" class="button" data-home-tour-start="home" aria-label="Avvia il tour Inizio">Avvia</button></div></li>`,
        `<li class="home-row" data-home-tour-row="sheet" data-status="new"><div class="home-row-text"><strong>Scheda del personaggio</strong><small>Punti ferita, schede, riposi e avanzamento. · 5 passi</small></div><div class="toolbar"><button type="button" class="button" data-home-tour-start="sheet" aria-label="Avvia il tour Scheda del personaggio">Avvia</button></div></li></ul>`,
        `<button type="button" class="button quiet" data-home-tours-reset="">Ripristina tutti i tour</button></section>`,
      ),
    ),
  }),
  cell({
    name: "Il tuo personaggio (Inizio)",
    cls: "button.character-resume .portrait .hp-small",
    src: "home-ui.mjs:183",
    html: within(
      [...HOME_MAIN, '<div class="home-bottom">', "<section>"],
      `<button class="character-resume" data-open-sheet="livia"><span class="portrait">L</span><span><strong>Livia</strong><small>Maga · Livello 3</small></span><span class="hp-small">18 / 22<small>Punti ferita</small></span>${icon("book")}</button>`,
    ),
  }),
  cell({
    name: "Scheda del gruppo (Campagna)",
    cls: "li.party-card",
    src: "party.mjs:1197",
    html: within(
      [
        ...CAMPAIGN,
        "<div>",
        '<div class="party-dashboard">',
        '<div class="party-dash-grid">',
        '<div class="party-tile is-wide">',
        "<section>",
      ],
      `<ul class="party-mini-list party-cards"><li class="party-mini party-card" data-party-mini="livia"><span class="portrait party-card-portrait" aria-hidden="true">L</span><div class="party-card-body"><div class="party-mini-head"><button type="button" class="text-button" data-party-sheet="livia" data-tab="actions">Livia</button><span class="muted">Maga 3</span></div><p class="party-card-player muted">Giocato da Giocatore</p><span class="party-hp"><strong>18</strong> / 22</span><span class="party-hpbar" aria-hidden="true"><span style="width:82%"></span></span><span class="party-mini-stats"><span>CA <strong>13</strong></span><span>PP <strong>11</strong></span></span></div></li></ul>`,
    ),
  }),
  cell({
    name: "Riga d’azione della scheda",
    cls: "li.shp-action",
    src: "sheet-plus.mjs:741",
    size: "half",
    html: within(
      [
        ...SHEET_TAB,
        '<section class="panel shp-actions">',
        '<div class="shp-action-group" data-shp-economy="action">',
        '<ul class="shp-action-list">',
      ],
      h(
        `<li class="shp-action" data-shp-action="attack:fire-bolt"><button type="button" class="shp-star" data-shp="fav" data-kind="attack" data-id="fire-bolt" aria-pressed="false" aria-label="Aggiungi Dardo di fuoco ai preferiti" title="Aggiungi ai preferiti">☆</button>`,
        `<div class="shp-action-copy"><div class="shp-row-cell"><button type="button" class="shp-row-name shp-row-tip" data-shp="tip" data-tip="shp-tip-action-attack-fire-bolt" aria-describedby="shp-tip-action-attack-fire-bolt" aria-label="Dardo di fuoco: dettagli, clic per fissarli"><strong>Dardo di fuoco</strong></button>`,
        `<div class="shp-tip" role="tooltip" id="shp-tip-action-attack-fire-bolt"><strong class="shp-tip-title">Dardo di fuoco +5</strong><p>Attacco a distanza con incantesimo, danni da fuoco.</p><ul><li><span>Intelligenza</span><strong>+3</strong></li><li><span>Competenza</span><strong>+2</strong></li></ul><p>Danni: 1d10</p><small class="shp-tip-hint">Clic sul nome: fissa il dettaglio</small></div></div> <span class="badge shp-econ shp-econ-action">Azione</span><p>Attacco a distanza con incantesimo, danni da fuoco.</p></div>`,
        `<div class="shp-action-tools"><button type="button" class="shp-value" data-shp="roll" data-kind="attack" data-subject="fire-bolt" aria-label="Tiro per colpire con Dardo di fuoco +5" title="Clic: tira subito · clic destro o pressione lunga: vantaggio, svantaggio, dadi fisici">+5</button><button type="button" class="button quiet" data-shp="action-detail" data-kind="attack" data-id="fire-bolt">Dettagli</button></div></li>`,
      ),
    ),
  }),
];

// ------------------------------------------------------------------ numbers

// sheet-plus.mjs:450 (ability box), 249 (pill), 455 (band); characters.mjs:1048-1060 (band,
// vitals), 1042 (speed), 973 (AC, hidden while the area shows it), damage-tray.mjs:679
// (compact HP box). One ability box per ability, as the module renders them.
const ABILITIES = [
  ["str", "FOR", "Forza", "+0", 10, "Tiro salvezza", "+1"],
  ["dex", "DES", "Destrezza", "+2", 14, "Tiro salvezza", "+3"],
  ["con", "COS", "Costituzione", "+2", 14, "Tiro salvezza", "+3"],
  ["int", "INT", "Intelligenza", "+3", 16, "Tiro salvezza · competente", "+6"],
  ["wis", "SAG", "Saggezza", "+1", 12, "Tiro salvezza · competente", "+4"],
  ["cha", "CAR", "Carisma", "+0", 10, "Tiro salvezza", "+1"],
];
const band = () =>
  h(
    `<div class="character-band"><div data-ext-slot="sheet-section:sheet-plus-band" style="display:contents"><div class="shp-band" data-shp-band="livia"><div class="shp-abilities" role="group" aria-label="Caratteristiche">`,
    ...ABILITIES.map(([key, short, full, mod, score, save, saveMod]) =>
      h(
        `<div class="shp-stat shp-ability"><button type="button" class="shp-ability-box" data-shp="roll" data-kind="check" data-subject="${key}" aria-describedby="shp-tip-ab-${key}" aria-label="Prova di ${full} ${mod}" title="Clic: tira subito · clic destro o pressione lunga: vantaggio, svantaggio, dadi fisici"><span class="shp-ability-name">${short}</span><strong>${mod}</strong><small>${score}</small></button>`,
        `<div class="shp-tip" role="tooltip" id="shp-tip-ab-${key}"><strong class="shp-tip-title">${full} ${score}</strong><ul><li><span>Modificatore</span><strong>${mod}</strong></li><li><span>${save}</span><strong>${saveMod}</strong></li></ul><small class="shp-source">SRD 5.2.1 · EN 180 / IT 212</small><small class="shp-tip-hint">Clic: prova di caratteristica</small></div></div>`,
      ),
    ),
    `</div><div class="shp-stat" data-shp-stat="pb"><button type="button" class="shp-pill" data-shp="info" data-info="pb" aria-describedby="shp-tip-pb"><span class="shp-pill-label">Competenza</span><strong>+2</strong></button><div class="shp-tip" role="tooltip" id="shp-tip-pb"><strong class="shp-tip-title">Bonus di competenza +2</strong><p>Registrato sulla scheda.</p><small class="shp-source">SRD 5.2.1 · EN 23 / IT 25–26</small></div></div></div></div>`,
    `<div class="stats character-vitals">`,
    `<button type="button" class="stat character-stat-button" data-character-speed="" data-character-action="speeds" aria-label="Movimento: Camminare. Velocità e sensi"><span>Movimento</span><strong>9 <small>m</small></strong><small>Camminare</small></button>`,
    `<button type="button" class="stat character-stat-button" data-character-ac="" data-character-action="ac-detail" aria-label="Classe armatura 13: componenti e modifiche" hidden=""><span>Classe armatura</span><strong>13</strong><small>12 base · Mantello della protezione +1</small></button>`,
    `<button type="button" class="character-inspiration" data-character-action="inspiration" aria-pressed="false" title="Ispirazione eroica: non ce l’hai · clic per segnarla"><span aria-hidden="true">☆</span> Ispirazione eroica</button>`,
    `<div class="stat character-hp"><span>Punti ferita</span><button type="button" class="character-hp-value" data-character-action="hp-correct" aria-haspopup="dialog" aria-label="Punti ferita 18 su 22: temporanei, massimo, registro e correzioni"><strong>18 <small>/ 22</small></strong></button><span class="character-hp-temp">PF temporanei —</span><progress value="18" max="22" aria-label="Punti ferita"></progress>`,
    `<div data-ext-slot="sheet-section:damage-tray-sheet" style="display:contents"><div class="dt-hp is-compact" data-dt-hp="livia" data-dt-surface="sheet"><div class="dt-hp-row" role="group" aria-label="Cura o danno a Livia"><button type="button" class="button dt-heal" data-dt-heal="">Cura</button><input class="dt-amount" data-dt-amount="livia" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="40" aria-label="Punti ferita da togliere o aggiungere" title="Un numero, poi Cura o Danno. Con Invio: -5 danno, +3 cura, =12 imposta, 25-3+2 in catena." placeholder="0" value=""><button type="button" class="button dt-damage" data-dt-damage="">Danno</button></div><p class="dt-status" role="status" data-dt-status=""></p></div></div></div></div></div>`,
  );
const numbers = () => [
  cell({
    name: "Fascia della scheda: caratteristiche, competenza, movimento, ispirazione, punti ferita",
    cls: ".character-band .shp-ability-box .shp-pill .stats.character-vitals .stat .character-hp .dt-hp.is-compact",
    src: "characters.mjs:1048-1060 · sheet-plus.mjs:249, 450, 455 · damage-tray.mjs:679",
    size: "wide",
    html: within(wide(SHEET), band()),
  }),
  cell({
    name: "Riquadri numerici",
    cls: ".stats > .stat (span, strong, small)",
    src: "characters.mjs:973 · 1042, senza pulsante",
    size: "half",
    html: within(
      PAGE,
      `<div class="stats"><div class="stat" data-character-speed><span>Movimento</span><strong>9 <small>m</small></strong><small>Camminare</small></div><div class="stat" data-character-ac><span>Classe armatura</span><strong>13</strong><small>12 base · Mantello della protezione +1</small></div></div>`,
    ),
  }),
];

// ------------------------------------------------------------------ table, empty state

const SRD_IT = "https://media.dndbeyond.com/compendium-images/srd/5.2/IT_SRD_CC_v5.2.1.pdf";
const tableRows = [
  [
    "Afferrare",
    "Parte dell’Attacco",
    "Colpo senz’armi: il bersaglio entro 1,5 m fa un TS su Forza o Destrezza (CD 8 + For + competenza) o è Afferrato. Serve una mano libera.",
    "205, 206",
  ],
  [
    "Spingere",
    "Parte dell’Attacco",
    "Colpo senz’armi: stesso TS; se fallisce lo spingi di 1,5 m o lo fai cadere Prono.",
    "205, 206",
  ],
  [
    "Aiutare",
    "Azione",
    "Vantaggio a un alleato nella prossima prova con un’abilità, o al prossimo attacco di un alleato contro un nemico entro 1,5 m.",
    "203",
  ],
  [
    "Nascondersi",
    "Azione",
    "Destrezza (Furtività) CD 15 fuori vista: sei Invisibile; il totale è la CD per trovarti.",
    "210",
  ],
];
const dataTable = () => [
  cell({
    name: "Tabella con intestazione e righe",
    cls: ".table-wrap > table (thead th, tbody th[scope=row], td)",
    src: "special-moves.mjs:2591 (prime 4 righe di 8)",
    size: "wide",
    html: within(
      [...wide(SHEET_TAB), '<div class="sm-sheet">'],
      h(
        `<div class="table-wrap"><table class="sm-actions-table"><thead><tr><th>Azione</th><th>Tempo</th><th>Regola</th></tr></thead><tbody>`,
        ...tableRows.map(
          ([action, time, rule, pages]) =>
            `<tr><th scope="row">${action}</th><td>${time}</td><td>${rule} <a class="sm-source" href="${SRD_IT}" target="_blank" rel="noopener noreferrer">SRD 5.2.1 IT p. ${pages}</a></td></tr>`,
        ),
        `</tbody></table></div>`,
      ),
    ),
  }),
];
const emptyStates = () => [
  cell({
    name: "Stato vuoto di pagina",
    cls: ".empty-state h1 + .button",
    src: "app.mjs:739",
    html: within(
      PAGE,
      `<div class="empty-state"><h1>Pagina non disponibile per questo ruolo</h1><button class="button" data-nav="home">Torna all’inizio</button></div>`,
    ),
  }),
  cell({
    name: "Stato vuoto di elenco",
    cls: ".empty-state h2 + p",
    src: "campaign-members.mjs:2405",
    html: within(
      PAGE,
      `<div class="empty-state"><h2>Nessuna campagna attiva</h2><p>Crea una campagna o apri il link d’invito che ti ha mandato il DM.</p></div>`,
    ),
  }),
];

// ------------------------------------------------------------------ dialogs, notices

// app.mjs:236 dialog(): the same element and markup, open inline (no modal backdrop).
const dialogHTML = (title, body, footer) =>
  `<dialog id="dialog" aria-labelledby="dialog-title" open><form><div class="dialog-heading"><h2 id="dialog-title">${title}</h2><button type="button" class="icon-button" data-close aria-label="Chiudi">${icon("close")}</button></div><div class="dialog-body">${body}</div><p class="dialog-error error" role="alert" hidden></p><footer>${footer}</footer></form></dialog>`;
const dialogs = () => [
  cell({
    name: "Finestra di conferma",
    cls: "dialog .dialog-heading .dialog-body footer",
    src: "app.mjs:236 · 1159",
    size: "half",
    stage: "dialog",
    html: dialogHTML(
      "Ripristinare l’esempio?",
      `<p>Cancella modifiche, scene e appunti di questa dimostrazione in questo browser.</p>`,
      `<button type="button" class="button" data-close>Annulla</button><button class="button primary" type="submit">Ripristina</button>`,
    ),
  }),
  cell({
    name: "Finestra con menu",
    cls: "dialog .dialog-menu > .button",
    src: "app.mjs:1125-1133",
    size: "half",
    stage: "dialog",
    html: dialogHTML(
      "Apri nell’app",
      h(
        `<div class="dialog-menu">`,
        `<button type="button" class="button" data-jump="home">${icon("home")}Inizio</button>`,
        `<button type="button" class="button" data-jump="characters">${icon("person")}Personaggi</button>`,
        `<button type="button" class="button" data-jump="campaigns">${icon("campaign")}Campagne</button>`,
        `<button type="button" class="button" data-jump="library">${icon("book")}Biblioteca</button></div>`,
      ),
      `<button type="button" class="button" data-close>Resta al Tavolo</button>`,
    ),
  }),
];
const notices = () => [
  cell({
    name: "Avviso",
    cls: "#toast.shown",
    src: "app.mjs:141-147 · 378",
    size: "wide",
    stage: "toast",
    html: `<div id="toast" role="status" aria-live="polite" class="shown">Modifica annullata: nel registro resta come correzione.</div>`,
  }),
  cell({
    name: "Avviso di errore",
    cls: "#toast.shown.error",
    src: "app.mjs:141-147 · 354",
    size: "wide",
    stage: "toast",
    html: `<div id="toast" role="status" aria-live="polite" class="shown error">Riconnettiti prima di correggere lo stato condiviso.</div>`,
  }),
  cell({
    name: "Suggerimento al passaggio",
    cls: ".ui-tip",
    src: "ui.mjs:259-304 (tipElement, placeTip)",
    stage: "tip",
    html: within(
      PAGE,
      h(
        `<button class="icon-button" data-service="notes" aria-label="Appunti personali" data-tip-title="Appunti personali" aria-describedby="ui-tip">${icon("note")}</button>`,
        `<div class="ui-tip" role="tooltip" id="ui-tip" style="left: 16px; top: 66px;">Appunti personali</div>`,
      ),
    ),
  }),
];

// ------------------------------------------------------------------ the Table

// table.mjs:875 (scene plate).
const topline = () =>
  `<div class="table-topline"><div><h1>Il cortile dell’osservatorio</h1><span>Combattimento · Round 1</span></div><div class="toolbar"><button class="button quiet" data-table="rests" data-cmdk-base="" title="Riposi (Y)" aria-keyshortcuts="Y">Riposi</button></div></div>`;
// table.mjs:878-886: the example's order with Doran's turn, so Livia and the Sentinel have
// already acted (no own class: BG3 styles them through :has(~ .current)).
const TURN_ORDER = [
  ["livia", "Livia", false],
  ["goblin-1", "Sentinella", true],
  ["doran", "Doran", false],
  ["goblin-2", "Esploratore", true],
  ["mira", "Mira", false],
];
const initiative = (current) =>
  `<div class="initiative" aria-label="Ordine dei turni">${TURN_ORDER.map(
    ([id, name, hostile]) =>
      `<button class="initiative-token ${id === current ? "current" : ""}" data-select="${id}"><span class="token-dot ${hostile ? "hostile" : ""}">${name[0]}</span><span>${name}${id === current ? `<small>Turno attuale</small>` : ""}</span></button>`,
  ).join("")}</div>`;
// table.mjs:856-873 (party portraits): Livia selected and controlled, Doran with two
// conditions (another player's: no HP bar), Mira controlled at half HP.
const PARTY = [
  { id: "livia", name: "Livia", ours: true, hp: 18, max: 22, selected: true },
  { id: "doran", name: "Doran", ours: false, hp: 26, max: 26, vital: "conditions", count: 2 },
  { id: "mira", name: "Mira", ours: true, hp: 12, max: 24 },
];
const party = () =>
  `<nav class="table-party" aria-label="Gruppo">${PARTY.map((m) => {
    const tone = m.hp === 0 ? " is-down" : m.hp <= m.max / 2 ? " is-low" : "";
    const label = `${m.name}${m.ours ? `, ${m.hp} punti ferita su ${m.max}` : ""}${m.vital ? ", Avvelenato · Prono" : ""}`;
    const badge = m.vital
      ? `<span class="table-party-status" data-party-status="${m.vital}" aria-hidden="true">${m.count}</span>`
      : "";
    return `<button type="button" class="table-party-member${m.selected ? " is-selected" : ""}" data-party-select="${m.id}" aria-pressed="${Boolean(m.selected)}" aria-label="${label}" title="${label}"><span class="table-party-portrait" aria-hidden="true">${m.name[0]}</span>${badge}${m.ours ? `<span class="table-party-hp${tone}" aria-hidden="true"><span style="width:${Math.min(100, (100 * m.hp) / m.max)}%"></span></span>` : ""}<span class="table-party-name" aria-hidden="true">${m.name}</span></button>`;
  }).join("")}</nav>`;

// table.mjs:792 (resources), 1078-1108 hotbarVitals (HP, slots), 822-840 (pages), 842 (bar
// and turn commands); combat-ui.mjs:457, 505 (actions page); quickbar.mjs:133, 152, 264
// (quick bar page). `turn` is the example at the start of Livia's turn; the other state is
// composed from the same templates: Action spent, 4,5 m left, two slots spent, 10/22 HP
// with 5 temporary, the quick bar page open.
function hotbar({ later = false } = {}) {
  const hp = later ? 10 : 18;
  const max = 22;
  const temp = later ? 5 : 0;
  const tone = hp === 0 ? "is-down" : hp <= max / 2 ? "is-low" : "";
  const label = `Punti ferita ${hp} su ${max}${temp ? `, ${temp} temporanei` : ""}. Apri i punti ferita`;
  const slots = later
    ? [
        [1, 4, 2],
        [2, 2, 2],
      ]
    : [
        [1, 4, 1],
        [2, 2, 1],
      ];
  const page = later ? "quickbar" : "actions";
  const tab = (id, text) =>
    `<button type="button" role="tab" id="hotbar-tab-${id}" class="hotbar-page-tab${id === page ? " active" : ""}" data-hotbar-page="${id}" aria-selected="${id === page}" aria-controls="hotbar-panel-${id}" tabindex="${id === page ? 0 : -1}">${text}</button>`;
  const panel = (id, html) =>
    `<div class="hotbar-page" id="hotbar-panel-${id}" data-hotbar-panel="${id}" role="tabpanel" aria-labelledby="hotbar-tab-${id}"${id === page ? "" : " hidden"}>${html}</div>`;
  const action = (id, kind, glyph, name, group) =>
    `<button class="combat-action${group ? " is-group-start" : ""}" data-combat-action="${id}" data-combat-kind="${kind}" aria-pressed="false">${group ? `<span class="combat-group-tag" aria-hidden="true">${group}</span>` : ""}${icon(glyph)}<span>${name}</span><span class="combat-cost combat-cost-action" aria-hidden="true" title="Azione"></span></button>`;
  const slot = (index, id, color, name) =>
    `<button type="button" class="qb-slot qb-c-${color}" data-qb-slot="${id}" data-qb-index="${index}" data-qb-kind="action" data-qb-drag="" data-qb-drop="" tabindex="${index ? -1 : 0}" aria-keyshortcuts="${index + 1}" aria-label="${index + 1}: ${name} · azione della scheda" title="${name} · azione della scheda (${index + 1})\nClic: usa · Maiusc+clic o clic destro: modifica · trascina per spostare"><span class="qb-key" aria-hidden="true">${index + 1}</span><span class="qb-label">${name}</span></button>`;
  const empty = (index) => {
    const key = (index + 1) % 10;
    return `<button type="button" class="qb-slot is-empty" data-qb-empty="" data-qb-index="${index}" data-qb-drop="" tabindex="-1" aria-keyshortcuts="${key}" aria-label="${key}: casella vuota, aggiungi" title="Casella vuota: aggiungi (${key})"><span class="qb-key" aria-hidden="true">${key}</span><span class="qb-plus" aria-hidden="true">+</span></button>`;
  };
  const why = "Una sola pagina: aggiungine un’altra dal menu della barra.";
  return h(
    `<div class="action-dock table-hotbar "><div class="hotbar-identity"><span class="portrait hotbar-portrait" aria-hidden="true">L</span><div><div class="hotbar-name"><strong>Livia</strong>`,
    `<button type="button" class="hotbar-hp ${tone}" data-table="hp" aria-label="${label}" title="${label}"><span class="hotbar-hp-bar" aria-hidden="true"><span style="width:${(100 * hp) / max}%"></span>${temp ? `<span class="hotbar-hp-temp" style="width:${(100 * temp) / max}%"></span>` : ""}</span><span class="hotbar-hp-text" aria-hidden="true"><span class="hotbar-hp-unit">PF </span>${hp}/${max}${temp ? ` +${temp}` : ""}</span></button></div>`,
    `<span>È il tuo turno</span></div></div>`,
    `<div class="hotbar-center"><div class="hotbar-resources">`,
    `<div class="resources" aria-label="Risorse del turno"><span class="${later ? "" : "available"}"><span class="resource-word">Azione</span></span><span class="available"><span class="resource-word">Bonus</span></span><span class="available"><span class="resource-word">Reazione</span></span><span class="available movement"><span class="resource-word">Movimento</span> ${later ? "4,5" : "9"} m</span></div>`,
    `<div class="hotbar-slots" role="img" aria-label="Slot incantesimo: ${slots.map(([level, total, used]) => `livello ${level} ${total - used}/${total}`).join(", ")}">${slots
      .map(
        ([level, total, used]) =>
          `<span class="hotbar-slot-level" aria-hidden="true"><small>${level}</small>${Array.from({ length: total }, (_, i) => `<i class="${i < total - used ? "is-full" : ""}"></i>`).join("")}</span>`,
      )
      .join("")}</div></div>`,
    `<div class="hotbar-pages" role="tablist" aria-label="Pagine della barra">${tab("actions", "Azioni")}${tab("quickbar", "Barra rapida")}</div>`,
    panel(
      "actions",
      h(
        `<section class="combat-bar" aria-label="Azioni disponibili"><div class="combat-bar-heading"><strong>Azioni</strong><label>Dadi <select data-combat-mode="" aria-label="Modalità dei dadi dell’azione"><option value="digital" selected="">Digitali</option><option value="physical">Fisici</option></select></label><button class="text-button" data-combat-requests="">${icon("bell")} Tiri e risultati</button></div>`,
        `<div class="combat-actions"><span class="combat-filters" role="group" aria-label="Filtra per costo"><button type="button" class="combat-filter" data-combat-filter="reaction" aria-pressed="false" aria-label="Reazioni" title="Reazioni"><span class="combat-cost combat-cost-reaction" aria-hidden="true"></span></button></span>`,
        `<span class="combat-group" role="group" aria-label="Armi">${action("quarterstaff", "attack", "sword", "Bastone ferrato", "Armi")}</span>`,
        `<span class="combat-group" role="group" aria-label="Incantesimi">${action("magic-missile", "multi", "book", "Dardo incantato", "Incantesimi")}${action("burning-hands", "area", "book", "Mani brucianti")}${action("fire-bolt", "attack", "sword", "Dardo di fuoco")}</span>`,
        `<span class="combat-group" role="group" aria-label="Comuni">${action("dash", "self", "dice", "Scatto", "Comuni")}${action("dodge", "self", "dice", "Schivata")}${action("disengage", "self", "dice", "Disimpegno")}</span></div>`,
        `<div class="combat-dock"><div data-ext-slot="table-panel:special-moves" style="display:contents"><button type="button" class="button sm-dock-toggle" data-sm-tray="" aria-expanded="false" aria-controls="sm-tray" aria-label="Mosse speciali" title="Mosse speciali: salti, prese, lanci, azioni generiche"><svg class="icon sm-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 19c2.5-9 8-12 11-12s5 2 7 6M17 9l4 4-5 1M3 21h6M9 3h6"></path></svg> <span class="dock-text">Mosse</span></button></div></div></section>`,
      ),
    ),
    panel(
      "quickbar",
      h(
        `<div data-ext-slot="table-panel:sheet-plus-favourites" style="display:contents"></div><div data-ext-slot="table-panel:quickbar" style="display:contents"><section class="qb" data-qb="" data-qb-actor="livia" data-qb-page-index="0" aria-label="Barra rapida di Livia"><div class="qb-row">`,
        `<div class="qb-pages" role="group" aria-label="Pagine della barra"><button type="button" class="qb-icon" data-qb-page="prev" aria-label="Pagina precedente" disabled="" aria-describedby="qb-why-one-page" title="${why}">‹</button><button type="button" class="qb-page-name" data-qb-menu="" aria-haspopup="dialog" aria-label="Pagina 1 di 1: Combattimento. Opzioni della barra" title="Combattimento"><span class="qb-page-num">1/1</span><span class="qb-page-label">Combattimento</span></button><button type="button" class="qb-icon" data-qb-page="next" aria-label="Pagina successiva" disabled="" aria-describedby="qb-why-one-page" title="${why}">›</button><span class="visually-hidden" id="qb-why-one-page">${why}</span></div>`,
        `<div class="qb-slots" role="toolbar" aria-label="Caselle 1–0 della pagina Combattimento" data-qb-slots="">${slot(0, "qb-livia-fire-bolt", "red", "Dardo di fuoco")}${slot(1, "qb-livia-missile", "purple", "Dardo incantato")}${slot(2, "qb-livia-staff", "grey", "Bastone ferrato")}${[3, 4, 5, 6, 7, 8, 9].map(empty).join("")}</div>`,
        `<div class="qb-tools"><button type="button" class="qb-icon" data-qb-add="" aria-label="Aggiungi alla barra" title="Aggiungi alla barra">${icon("plus")}</button><button type="button" class="qb-icon" data-qb-items="" aria-haspopup="dialog" aria-label="Usa un oggetto (2)" title="Usa un oggetto (2)">${icon("bag")}</button><button type="button" class="qb-icon" data-qb-edit="" aria-pressed="false" aria-label="Personalizza la barra" title="Personalizza la barra">${icon("pen")}</button><label class="qb-select"><select data-qb-dice="" aria-label="Dadi della barra rapida"><option value="digital" selected="">Dadi digitali</option><option value="physical">Dadi fisici</option></select></label><label class="qb-select"><span>d20</span><select data-qb-d20="" aria-label="Modalità del d20"><option value="normal" selected="">Normale</option><option value="advantage">Vantaggio</option><option value="disadvantage">Svantaggio</option></select></label><button type="button" class="qb-icon" data-qb-menu="" aria-haspopup="dialog" aria-label="Opzioni della barra rapida" title="Opzioni della barra rapida">${icon("menu")}</button></div></div></section></div>`,
      ),
    ),
    `</div>`,
    `<div class="toolbar"><button class="button active" data-tool="move" title="Muovi">${icon("move")} <span class="dock-text">Muovi</span></button><button class="button" data-table="actions" title="Azioni della scheda">${icon("sword")} <span class="dock-text">Azioni della scheda</span></button><button class="button" title="Tira i dadi" data-table="dice">${icon("dice")} <span class="dock-text">Tira i dadi</span></button><button class="button quiet" title="Esc · Annulla preparazione" data-table="cancel">${icon("close")} <span class="dock-text">Esc · Annulla preparazione</span></button><button class="button quiet" title="Annulla ultima modifica" data-table="undo">${icon("undo")} <span class="dock-text">Annulla ultima modifica</span></button><button class="button primary" data-table="end-turn" data-cmdk-base="">Termina turno</button></div></div>`,
  );
}

// table.mjs:888-909 (map, grid, tokens), preparation.mjs:449 renderSceneBase (ground and the
// template structures that the sample map replaces under a direction). Tokens as the
// Player sees them: Livia selected with her HP bar, Doran with two conditions, Mira at half
// HP, the Sentinel hostile with one condition, the Scout hostile and dead.
const TOKENS = [
  { id: "livia", name: "Livia", x: 250, y: 380, ours: true, hp: 18, max: 22, selected: true },
  { id: "doran", name: "Doran", x: 350, y: 450, status: ["conditions", "Avvelenato · Prono", 2] },
  { id: "mira", name: "Mira", x: 150, y: 450, ours: true, hp: 12, max: 24 },
  {
    id: "goblin-1",
    name: "Sentinella",
    x: 620,
    y: 250,
    hostile: true,
    status: ["conditions", "Afferrato", 1],
  },
  { id: "goblin-2", name: "Esploratore", x: 740, y: 340, hostile: true, status: ["dead", "Morto"] },
];
const token = (a) => {
  const [vital, text, count] = a.status ?? [];
  return h(
    `<g class="map-token ${a.hostile ? "hostile" : ""} ${a.selected ? "selected" : ""} ${vital === "dead" ? "is-dead" : ""}" data-actor="${a.id}" transform="translate(${a.x},${a.y})" tabindex="0" role="button" aria-label="${a.name}${a.ours ? ", " + a.hp + " punti ferita" : ""}${text ? ", " + text : ""}">`,
    `<circle class="token-hit" r="23"/><g class="token-display" ${vital === "dead" ? 'opacity="0.55"' : ""}><circle r="23"/><circle r="28" class="selection-ring"/><text y="6" text-anchor="middle">${a.name[0]}</text><text class="token-name" y="44" text-anchor="middle">${a.name}</text>`,
    a.ours
      ? `<rect x="-22" y="29" width="44" height="4" rx="2" fill="#111b25"/><rect x="-22" y="29" width="${(44 * a.hp) / a.max}" height="4" rx="2" fill="#8fb48a"/>`
      : "",
    vital
      ? `<g class="token-status" data-token-status="${vital}" transform="translate(21,-21)"><title>${text}</title><circle r="10" fill="${vital === "conditions" ? "#142733" : "#5b1f22"}" stroke="#e2c17b" stroke-width="1.5"/><text y="4" text-anchor="middle" font-size="12" fill="#f4e4bf">${{ dead: "✝", dying: "♥", stable: "✚" }[vital] ?? count}</text></g>`
      : "",
    text && a.selected
      ? `<text class="token-status-label" y="-36" text-anchor="middle" font-size="13" fill="#f4e4bf" stroke="#111b25" stroke-width="3" paint-order="stroke">${text}</text>`
      : "",
    `</g></g>`,
  );
};
const battleMap = () =>
  h(
    `<svg id="battle-map" viewBox="100 190 720 320" data-mode="move" role="application" aria-label="Mappa. Tab fino a una pedina, frecce per prepararne il movimento, Invio per eseguire, Esc per annullare; + e − per lo zoom." tabindex="0">`,
    `<defs><pattern id="map-grid" x="0" y="0" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 H0 V50" fill="none" stroke="#d9c79c" stroke-opacity=".15" stroke-width="1"/></pattern></defs>`,
    `<rect width="1000" height="650" fill="#34413b"/><svg width="1000" height="650" viewBox="0 0 1000 650" preserveAspectRatio="none"><path d="M90 70H910V580H90Z" fill="#555c55" stroke="#b0aa8b" stroke-width="18"/><path d="M340 70V200H90 M660 580V450H910" fill="none" stroke="#b0aa8b" stroke-width="15"/><circle cx="500" cy="325" r="72" fill="#344c50" stroke="#a4a58b" stroke-width="13"/><path d="M460 325h80M500 285v80" stroke="#7a948b" stroke-width="5"/></svg>`,
    `<rect width="1000" height="650" fill="url(#map-grid)"/>`,
    `<g id="tokens">${TOKENS.map(token).join("")}</g></svg>`,
  );
// table.mjs:612 and 888 (tool groups; only the open group's tools shown) and 914 (zoom).
const mapTools = () =>
  h(
    `<div class="map-toolbar" id="map-toolbar" role="toolbar" aria-label="Strumenti mappa">`,
    `<button type="button" class="map-tool map-tools-toggle" data-map-tools-toggle="" aria-expanded="true" aria-controls="map-toolbar" aria-label="Strumenti della mappa" title="Strumenti della mappa">${icon("move")}</button>`,
    `<div class="map-tool-cluster"><button type="button" class="map-tool map-tool-group active" data-tool-group="select" aria-pressed="true" aria-expanded="true" aria-controls="map-tools-select" title="Seleziona e muovi" aria-label="Seleziona e muovi">${icon("move")}</button>`,
    `<div class="map-subtools" id="map-tools-select" data-tool-group-tools="select" role="group" aria-label="Seleziona e muovi"><button class="map-tool active" data-tool="move" aria-pressed="true" title="Muovi" aria-label="Muovi">${icon("move")}</button><button class="map-tool " data-tool="plan" aria-pressed="false" title="Pianifica percorso" aria-label="Pianifica percorso">${icon("note")}</button><button class="map-tool " data-tool="pan" aria-pressed="false" title="Sposta vista" aria-label="Sposta vista">${icon("map")}</button><button class="map-tool " data-tool="token-menu-select" aria-pressed="false" title="Seleziona più pedine (V)" aria-label="Seleziona più pedine" data-cmdk-base="Seleziona più pedine" aria-keyshortcuts="V">${icon("check")}</button></div></div>`,
    `<div class="map-tool-cluster"><button type="button" class="map-tool map-tool-group " data-tool-group="measure" aria-pressed="false" aria-expanded="false" aria-controls="map-tools-measure" title="Misura e sagome" aria-label="Misura e sagome">${icon("ruler")}</button><div class="map-subtools" id="map-tools-measure" data-tool-group-tools="measure" role="group" aria-label="Misura e sagome" hidden=""><button class="map-tool " data-tool="measure" aria-pressed="false" title="Misura (R)" aria-label="Misura" data-cmdk-base="Misura" aria-keyshortcuts="R">${icon("ruler")}</button></div></div>`,
    `<button class="map-tool " data-tool="annotations-draw" aria-pressed="false" title="Disegna" aria-label="Disegna" data-cmdk-base="Disegna">${icon("pen")}</button>`,
    `<button class="map-tool " data-tool="pointer" aria-pressed="false" title="Puntatore (X)" aria-label="Puntatore" data-cmdk-base="Puntatore" aria-keyshortcuts="X">${icon("flag")}</button></div>`,
  );
const mapZoom = () =>
  h(
    `<div class="map-zoom" role="group" aria-label="Vista della mappa">`,
    `<button class="map-tool" data-table="find-token" data-find-actor="livia" aria-label="Trova la mia pedina" title="Trova la mia pedina"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.2"></circle><path d="M6.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5"></path><circle cx="12" cy="12" r="10" stroke-dasharray="3 3"></circle></svg></button>`,
    `<button class="map-tool" data-table="zoom-in" aria-label="Ingrandisci" aria-keyshortcuts="+" title="Ingrandisci (+ · rotellina)">+</button><button class="map-tool" data-table="zoom-out" aria-label="Riduci" aria-keyshortcuts="-" title="Riduci (− · rotellina)">−</button>`,
    `<button class="map-tool" data-table="fit" aria-label="Centra la scena" title="Centra la scena"><svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="7"></circle><circle cx="12" cy="12" r="2.5"></circle><path d="M12 2v3M12 19v3M2 12h3M19 12h3"></path></svg></button></div>`,
  );

// conditions-ui.mjs:2155-2181 (embedded summary) and 2122-2132 (quick add, Exhaustion):
// Livia concentrating on Benedizione, Poisoned, Prone and Exhaustion 2, as her controller
// sees her (composto: the example has no condition).
const EXHAUSTION = 2;
const conditions = () =>
  h(
    `<div class="conditions-summary embedded" data-conditions-summary="livia"><span class="conditions-vital" data-vital="conscious">Cosciente</span>`,
    `<ul class="conditions-chips" aria-label="Condizioni attive">`,
    `<li class="conditions-chip is-concentration" data-conditions-chip="concentration" title="Concentrazione">(C) Benedizione <button type="button" class="conditions-chip-end" data-conditions-end-concentration="livia" aria-label="Termina la concentrazione su Benedizione">×</button></li>`,
    ...[
      ["poisoned", "Avvelenato"],
      ["prone", "Prono"],
    ].map(
      ([id, name]) =>
        `<li class="conditions-chip" data-conditions-chip="${id}"><button type="button" class="conditions-chip-manage" data-conditions-chip-manage="livia" aria-haspopup="dialog" title="Gestisci o togli la condizione" aria-label="${name}: gestisci o togli">${name}</button></li>`,
    ),
    `<li class="conditions-chip" data-conditions-chip="exhaustion">Indebolimento<span class="conditions-count"> ${EXHAUSTION}</span></li></ul>`,
    `<div class="conditions-quick"><button type="button" class="button quiet conditions-quick-add" data-conditions-quick-add="livia" aria-haspopup="dialog">+ Condizione</button><div class="conditions-exhaustion" role="group" aria-label="Indebolimento"><span class="conditions-exhaustion-label">Indebolimento</span><span class="conditions-segments">`,
    ...[1, 2, 3, 4, 5, 6].map(
      (n) =>
        `<button type="button" class="conditions-segment${n <= EXHAUSTION ? " filled" : ""}" data-conditions-exhaustion-level="${n}" data-conditions-exhaustion-actor="livia" aria-pressed="${n === EXHAUSTION}" aria-label="Indebolimento livello ${n}${n === EXHAUSTION ? " (attuale: clic per scendere)" : ""}" title="${n === 6 ? "Livello 6: la creatura muore." : `Livello ${n}: −${2 * n} alle prove con d20 · Velocità −${String(1.5 * n).replace(".", ",")} m`}">${n}</button>`,
    ),
    `</span></div><p class="conditions-effect muted">Livello ${EXHAUSTION}: −${2 * EXHAUSTION} alle prove con d20 · Velocità −${String(1.5 * EXHAUSTION).replace(".", ",")} m</p></div>`,
    `<button type="button" class="button" data-conditions-entry="livia">Danni, cure e condizioni</button></div>`,
  );
// table.mjs:716-757 (sidebar panel: sub-tabs, inspector), 916 (rail); the DM's view of the
// Creature panel, with Livia selected.
const sidebar = () =>
  h(
    `<div class="table-sidebar-panel" id="table-sidebar-panel" role="tabpanel" aria-labelledby="table-subtab-creature" data-table-panel="creature" data-table-section="creature">`,
    `<div class="table-subtabs" role="tablist" aria-label="Creatura"><button type="button" role="tab" id="table-subtab-creature" class="table-subtab active" data-table-subtab="creature" aria-selected="true" aria-expanded="true" aria-controls="table-sidebar-panel" tabindex="0"><span>Creatura</span></button><button type="button" role="tab" id="table-subtab-party" class="table-subtab" data-table-subtab="party" data-table-drawer="party" data-table-tab="party" aria-selected="false" aria-expanded="false" aria-controls="table-sidebar-panel" tabindex="-1">${icon("person")}<span>Riepilogo del gruppo</span></button></div>`,
    `<div class="table-inspector"><div class="inspector-person"><span class="portrait">L</span><div><h2>Livia</h2><span class="muted">Sotto il tuo controllo</span></div><span class="inspector-ac"><small>CA</small><strong>13</strong></span></div>`,
    `<div class="inspector-quick"><button type="button" class="button quiet" data-table="last-move" aria-pressed="false" aria-keyshortcuts="Shift+X">${icon("undo")} Ultima mossa <kbd>Maiusc+X</kbd></button></div>`,
    conditions(),
    `<div class="inspector-buttons"><button class="button" data-table="sheet">${icon("book")} Scheda completa</button><button class="button" data-table="inventory">${icon("bag")} Inventario</button><button class="button" data-table="rest">Riposa</button></div></div></div>`,
    rail(),
  );
const RAIL_TABS = [
  ["chat", "Chat", "chat"],
  ["combat", "Combattimento", "swords"],
  ["scene", "Scena", "map"],
  ["exploration", "Esplorazione", "light"],
  ["journal", "Documenti", "scroll"],
  ["tables", "Tabelle e mazzi", "cards"],
  ["reference", "Consultazione", "book"],
];
const rail = () =>
  h(
    `<div class="table-sidebar-rail">`,
    `<button type="button" class="table-sidebar-toggle" data-table-sidebar="toggle" aria-expanded="true" aria-controls="table-sidebar-panel" aria-label="Comprimi il pannello laterale" title="Comprimi il pannello laterale">${icon("panel")}</button>`,
    `<button type="button" class="table-map-link" data-table-map-link="" aria-label="Vai alla mappa">${icon("map")}<span class="table-tab-label" aria-hidden="true">Mappa</span></button>`,
    `<button type="button" class="table-panels-all" data-table-panels="" aria-haspopup="dialog" aria-label="Tutti i pannelli" title="Tutti i pannelli">${icon("grid")}<span class="table-tab-label" aria-hidden="true">Tutti</span></button>`,
    `<div class="table-tabs" role="tablist" aria-label="Pannelli del Tavolo" aria-orientation="vertical">`,
    `<button type="button" role="tab" id="table-tab-creature" class="table-tab active" data-table-section="creature" data-table-tab="creature" aria-selected="true" aria-expanded="true" aria-controls="table-sidebar-panel" tabindex="0" aria-label="Creatura: Livia" title="Creatura: Livia"><span class="table-tab-portrait" aria-hidden="true">L</span><span class="table-tab-label" aria-hidden="true">Creatura</span></button>`,
    ...RAIL_TABS.map(
      ([id, name, glyph]) =>
        `<button type="button" role="tab" id="table-tab-${id}" class="table-tab" data-table-section="${id}" data-table-tab="${id}" aria-selected="false" aria-expanded="false" aria-controls="table-sidebar-panel" tabindex="-1" aria-label="${name}" title="${name}">${icon(glyph)}<span class="table-tab-label" aria-hidden="true">${name}</span></button>`,
    ),
    `</div></div>`,
  );
// hp-widget.mjs:400-431 (full widget, surface "token") inside table.mjs:761 (an area panel).
const DAMAGE_TYPES = [
  ["acid", "Acido"],
  ["bludgeoning", "Contundente"],
  ["cold", "Freddo"],
  ["fire", "Fuoco"],
  ["force", "Forza"],
  ["lightning", "Fulmine"],
  ["necrotic", "Necrotico"],
  ["piercing", "Perforante"],
  ["poison", "Veleno"],
  ["psychic", "Psichico"],
  ["radiant", "Radioso"],
  ["slashing", "Tagliente"],
  ["thunder", "Tuono"],
];
const defenseSet = (key, legend) =>
  `<fieldset class="dt-type-grid"><legend>${legend}</legend>${DAMAGE_TYPES.map(([id, name]) => `<label><input type="checkbox" data-dt-def="${key}" value="${id}"> ${name}</label>`).join("")}</fieldset>`;
const hpWidget = () =>
  h(
    `<section class="table-ext-panel"><h3>Punti ferita</h3><div data-ext-slot="table-panel:damage-tray-hp" style="display:contents"><div class="dt-hp" data-dt-hp="livia" data-dt-surface="token">`,
    `<p class="dt-hp-numbers"><span class="dt-hp-current"><strong data-dt-hp-value="">18</strong> / <span data-dt-hp-max="">22</span> PF</span> </p><div class="dt-bar" aria-hidden="true"><span style="width:81.81818181818181%"></span></div>`,
    `<div class="dt-hp-row" role="group" aria-label="Cura o danno a Livia"><button type="button" class="button dt-heal" data-dt-heal="">Cura</button><input class="dt-amount" data-dt-amount="livia" type="text" inputmode="numeric" autocomplete="off" spellcheck="false" maxlength="40" aria-label="Punti ferita da togliere o aggiungere" title="Un numero, poi Cura o Danno. Con Invio: -5 danno, +3 cura, =12 imposta, 25-3+2 in catena." placeholder="0" value=""><button type="button" class="button dt-damage" data-dt-damage="">Danno</button></div>`,
    `<label class="field dt-type">Tipo di danno<select data-dt-type="hp:livia" data-dt-actor="livia"><option value="">Senza tipo</option>${DAMAGE_TYPES.map(([id, name]) => `<option value="${id}">${name}</option>`).join("")}</select></label>`,
    `<div class="dt-field-row dt-cause"><label class="field dt-grow">Causa (facoltativa, resta nel registro)<input data-dt-note="livia" maxlength="200" autocomplete="off" value="" placeholder="per esempio: trappola a dardi"></label><label class="check-field dt-critical"><input type="checkbox" data-dt-critical="livia"> Colpo critico (a 0 PF conta due fallimenti)</label></div>`,
    `<p class="dt-status" role="status" data-dt-status=""></p>`,
    `<details class="dt-more dt-correct" data-dt-details="correct"><summary>Correggi i punti ferita</summary><div class="dt-more-body"><p class="muted">Per un errore di conteggio: non è danno né cura. Il motivo resta nel registro PF, con Annulla.</p><div class="dt-field-row"><label class="field">PF attuali<input data-dt-fix="hp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="18"></label><label class="field">PF massimi<input data-dt-fix="maxHp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="22"></label><label class="field">PF temporanei<input data-dt-fix="tempHp" type="text" inputmode="numeric" autocomplete="off" maxlength="40" value="0"></label></div><label class="field">Motivo della correzione (obbligatorio)<input data-dt-fix="reason" maxlength="200" autocomplete="off" value="" placeholder="per esempio: avevo contato male la trappola"></label><button type="button" class="button" data-dt-fix-apply="">Correggi</button></div></details>`,
    `<details class="dt-more" data-dt-details="temp"><summary>PF temporanei e massimo</summary><div class="dt-more-body"><div class="dt-field-row"><label class="field">PF temporanei<input data-dt-temp="" type="number" min="0" max="9999" step="1" inputmode="numeric" value="" placeholder="0"></label><button type="button" class="button" data-dt-temp-set="">Imposta</button></div><p class="muted dt-rule">Assorbono i danni per primi; la cura non li aggiunge né li ripristina (SRD EN 18 / IT 20).</p><p class="dt-max-line">Massimo: <strong data-dt-max-value="">22</strong></p><div class="dt-field-row"><label class="field">Massimo ±<input data-dt-max-delta="" type="number" step="1" inputmode="numeric" placeholder="+5 / -3"></label><label class="field dt-grow">Nota (obbligatoria)<input data-dt-max-note="" maxlength="200" autocomplete="off" placeholder="per esempio Aiuto, 2° livello"></label><button type="button" class="button" data-dt-max-apply="">Applica al massimo</button></div></div></details>`,
    `<details class="dt-more" data-dt-details="log"><summary>Registro PF (0)</summary><p class="muted">Nessun cambio dei PF registrato.</p></details>`,
    `<details class="dt-more" data-dt-details="defenses"><summary>Difese ai danni</summary><div class="dt-more-body"><p data-dt-defenses="">Nessuna difesa ai danni registrata.</p>${defenseSet("resistances", "Resistenze")}${defenseSet("immunities", "Immunità")}${defenseSet("vulnerabilities", "Vulnerabilità")}<label class="field">Nota o fonte<input data-dt-def-note="" maxlength="200" value=""></label><div class="toolbar"><button type="button" class="button" data-dt-def-save="">Salva le difese</button></div><p class="muted dt-rule">Resistenza dimezza, vulnerabilità raddoppia, immunità annulla; più resistenze contano una volta (SRD EN 17 / IT 19).</p></div></details>`,
    `</div></div></section>`,
  );

const table = () => [
  cell({
    name: "Targa della scena",
    cls: ".table-layout > .table-topline",
    src: "table.mjs:875",
    size: "wide",
    html: within(TABLE, topline()),
  }),
  cell({
    name: "Ordine dei turni: già agito, turno attuale, alleati, nemici",
    cls: ".initiative > .initiative-token(.current) > .token-dot(.hostile)",
    src: "table.mjs:878-886 (turno di Doran, composto)",
    size: "half",
    stage: "initiative",
    html: within(TABLE, initiative("doran")),
  }),
  cell({
    name: "Barra rapida in combattimento con ritratti del gruppo",
    cls: ".action-dock.table-hotbar (.hotbar-identity, .hotbar-resources .resources, .hotbar-slots, .hotbar-pages, .combat-action, .toolbar [data-table=end-turn]) · nav.table-party",
    src: "table.mjs:792-842 · 856-873 · combat-ui.mjs:457, 505",
    size: "wide",
    stage: "hud",
    html: within(TABLE, h(partyBeside(), hotbar())),
  }),
  cell({
    name: "Barra rapida più avanti nel turno: azione spesa, slot usati, PF bassi e temporanei, pagina «Barra rapida»",
    cls: ".resources > span:not(.available) · .hotbar-slot-level i · .hotbar-hp.is-low .hotbar-hp-temp · .qb-slot",
    src: "table.mjs:792-842 · 1078-1108 · quickbar.mjs:133, 152, 264 (composto)",
    size: "wide",
    stage: "hud",
    html: within(TABLE, h(partyBeside(), hotbar({ later: true }))),
  }),
  cell({
    name: "Mappa con pedine: selezionata con barra PF, alleati, nemici, condizioni, caduto (sul telefono con i ritratti del gruppo)",
    cls: "svg#battle-map g.map-token(.hostile)(.selected)(.is-dead) .token-display .selection-ring .token-status",
    src: "table.mjs:888-909 · preparation.mjs:449 (stati delle pedine composti)",
    size: "wide",
    stage: "map",
    html: within(TABLE_STAGE, h(partyOver(), within(['<div class="map-container">'], battleMap()))),
  }),
  cell({
    name: "Strumenti della mappa e zoom",
    cls: ".map-toolbar .map-tool-group.active .map-subtools .map-tool.active · .map-zoom",
    src: "table.mjs:612, 888 · 914",
    stage: "tools",
    html: within(
      TABLE,
      h(
        within(['<div class="table-stage">'], mapTools()),
        within(['<div class="table-stage">', '<div class="map-container">'], mapZoom()),
      ),
    ),
  }),
  cell({
    name: "Pannello laterale «Creatura» e barra delle linguette: pillole, scheda creatura, CA, condizioni, indebolimento",
    cls: ".table-sidebar-panel .table-subtab · .inspector-person .inspector-ac · .conditions-chip · .conditions-segment · .table-sidebar-rail .table-tab",
    src: "table.mjs:716-757 · 916 · conditions-ui.mjs:2122-2181 (condizioni composte)",
    size: "half",
    stage: "sidebar",
    html: within(TABLE, sidebar()),
  }),
  cell({
    name: "Widget dei punti ferita",
    cls: ".table-ext-panel .dt-hp (.dt-hp-numbers, .dt-bar, .dt-hp-row, .dt-more)",
    src: "hp-widget.mjs:400-431 · damage-tray.mjs:615 · table.mjs:761",
    stage: "column",
    html: within(TABLE_INSPECTOR, hpWidget()),
  }),
];

// ------------------------------------------------------------------ page

function masthead(report) {
  const id = activeDirection();
  const label = id
    ? DIRECTIONS.find((d) => d.id === id)?.label
    : directionMode()
      ? "Attuale (modalità direzione)"
      : "nessuna (app senza direzione)";
  // Round 2: the applied variants (the loader's data-variant), named only when there are some.
  const variant = document.documentElement.dataset.variant;
  const variants = variant
    ? ` · varianti <strong>${esc(variant.split(" ").join(" + "))}</strong>`
    : "";
  const missing = report.missing.length;
  const problems = [
    report.drift ? "i fogli statici non corrispondono più a index.html" : "",
    missing ? `${missing} fogli non caricati: ${report.missing.join(", ")}` : "",
  ].filter(Boolean);
  const status = problems.length
    ? `Attenzione: ${problems.join("; ")}.`
    : `${report.app.length} fogli dell’app caricati nello stesso ordine dell’app${report.direction.length ? `, poi ${report.direction.length} della direzione` : ""}.`;
  return h(
    `<header class="specimen-masthead">`,
    `<div class="specimen-masthead-title" role="heading" aria-level="1">Campionario dei componenti</div>`,
    `<div>Direzione: <strong>${esc(label)}</strong>${variants} · <span class="specimen-code">?direction=off | current | ${DIRECTIONS.map((d) => d.id).join(" | ")}</span></div>`,
    `<div class="specimen-masthead-status${report.drift || missing ? " is-warning" : ""}">${esc(status)}</div>`,
    `<div>Ogni riquadro mostra un componente con il markup reale dell’app, nel suo contesto (Inizio, Scheda, Tavolo), sullo sfondo della pagina: sotto, il nome, la classe e il file che lo disegna. «composto» indica uno stato che l’esempio non raggiunge, scritto con lo stesso modello del modulo.</div>`,
    `</header>`,
  );
}

function render(report) {
  return h(
    masthead(report),
    section(
      "brand",
      "Marchio",
      "Il dado d20 e la scritta «d20 Studio» della direzione (I-251): nella testata a 1× e 2×, il dado da solo da 16 a 160 px sullo sfondo della pagina e su un riquadro chiaro, l’icona della scheda del browser e il marchio completo a 3×.",
      brandCells(),
    ),
    section("type", "Tipografia", "", typography()),
    section(
      "header",
      "Intestazione e navigazione",
      "La barra delle pagine (Inizio) e quella del Tavolo; collegamenti principali e icone dei servizi.",
      [
        cell({
          name: "Intestazione con collegamenti (Inizio attivo)",
          cls: "header.app-header .brand .nav-link.active .service-nav .icon-button",
          src: "app.mjs:759 · 609 · 635 · ui.mjs:94",
          size: "wide",
          stage: "flush",
          html: headerHome(),
        }),
        cell({
          name: "Intestazione del Tavolo",
          cls: "header.app-header.table-header .button.quiet",
          src: "app.mjs:759",
          size: "wide",
          stage: "flush",
          html: headerTable(),
        }),
      ],
    ),
    section(
      "buttons",
      "Pulsanti",
      "Le stesse varianti in ogni superficie, senza e con icona: una direzione può vestirle ovunque o solo dentro una superficie.",
      [...buttons(), rowTitle("Pulsanti icona e testo"), ...iconButtons()],
      "compact",
    ),
    section("fields", "Campi dei moduli", "", fields()),
    section("tabs", "Schede (linguette)", "", tabs()),
    section("badges", "Etichette", "", badges()),
    section("panels", "Pannelli e schede", "", panels()),
    section("numbers", "Riquadri numerici", "", numbers()),
    section("table-data", "Tabella", "", dataTable()),
    section("empty", "Stato vuoto", "", emptyStates()),
    section(
      "dialogs",
      "Finestre di dialogo",
      "Aperte nella pagina (attributo open): manca solo lo sfondo scurito della finestra modale.",
      dialogs(),
    ),
    section("notices", "Avvisi e suggerimenti", "", notices()),
    section(
      "table",
      "Tavolo",
      "Ogni pezzo nel contesto del Tavolo (.table-layout), con la stessa geometria dell’app: la barra rapida in basso, i ritratti del gruppo in basso a sinistra, il pannello laterale nella sua colonna di 340 px.",
      table(),
    ),
  );
}

// Room for what the app positions: an inline dialog is absolute (it takes no room), the
// sidebar panel and rail have contain: size (the panel's own scroll box sets their height).
function fitStages() {
  for (const stage of document.querySelectorAll(".specimen-stage.is-dialog")) {
    const dialog = stage.querySelector("dialog");
    if (dialog) stage.style.minHeight = `${dialog.offsetHeight + 32}px`;
  }
  const wide = globalThis.matchMedia?.("(min-width: 721px)").matches;
  for (const stage of document.querySelectorAll(".specimen-stage.is-sidebar")) {
    stage.style.height = "";
    if (!wide) continue;
    const panel = stage.querySelector(".table-sidebar-panel");
    const height = [...(panel?.children ?? [])].reduce((sum, el) => sum + el.scrollHeight, 0);
    stage.style.height = `${Math.ceil(height) + 2}px`;
  }
}

async function boot() {
  const root = document.querySelector("#specimen");
  if (!LOOPBACK.includes(globalThis.location?.hostname)) {
    root.innerHTML = `<div class="specimen-loading" role="status">Il campionario è solo per lo sviluppo: aprilo su 127.0.0.1, localhost o [::1].</div>`;
    return;
  }
  await injectStyles();
  await addIconLink();
  // The app's loader, unchanged: ?direction=<id>|current|off, the key, then apply (sheets,
  // sprite, data-direction, icon and logo overrides, favicon). It appends the direction sheets
  // after ours.
  await startDirection();
  favicon.now = document.head.querySelector('link[rel="icon"]')?.getAttribute("href") ?? null;
  const report = await checkSheets();
  root.innerHTML = render(report);
  await document.fonts?.ready;
  fitStages();
  globalThis.addEventListener("resize", fitStages);
  globalThis.matchMedia?.(PHONE).addEventListener?.("change", () => {
    root.innerHTML = render(report);
    fitStages();
  });
  const result = {
    direction: activeDirection(),
    directionMode: directionMode(),
    variant: document.documentElement.dataset.variant ?? null,
    ...report,
  };
  globalThis.specimenReport = result;
  if (report.drift || report.missing.length)
    globalThis.console?.warn("Specimen stylesheets: see specimenReport", result);
  root.dataset.ready = "true";
}

await boot();
