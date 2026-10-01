// Phase C (visual-01): the dev-only «Direzione» selector that skins the blueprint as one of the
// numbered round-1 directions (I-248). It only runs on a loopback host with the localStorage key
// 'd20-dev-direction' present; with no key the app is byte-for-byte unchanged (no attribute, no
// link, no sprite, no strip control). It never throws: every storage and DOM access is guarded.
// See directions/README.md for the builder contracts and changes/visual-01/code-map.md §a–§e.
import { esc, setIconOverride, setLogoOverride } from "../ui.mjs";

// label = the numbered option shown to the owner (I-248, round 1 «Scelta 1 — Direzione»).
export const DIRECTIONS = Object.freeze([
  { id: "bg3", label: "1 · Baldur's Gate 3" },
  { id: "ddb", label: "2 · D&D Beyond" },
  { id: "foundry", label: "3 · Foundry VTT" },
  { id: "owlbear", label: "4 · Owlbear Rodeo" },
  { id: "solasta", label: "5 · Solasta" },
  { id: "roll20", label: "6 · Roll20" },
  { id: "owlcat", label: "7 · Pathfinder WotR" },
  { id: "alchemy", label: "8 · Alchemy RPG" },
  { id: "demiplane", label: "9 · Demiplane" },
]);
const KEY = "d20-dev-direction"; // "current" (Attuale) or a direction id; absent = off
const LOOPBACK = ["127.0.0.1", "localhost", "[::1]"]; // as the ?fixture= gate in app.mjs
// Sample art shared by every direction (assets/PROVENANCE.json); painted by directions/sample.css.
// The 1:1 busts fill the token; the 4:5 goblin figures show a 370 px face square (x offset and
// size in token units, the same crop as the background positions in sample.css).
const GOBLIN = { width: 1.8162, height: 2.2703 }; // 672×840 px seen through a 370 px square
const SAMPLE_ART = {
  livia: null,
  doran: null,
  mira: null,
  "goblin-1": { ...GOBLIN, x: -0.4243 },
  "goblin-2": { ...GOBLIN, x: -0.3541 },
};
const SAMPLE_MAP = "assets/maps/sample/old-watch.webp"; // old-watch is 1000×650 (state.mjs)
const LOAD_LIMIT = 3000; // ms to wait for a stylesheet or a probe before going on

const known = (id) => DIRECTIONS.some((d) => d.id === id);
function loopback() {
  try {
    return LOOPBACK.includes(globalThis.location?.hostname);
  } catch {
    return false;
  }
}
function read() {
  try {
    return globalThis.localStorage?.getItem(KEY) ?? null;
  } catch {
    return null;
  }
}
function write(value) {
  try {
    if (value === null) globalThis.localStorage?.removeItem(KEY);
    else globalThis.localStorage?.setItem(KEY, value);
  } catch {
    // Storage blocked: the direction lasts for this page only.
  }
}
function documentOf() {
  try {
    const doc = globalThis.document;
    return doc?.documentElement && doc.head && doc.body ? doc : null;
  } catch {
    return null;
  }
}

/** Direction mode: a loopback host and the key present (any value, «Attuale» included). */
export const directionMode = () => loopback() && read() !== null;
/** The active direction id, or null for «Attuale», an unknown value or no direction mode. */
export function activeDirection() {
  if (!loopback()) return null;
  const value = read();
  return known(value) ? value : null;
}

/** Once at boot, after the area stylesheets: ?direction=<id>|current|off, then apply. */
export async function startDirection() {
  if (!loopback()) return;
  let query = null;
  try {
    query = new URLSearchParams(globalThis.location.search ?? "").get("direction");
  } catch {
    query = null;
  }
  if (query !== null) write(query === "off" ? null : known(query) ? query : "current");
  await applyDirection(activeDirection());
}

// Calls are chained, so a quick change of mind never interleaves two swaps.
let queue = Promise.resolve();
/** Applies a direction id (or null for none); restores the default exactly on null. */
export function applyDirection(id) {
  const next = known(id) ? id : null;
  queue = queue.then(() => apply(next)).catch(() => {});
  return queue;
}

