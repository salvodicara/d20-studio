// Loader for every planned blueprint area (B11). Each area owns one entry module next to
// this file that exports a synchronous register(registry). The full plan is listed here
// once, so builders never edit this file: a module that does not exist yet is reported as
// "not-built", a module that exists but fails to import or register as "failed".

const area = (id, backlog, it, en) =>
  Object.freeze({ id, backlog, title: Object.freeze({ it, en }) });

export const PLANNED_EXTENSIONS = Object.freeze([
  area(
    "token-menu",
    "B12",
    "Tavolo: menu della pedina, selezione e visibilità",
    "Table: token menu, selection and visibility",
  ),
  area(
    "campaign-members",
    "B13",
    "Campagne: creazione, inviti, ingresso e membri",
    "Campaigns: creation, invitations, joining and members",
  ),
  area(
    "session-view",
    "B14",
    "Tavolo: presentazione, stato della sessione e presenza",
    "Table: presentation, session state and presence",
  ),
  area(
    "handouts",
    "B15",
    "Materiali, handout, spilli e scena senza mappa",
    "Materials, handouts, pins and map-less scenes",
  ),
  area(
    "compendium",
    "B16",
    "Biblioteca: compendio, lettore, glossario, attribuzione",
    "Library: compendium, reader, glossary, attribution",
  ),
  area("chat", "B17", "Tavolo: chat, messaggi e archivio", "Table: chat, messages and archive"),
  area(
    "annotations",
    "B18",
    "Tavolo: annotazioni, sagome persistenti, misura estesa e segnali",
    "Table: annotations, persistent templates, extended measuring and pings",
  ),
  area(
    "encounter-builder",
    "B19",
    "Preparazione: costruttore d’incontri 2024",
    "Preparation: 2024 encounter builder",
  ),
  area(
    "campaign-settings",
    "B20",
    "Impostazioni della campagna, permessi, regole, “vedi come”",
    "Campaign settings, permissions, rules, “view as”",
  ),
  area(
    "character-library",
    "B21",
    "Personaggi: elenco, privacy, copia, esportazione, condivisione",
    "Characters: list, privacy, copy, export, sharing",
  ),
  area(
    "preferences",
    "B22",
    "Preferenze, accessibilità e unità",
    "Preferences, accessibility and units",
  ),
  area(
    "command-palette",
    "B23",
    "Ricerca globale, palette dei comandi, scorciatoie",
    "Global search, command palette, shortcuts",
  ),
  area("notifications", "B24", "Centro notifiche e richieste", "Notification and request centre"),
  area("random-tables", "B25", "Tabelle casuali e mazzi", "Random tables and decks"),
  area(
    "loot",
    "B26",
    "Tesori, bottino, scorta del gruppo e mercanti",
    "Treasure, loot, party stash and merchants",
  ),
  area("safety", "B27", "Sicurezza del tavolo", "Table safety"),
  area("media", "B28", "Materiali multimediali", "Media"),
  area("account", "B29", "Account, profilo e dati personali", "Account, profile and personal data"),
  area(
    "home",
    "B30",
    "Inizio completo, primi passi, aiuto e novità",
    "Complete home, first steps, help and what’s new",
  ),
  area("combat-tracker", "B32", "Tracker di combattimento completo", "Complete combat tracker"),
  area("damage-tray", "B33", "Danni, cure e registro dei PF", "Damage, healing and HP log"),
  area(
    "dice-tray",
    "B34",
    "Tiri: richieste del DM, gruppo, destinatari, vassoio",
    "Rolls: DM requests, group rolls, recipients, tray",
  ),
  area("fog-vision", "B35", "Nebbia, luci e visione", "Fog, lighting and vision"),
  area("inventory-plus", "B36", "Inventario profondo", "Deep inventory"),
  area(
    "sheet-plus",
    "B37",
    "Scheda: valori derivati, override motivati, comodità",
    "Sheet: derived values, reasoned overrides, conveniences",
  ),
  area(
    "spells-plus",
    "B38",
    "Magie: gestione, liste, confronto, rituali, oggetti",
    "Spells: management, lists, comparison, rituals, items",
  ),
  area(
    "builder-plus",
    "B39",
    "Creazione: percorsi rapidi, personaggi pronti, controlli",
    "Creation: quick paths, ready-made characters, checks",
  ),
  area("special-moves", "B40", "Movimenti e azioni speciali", "Special movement and actions"),
  area("regions", "B41", "Regioni, trappole e comportamenti", "Regions, traps and behaviours"),
  area(
    "world-map",
    "B42",
    "Mondo: mappa del mondo, calendario, cronologia",
    "World: world map, calendar, timeline",
  ),
  area(
    "quests",
    "B43",
    "Missioni, fazioni, reputazione e diario strutturato",
    "Quests, factions, reputation and structured journal",
  ),
  area(
    "party",
    "B44",
    "Gruppo: riepilogo del DM, magie condivise, basi, veicoli",
    "Party: DM overview, shared spells, bases, vehicles",
  ),
  area("travel", "B45", "Esplorazione, viaggio e accampamento", "Exploration, travel and camping"),
  area(
    "knowledge",
    "B46",
    "Conoscenza, esame, furtività e copertura",
    "Knowledge, examination, stealth and cover",
  ),
  area(
    "scene-assets",
    "B47",
    "Scene: cartelle, piani, varianti, oggetti, prefabbricati, UVTT",
    "Scenes: folders, floors, variants, objects, prefabs, UVTT",
  ),
  area("homebrew-editor", "B48", "Editor homebrew profondo", "Deep homebrew editor"),
  area(
    "adventures",
    "B49",
    "Avventure e pacchetti riutilizzabili",
    "Adventures and reusable packages",
  ),
  area(
    "campaign-data",
    "B50",
    "Dati della campagna: copia, archivio, istantanee, export, cestino",
    "Campaign data: copy, archive, snapshots, export, trash",
  ),
  area(
    "sessions-plus",
    "B51",
    "Sessioni: ricorrenza, assenze, posti e presenze",
    "Sessions: recurrence, absences, seats and attendance",
  ),
  area("offline", "B52", "Offline scelto e riconnessione", "Chosen offline mode and reconnection"),
  area("quickbar", "B53", "Comandi personali e barra rapida", "Personal commands and quick bar"),
  area(
    "projects",
    "B54",
    "Progetti, fabbricazione e progressioni non di classe",
    "Projects, crafting and non-class progressions",
  ),
  area("integrations", "B55", "Integrazioni esterne simulate", "Simulated external integrations"),
  area(
    "dice-3d",
    "B56",
    "Presentazione dei tiri digitali: dadi animati",
    "Digital roll presentation: animated dice",
  ),
  area("generators", "B57", "Generatori procedurali assistiti", "Assisted procedural generators"),
  area("relations-graph", "B58", "Grafo delle relazioni", "Relationship graph"),
  area(
    "community",
    "B59",
    "Tavoli pubblici, ricerca di gruppo e moderazione",
    "Public tables, group finder and moderation",
  ),
  area(
    "assistant",
    "B60",
    "Assistente IA simulato per DM e giocatori",
    "Simulated AI assistant for DMs and players",
  ),
]);