async function apply(id) {
  const doc = documentOf();
  if (!doc) {
    setIconOverride(null);
    setLogoOverride(null);
    return;
  }
  const root = doc.documentElement;
  // The strip rule first, so the direction sheet stays the last link in <head>.
  if (directionMode()) await ensureLink(doc, "dev-direction-ui", "directions/dev.css");
  else removeLink(doc, "dev-direction-ui");
  if (id) {
    // Sheets and patterns first, then the attribute: the switch shows no unstyled frame.
    await ensureLink(doc, "dev-direction-sample", "directions/sample.css");
    await ensureLink(doc, "dev-direction-css", `directions/${id}/direction.css`, true);
    const map = await exists(SAMPLE_MAP);
    sprite(doc, map);
    try {
      root.dataset.direction = id;
      if (map) root.dataset.sampleMap = "on";
      else delete root.dataset.sampleMap;
    } catch {}
  } else {
    try {
      delete root.dataset.direction;
      delete root.dataset.sampleMap;
    } catch {}
    removeLink(doc, "dev-direction-css");
    removeLink(doc, "dev-direction-sample");
    sprite(doc, null);
  }
  setIconOverride(id ? await iconsOf(id) : null);
  const brand = id ? await brandOf(id) : null;
  setLogoOverride(brand?.logo ?? null);
  favicon(doc, brand?.favicon ?? null);
}

function removeLink(doc, key) {
  try {
    doc.getElementById(key)?.remove();
  } catch {}
}
// Keeps one <link id=key> to href. `last`: the link must be the last one in <head>, so a new
// link is appended, awaited (load or error, at most LOAD_LIMIT) and only then replaces the old.
async function ensureLink(doc, key, href, last = false) {
  try {
    const old = doc.getElementById(key);
    if (old && old.getAttribute("href") === href && (!last || old === doc.head.lastElementChild))
      return;
    const link = doc.createElement("link");
    link.rel = "stylesheet";
    link.setAttribute("href", href);
    link.setAttribute("data-direction-sheet", key);
    const loaded = new Promise((resolve) => {
      const timer = setTimeout(resolve, LOAD_LIMIT);
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      link.addEventListener("load", done, { once: true });
      link.addEventListener("error", done, { once: true });
    });
    doc.head.append(link);
    await loaded;
    old?.remove();
    link.id = key;
  } catch {}
}

async function exists(path) {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LOAD_LIMIT);
    const response = await fetch(path, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return response.ok;
  } catch {
    return false;
  }
}

// The hidden defs sprite for SVG pattern fills (code-map §e), outside #app so renders keep it.
// `map` null removes it; otherwise the portraits, plus the scene art when the file exists.
function sprite(doc, map) {
  try {
    const old = doc.getElementById("direction-defs");
    if (map === null) return old?.remove();
    const portraits = Object.entries(SAMPLE_ART)
      .map(([actor, crop]) => {
        const box = crop
          ? `x="${crop.x}" y="0" width="${crop.width}" height="${crop.height}" preserveAspectRatio="none"`
          : `width="1" height="1" preserveAspectRatio="xMidYMid slice"`;
        return `<pattern id="dir-sample-${actor}" patternContentUnits="objectBoundingBox" width="1" height="1"><image href="assets/portraits/sample/${actor}.webp" ${box}/></pattern>`;
      })
      .join("");
    const scene = map
      ? `<pattern id="dir-sample-scene" patternUnits="userSpaceOnUse" width="1000" height="650"><image href="${SAMPLE_MAP}" width="1000" height="650" preserveAspectRatio="none"/></pattern>`
      : "";
    const art = map ? "portraits map" : "portraits";
    if (old?.getAttribute("data-art") === art) return; // same content: keep the decoded images
    old?.remove();
    doc.body.insertAdjacentHTML(
      "beforeend",
      `<svg id="direction-defs" data-art="${art}" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>${portraits}${scene}</defs></svg>`,
    );
  } catch {}
}