// The first render waits for the probes: one that does not answer in time is reported
// as a failed area instead of leaving the page blank.
const PROBE_TIMEOUT_MS = 4000;
// HEAD request answering whether an entry module exists: false only for 404/410, true
// when it is served, null when unknown (not HTTP, no fetch, network error), "timeout"
// when it did not answer in time. Probing first means a missing area costs one HEAD
// request and is never imported.
async function probeModule(href, timeout = PROBE_TIMEOUT_MS) {
  if (!/^https?:/.test(href) || typeof fetch !== "function") return null;
  try {
    const response = await fetch(href, {
      method: "HEAD",
      cache: "no-store",
      signal: AbortSignal.timeout?.(timeout),
    });
    if (response.ok) return true;
    return [404, 410].includes(response.status) ? false : null;
  } catch (error) {
    return error?.name === "TimeoutError" ? "timeout" : null;
  }
}

// In Node an import error tells whether the entry itself is missing. A missing import of
// an existing entry is a failure the builder must see, never "not built".
function isMissingEntry(error, href) {
  if (error?.code !== "ERR_MODULE_NOT_FOUND") return false;
  return error.url
    ? error.url === href
    : String(error.message).startsWith(
        `Cannot find module '${decodeURIComponent(new URL(href).pathname)}'`,
      );
}

/**
 * Probes and imports every entry module in parallel, then registers the imported ones
 * sequentially in plan order, so ordering never depends on network timing. Returns the
 * report rows ({id, backlog, title, status, contributions, error}), also kept by the
 * registry. Options exist for tests: `entries` ({id, backlog?, title?, file? | href?}),
 * `base`, `importModule`, `probe` and `probeTimeout` (milliseconds).
 */
export async function loadExtensions(
  registry,
  {
    entries = PLANNED_EXTENSIONS,
    base = import.meta.url,
    importModule = (href) => import(href),
    probe = probeModule,
    probeTimeout = PROBE_TIMEOUT_MS,
  } = {},
) {
  const planned = entries.map((entry) => ({
    ...entry,
    href: entry.href ?? new URL(entry.file ?? `./${entry.id}.mjs`, base).href,
  }));
  const present = await Promise.all(planned.map((entry) => probe(entry.href, probeTimeout)));
  const settled = await Promise.allSettled(
    planned.map((entry, i) =>
      present[i] === false || present[i] === "timeout" ? null : importModule(entry.href),
    ),
  );
  return planned.map(({ id, backlog = "", title = null, href }, i) => {
    const meta = { backlog, title };
    if (present[i] === "timeout")
      return registry.recordExtension(id, "failed", {
        ...meta,
        error: `The area module did not answer within ${probeTimeout} ms; reload to try again.`,
      });
    const { status, value, reason } = settled[i];
    if (present[i] === false || (status === "rejected" && isMissingEntry(reason, href)))
      return registry.recordExtension(id, "not-built", meta);
    if (status === "rejected")
      return registry.recordExtension(id, "failed", { ...meta, error: reason });
    return registry.use(id, value?.register, meta);
  });
}