// Round-1 skins are dark-only: under the light theme a direction's stylesheet steps aside, so its
// icons must too (checked at render time, because the theme can change without a reload).
function lightTheme() {
  try {
    return document.documentElement.dataset.prefTheme === "light";
  } catch {
    return false;
  }
}

// directions/<id>/icons.mjs (optional) exports directionIcon(name) → full svg string or null.
async function iconsOf(id) {
  try {
    const mod = await import(`./${id}/icons.mjs`);
    const pick = mod?.directionIcon;
    if (typeof pick !== "function") return null;
    return (name) => {
      if (lightTheme()) return null;
      try {
        const svg = pick(name);
        return typeof svg === "string" && svg.startsWith("<svg") ? svg : null;
      } catch {
        return null;
      }
    };
  } catch {
    return null; // no icons.mjs: the core icons stay
  }
}

// directions/<id>/brand.mjs (optional, I-251) exports directionLogo(className) → full svg string
// (the header mark) and `favicon`, a standalone svg document for the browser tab. Both step
// aside under the light theme, like the icons.
async function brandOf(id) {
  try {
    const mod = await import(`./${id}/brand.mjs`);
    const pick = mod?.directionLogo;
    const logo =
      typeof pick === "function"
        ? (className) => {
            if (lightTheme()) return null;
            try {
              const svg = pick(className);
              return typeof svg === "string" && svg.startsWith("<svg") ? svg : null;
            } catch {
              return null;
            }
          }
        : null;
    const svg = mod?.favicon;
    const icon =
      typeof svg === "string" && svg.startsWith("<svg")
        ? `data:image/svg+xml,${encodeURIComponent(svg)}`
        : null;
    return { logo, favicon: icon };
  } catch {
    return null; // no brand.mjs: today's mark and tab icon stay
  }
}

// The page's own <link rel="icon"> href while a direction's favicon replaces it; restored
// exactly when the direction goes. A theme watcher swaps back and forth under the light theme.
let ownIcon = null; // { link, href } while swapped
let themeWatch = null;
function favicon(doc, href) {
  try {
    themeWatch?.disconnect();
    themeWatch = null;
    if (!href) {
      if (!ownIcon) return;
      const { link, href: own } = ownIcon;
      if (own === null) link.removeAttribute("href");
      else link.setAttribute("href", own);
      ownIcon = null;
      return;
    }
    const link = ownIcon?.link ?? doc.querySelector('link[rel="icon"]');
    if (!link) return;
    ownIcon ??= { link, href: link.getAttribute("href") };
    const own = ownIcon.href;
    const sync = () => {
      const want = lightTheme() ? own : href;
      if (link.getAttribute("href") === want) return;
      if (want === null) link.removeAttribute("href");
      else link.setAttribute("href", want);
    };
    sync();
    themeWatch = new MutationObserver(sync);
    themeWatch.observe(doc.documentElement, {
      attributes: true,
      attributeFilter: ["data-pref-theme"],
    });
  } catch {}
}

/** The strip control: "" unless direction mode, so the default strip markup is unchanged. */
export function directionControl(t) {
  if (!directionMode()) return "";
  const active = activeDirection() ?? "current";
  const option = (value, label) =>
    `<option value="${value}"${value === active ? " selected" : ""}>${esc(label)}</option>`;
  return `<label class="demo-direction">${t("Direzione", "Direction")} <select id="demo-direction">${option("current", t("Attuale", "Current"))}${DIRECTIONS.map((d) => option(d.id, d.label)).join("")}</select></label>`;
}

/** Wires the control after each render (idempotent, like #demo-role's onchange). */
export function bindDirection(render) {
  try {
    const select = globalThis.document?.querySelector?.("#demo-direction");
    if (!select) return;
    select.onchange = async () => {
      write(select.value);
      await applyDirection(activeDirection());
      render();
      // The strip is drawn again: keep keyboard focus on the new control.
      globalThis.document.querySelector("#demo-direction")?.focus();
    };
  } catch {}
}
