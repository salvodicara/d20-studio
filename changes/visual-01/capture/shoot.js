#!/usr/bin/env node
// Capture kit for Phase C (visual-01): screenshots of the real blueprint app in named states.
//
// Every shot runs in a fresh browser context (empty storage), so the app seeds its own
// example; the kit then runs the app's own "Ripristina esempio" and reaches the state through
// the app's UI and its own hash routes. The only localStorage writes are the device theme
// preference the app itself stores and the dev-only direction key 'd20-dev-direction'
// ('off' removes it; 'current' and direction ids put the app in direction mode).
// Game state is read (never written) to assert that a shot shows what its name claims.
//
// Usage and parameters: see README.md next to this file, or run with --help.
"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { execFileSync } = require("node:child_process");

const HELP = `Usage: node shoot.js --out <dir> [options]

  --out <dir>          output folder (created if missing)                        [required]
  --base <url>         app URL                                   [http://127.0.0.1:8881/]
  --states <list>      comma list of states (see --list)     [home,sheet,table-combat,campaign,library]
  --themes <list>      dark,light                                                  [dark]
  --widths <list>      1440,390 or WxH values (1440→900 high, 390→844 high)    [1440,390]
  --directions <list>  'off' (key removed: the plain app), 'current' (direction mode,
                       «Attuale») or direction ids (bg3,ddb,foundry,owlbear,solasta,
                       roll20,owlcat,alchemy,demiplane)                            [off]
  --combo <s:t:w[:d]>  explicit combo (d defaults to off), repeatable; replaces the product
  --now <iso|real>     fixed Date.now for the page                [2026-09-30T19:00:00+02:00]
  --dpr <n>            device pixel ratio         [1 at desktop widths, 2 below 768 px]
  --reduced-motion     emulate prefers-reduced-motion (default: normal motion)
  --browser <name>     chromium | webkit                                       [chromium]
  --jobs <n>           shots captured in parallel                                    [3]
  --contact            also write contact-<theme>-<direction>.png with 'magick montage'
                       (from every ok viewport shot listed in <out>/manifest.json)
  --contact-only       only rebuild the contact sheets from <out>/manifest.json
  --list               print the known states and exit

States: <base>[-dm][-full]. '-dm' visits as DM (default: Player, or DM for a DM-only state
such as dialog-initiative); '-full' is a full-page capture.
Files: <state>-<theme>-<width>-<direction>.png (e.g. home-dark-1440-current.png).`;

// ---------------------------------------------------------------- states

const THEME_KEY = "d20-studio-setting:preferences-look.theme"; // the app's own device setting
const DIRECTION_KEY = "d20-dev-direction"; // dev-only «Direzione» selector (Phase C)
const OFF = "off"; // no key: the plain app, no «Direzione» control
const STATE_KEY = "d20-studio-blueprint-v1"; // read only, to assert game state

const text = (page, selector) =>
  page
    .locator(selector)
    .first()
    .innerText({ timeout: 5000 })
    .then((s) => s.replace(/\s+/g, " ").trim());
const savedState = (page) =>
  page.evaluate((key) => JSON.parse(localStorage.getItem(key) || "null"), STATE_KEY);

// Livia's sheet with one category opened by its own tab, then scrolled as a reader does: down
// to the tab strip (sticky), and further only until the category's first row is wholly in view.
const sheetCategory = (tab, name, row, about) => ({
  route: "characters?id=livia",
  about,
  async prepare(page) {
    await page.locator(`.character-tabs [data-character-tab="${tab}"]`).click();
    await page.waitForFunction(
      (id) => document.querySelector(".character-tabs .active")?.dataset.characterTab === id,
      tab,
    );
    await page.evaluate((row) => {
      const top = (el) => el.getBoundingClientRect().top + scrollY;
      const first = document.querySelector(row);
      const end = top(first) + first.offsetHeight + 24 - innerHeight;
      const bar = top(document.querySelector(".character-tabs-bar"));
      scrollTo({ top: Math.max(bar, end), behavior: "instant" });
    }, row);
  },
  async check(page) {
    const h1 = await text(page, "#content h1");
    if (h1 !== "Livia") return `sheet h1 is «${h1}»`;
    const open = await text(page, ".character-tabs .active");
    if (open !== name) return `sheet open tab is «${open}»`;
    return page.evaluate((row) => {
      const tab = document.querySelector(".character-tabs .active");
      if (tab.getAttribute("aria-current") !== "page") return "open tab is not aria-current";
      const t = tab.getBoundingClientRect();
      if (t.top < 0 || t.bottom > innerHeight || t.right > innerWidth) return "open tab off-screen";
      const first = document.querySelector(row)?.getBoundingClientRect();
      if (!first?.height) return `no ${row} shown`;
      if (first.top < t.bottom || first.bottom > innerHeight) return `${row} not wholly in view`;
    }, row);
  },
});

const BASES = {
  home: {
    route: "home",
    about: "Inizio (home page)",
    async check(page) {
      const h1 = await text(page, "#content h1");
      if (h1 !== "La prossima avventura") return `home h1 is «${h1}»`;
    },
  },
  sheet: {
    route: "characters?id=livia",
    about: "Livia's character sheet, default tab Azioni",
    async check(page) {
      const h1 = await text(page, "#content h1");
      if (h1 !== "Livia") return `sheet h1 is «${h1}»`;
      const tab = await text(page, ".character-tabs .active");
      if (tab !== "Azioni") return `sheet open tab is «${tab}»`;
    },
  },
  campaign: {
    route: "campaign",
    about: "campaign overview (Panoramica)",
    async check(page) {
      const h1 = await text(page, "#content h1");
      if (h1 !== "Panoramica") return `campaign h1 is «${h1}»`;
    },
  },
  library: {
    route: "library",
    about: "Library default page (Disponibili)",
    async check(page) {
      const h1 = await text(page, "#content h1");
      if (h1 !== "Biblioteca") return `library h1 is «${h1}»`;
    },
  },
  "table-combat": {
    route: "table",
    combat: true,
    about: "Table, combat on 'old-watch', round 1, Livia's turn (turn banner acknowledged)",
    async prepare(page, role) {
      // The player's «Tocca a te» banner covers the map: acknowledge it through its own button.
      if (role !== "player") return;
      const ok = page.locator("[data-ct-alert-ok]");
      await ok.waitFor({ timeout: 5000 });
      await ok.click();
      await ok.waitFor({ state: "detached", timeout: 5000 });
    },
    async check(page) {
      const s = await savedState(page);
      const c = s?.combat;
      if (!c?.active) return "combat is not active";
      if (c.sceneId !== "old-watch" || s.activeSceneId !== "old-watch")
        return `combat scene is ${c.sceneId}`;
      if (c.order[c.turn] !== "livia") return `current turn is ${c.order[c.turn]}`;
      if (!(await page.locator("#battle-map").isVisible())) return "battle map not visible";
      const line = await text(page, ".table-topline");
      if (!line.includes("Round 1")) return `table topline is «${line}»`;
    },
  },
  "table-explore": {
    route: "table",
    about: "Table on 'old-watch' in free exploration (no combat), Livia selected",
    async check(page) {
      const s = await savedState(page);
      if (s?.combat?.active) return "combat is active";
      if (s?.activeSceneId !== "old-watch") return `active scene is ${s?.activeSceneId}`;
      if (!(await page.locator("#battle-map").isVisible())) return "battle map not visible";
      if (!(await page.locator('#battle-map [data-actor="livia"].selected').count()))
        return "Livia's token is not selected";
      if (!(await page.locator(".table-hotbar").isVisible())) return "hotbar not visible";
      const name = await text(page, ".table-hotbar .hotbar-name strong");
      if (name !== "Livia") return `hotbar shows «${name}»`;
      const line = await text(page, ".table-topline");
      if (!line.includes("Esplorazione libera")) return `table topline is «${line}»`;
    },
  },
  "sheet-spells": sheetCategory(
    "spells",
    "Magie",
    ".spl-list .spl-row",
    "Livia's sheet, tab Magie",
  ),
  "sheet-inventory": sheetCategory(
    "inventory",
    "Inventario",
    "[data-invp-row]",
    "Livia's sheet, tab Inventario",
  ),
  "dialog-initiative": {
    route: "table",
    role: "dm",
    dialog: true,
    about: "DM (always): «Avvia combattimento» dialog open, typed d20s filled, not submitted",
    async prepare(page) {
      await openStartDialog(page);
      // Typing scrolled each row into view: back to the dialog's top, as a DM reviewing the
      // list before «Inizia combattimento».
      await page.locator("#dialog[open]").evaluate((dialog) => {
        for (const el of [dialog, ...dialog.querySelectorAll("*")]) el.scrollTop = 0;
      });
    },
    async check(page) {
      const title = await text(page, "#dialog[open] #dialog-title");
      if (title !== "Avvia combattimento") return `dialog title is «${title}»`;
      const first = await page.evaluate(() => {
        const box = document.querySelector("#dialog[open] .dialog-body").getBoundingClientRect();
        const d20 = document
          .querySelector('[data-ct-start-natural="livia"]')
          .getBoundingClientRect();
        return d20.top >= box.top && d20.bottom <= Math.min(box.bottom, innerHeight);
      });
      if (!first) return "Livia's row is not in view in the dialog";
      const typed = await page
        .locator("#dialog[open] [data-ct-start-natural]")
        .evaluateAll((els) =>
          Object.fromEntries(els.map((el) => [el.dataset.ctStartNatural, el.value])),
        );
      for (const [id, d20] of Object.entries(NATURALS))
        if (typed[id] !== String(d20)) return `typed d20 of ${id} is «${typed[id]}»`;
      const s = await savedState(page);
      if (s?.combat?.active) return "combat already started";
      if (s?.activeSceneId !== "old-watch") return `active scene is ${s?.activeSceneId}`;
      if (!(await page.locator("#battle-map").count())) return "no Table under the dialog";
    },
  },
  "token-menu": {
    route: "table",
    combat: true,
    keepFocus: true, // focus leaving the menu closes it (the app's WAI-ARIA menu)
    about: "table-combat (Player) with the token menu open on Livia's token",
    async prepare(page, role) {
      await BASES["table-combat"].prepare(page, role);
      await openTokenMenu(page, "livia");
    },
    async check(page) {
      const combat = await BASES["table-combat"].check(page);
      if (combat) return combat;
      return page.evaluate(() => {
        const menu = document.querySelector("body > .token-menu");
        const token = document.querySelector('#battle-map [data-actor="livia"]');
        if (!menu || menu.hidden || !token) return "token menu not open";
        const head = menu.querySelector("#token-menu-title")?.textContent;
        if (head !== "Livia") return `token menu title is «${head}»`;
        const m = menu.getBoundingClientRect();
        const t = token.getBoundingClientRect();
        if (t.top < 0 || t.bottom > innerHeight) return "Livia's token off-screen";
        // Phone: the app's bottom sheet (titled Livia, tall enough to cover the map); wider:
        // beside the token, on either side.
        if (menu.classList.contains("sheet")) {
          if (Math.abs(m.bottom - innerHeight) > 1) return "menu sheet not docked at the bottom";
        } else {
          const beside =
            Math.abs(m.left - (t.right + 10)) <= 1 || Math.abs(m.right - (t.left - 10)) <= 1;
          if (!beside || m.top > t.bottom || m.bottom < t.top) return "menu not beside Livia";
        }
      });
    },
  },
};

function parseState(name) {
  const m = /^(.+?)(-dm)?(-full)?$/.exec(name);
  const base = m && BASES[m[1]];
  if (!base) throw new Error(`Unknown state «${name}» (use --list)`);
  const role = m[2] ? "dm" : (base.role ?? "player");
  return { name, base: m[1], def: base, role, full: Boolean(m[3]) };
}

// ---------------------------------------------------------------- app steps (UI only)

async function load(page, base, route) {
  // A full document load: the in-memory UI state (role, language, open panels) starts clean.
  await page.goto("about:blank");
  await page.goto(base + "#" + route, { waitUntil: "load" });
  await page.locator("#demo-role").waitFor({ timeout: 15000 });
}

async function noDialog(page) {
  await page.waitForFunction(() => !document.querySelector("dialog[open]"), null, {
    timeout: 5000,
  });
}

async function resetExample(page) {
  // The demo strip's «Ripristina esempio», confirmed in its own dialog («Ripristina»).
  await page.locator('.demo-strip [data-service="reset"]').click();
  await page.locator("#dialog[open] button[type=submit]").click();
  await noDialog(page);
}

async function setRole(page, role) {
  const select = page.locator("#demo-role");
  if ((await select.inputValue()) === role) return;
  await select.selectOption(role);
  await page.waitForFunction((r) => document.querySelector("#demo-role")?.value === r, role);
}

// Typed d20s: the example's own turn order (livia, goblin-1, doran, goblin-2), then Mira.
const NATURALS = { livia: 18, "goblin-1": 15, doran: 12, "goblin-2": 10, mira: 8 };

async function openStartDialog(page) {
  // DM at the Table: the scene header's «Avvia combattimento», typed d20s (Livia highest).
  await page.locator('[data-table="combat"]').click();
  await page.locator("[data-ct-start-dialog]").waitFor({ timeout: 5000 });
  const ids = await page
    .locator("[data-ct-start-natural]")
    .evaluateAll((els) => els.map((el) => el.dataset.ctStartNatural));
  if (!ids.includes("livia")) throw new Error("Livia is not in the combat start dialog");
  let spare = 6; // rows the example may gain later: below everyone above, in list order
  for (const id of ids) {
    const input = page.locator(`[data-ct-start-natural="${id}"]`);
    await input.fill(String(NATURALS[id] ?? Math.max(1, spare--)));
    await input.dispatchEvent("change");
  }
}

async function startCombat(page) {
  // The start dialog above, then «Inizia combattimento».
  await page.evaluate(() => (location.hash = "table"));
  await page.locator("#battle-map").waitFor({ timeout: 10000 });
  await setRole(page, "dm");
  await openStartDialog(page);
  await page.locator("#dialog[open] button[type=submit]").click();
  await noDialog(page);
  await page.waitForFunction(
    (key) => JSON.parse(localStorage.getItem(key) || "null")?.combat?.active === true,
    STATE_KEY,
    { timeout: 5000 },
  );
}

async function openTokenMenu(page, actorId) {
  // The token menu's own gestures: right-click with a mouse; long-press on a touch phone
  // (the app's 520 ms timer, finger held until the menu shows), sent as Chromium touch
  // events (CDP), so phone shots of this state need --browser chromium.
  const token = page.locator(`#battle-map [data-actor="${actorId}"]`);
  const menu = page.locator("body > .token-menu");
  if (page.viewportSize().width >= 768) await token.click({ button: "right" });
  else {
    const cdp = await page.context().newCDPSession(page);
    await token.scrollIntoViewIfNeeded();
    const b = await token.boundingBox();
    const touchPoints = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }];
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints });
    await menu.waitFor({ timeout: 5000 });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  }
  await menu.locator("[data-nav]").first().waitFor({ timeout: 5000 });
}

// ---------------------------------------------------------------- settle and capture

async function settle(page, keepFocus) {
  await page.waitForLoadState("networkidle", { timeout: 5000 }).catch(() => {});
  await page.evaluate(async (keepFocus) => {
    await document.fonts.ready;
    await Promise.all(
      [...document.images]
        .filter((img) => !img.complete)
        .map((img) => new Promise((r) => img.addEventListener("load", r, { once: true }))),
    );
    // Direction mode: the sample art in the loader's SVG sprite (pattern fills) is decoded too.
    await Promise.all(
      [...document.querySelectorAll("#direction-defs image")].map((el) => {
        const img = new Image();
        img.src = el.getAttribute("href");
        return img.decode().catch(() => {});
      }),
    );
    // No focus ring left over from the kit's own clicks (unless the state's focus is the app's).
    if (!keepFocus) document.activeElement?.blur?.();
  }, keepFocus);
  await page.mouse.move(0, 0); // no hover left over from the kit's own clicks
  // Transient notices (core toast 5.5 s, pop-up notices, the phone map snackbar 4.5 s) go
  // by themselves: wait for them instead of capturing a moment.
  return page
    .waitForFunction((sel) => !document.querySelector(sel), TRANSIENT, { timeout: 9000 })
    .then(
      () => null,
      () => "a transient notice was still visible",
    );
}
const TRANSIENT = "#toast.shown, .notifications-toast, #map-message.is-fresh";

// Screenshots until two consecutive frames are identical (finite animations fast-forwarded,
// infinite ones held at their first frame by Playwright's animations: "disabled").
async function stableShot(page, fullPage) {
  const opts = { animations: "disabled", caret: "hide", fullPage };
  let prev = null;
  for (let i = 0; i < 16; i++) {
    const buf = await page.screenshot(opts);
    if (prev && buf.equals(prev)) return { buf, stable: true };
    prev = buf;
    await page.waitForTimeout(200);
  }
  return { buf: prev, stable: false };
}

async function globalChecks(page, { theme, role, direction, def }) {
  const got = await page.evaluate(
    (key) => ({
      lang: document.documentElement.lang,
      theme: document.documentElement.dataset.prefTheme,
      role: document.querySelector("#demo-role")?.value,
      dialog: Boolean(document.querySelector("dialog[open]")),
      loading: Boolean(document.querySelector(".app-loading")),
      direction: localStorage.getItem(key),
      applied: document.documentElement.dataset.direction ?? null,
      control: document.querySelector("#demo-direction")
        ? {
            value: document.querySelector("#demo-direction").value,
            options: [...document.querySelectorAll("#demo-direction option")].map((o) => o.value),
          }
        : null,
    }),
    DIRECTION_KEY,
  );
  const problems = [];
  if (got.lang !== "it") problems.push(`language is ${got.lang}`);
  if (got.theme !== theme) problems.push(`theme is ${got.theme}`);
  if (got.role !== role) problems.push(`role is ${got.role}`);
  if (got.dialog !== Boolean(def.dialog))
    // only a dialog state shows one
    problems.push(got.dialog ? "a dialog is open" : "no dialog is open");
  if (got.loading) problems.push("app still loading");
  if (got.direction !== (direction === OFF ? null : direction))
    problems.push(`direction key is ${got.direction}`);
  if (direction === OFF) {
    if (got.control) problems.push("the «Direzione» control is shown with no key");
    if (got.applied) problems.push(`data-direction is ${got.applied} with no key`);
  } else if (!got.control) {
    problems.push("no «Direzione» control: the app is not in direction mode");
  } else {
    // An id the app does not know shows «Attuale», like 'current'.
    const expected =
      direction !== "current" && got.control.options.includes(direction) ? direction : "current";
    if (got.control.value !== expected) problems.push(`«Direzione» shows ${got.control.value}`);
    if ((got.applied ?? "current") !== expected) problems.push(`data-direction is ${got.applied}`);
  }
  return problems;
}

// ---------------------------------------------------------------- one group of shots

function viewportOf(width) {
  const known = { 1440: 900, 390: 844 };
  const m = /^(\d+)(?:x(\d+))?$/.exec(String(width));
  if (!m) throw new Error(`Bad width «${width}»`);
  const w = Number(m[1]);
  const h = m[2] ? Number(m[2]) : known[w];
  if (!h) throw new Error(`No default height for width ${w}: use ${w}xH`);
  return { width: w, height: h };
}

const fileName = (state, theme, width, direction) => `${state}-${theme}-${width}-${direction}.png`;

// A group shares base state, role, theme, width and direction: one setup, then the viewport
// and/or full-page capture.
async function shootGroup(browser, group, opts) {
  const { def, role, theme, width, direction, variants } = group;
  const vp = viewportOf(width);
  const mobile = vp.width < 768;
  const started = Date.now();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }, // setup size; the final load uses vp
    deviceScaleFactor: opts.dpr ?? (mobile ? 2 : 1),
    isMobile: mobile && opts.browser !== "firefox",
    hasTouch: mobile,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: theme,
    reducedMotion: opts.reducedMotion ? "reduce" : "no-preference",
    serviceWorkers: "block",
  });
  const errors = [];
  const results = [];
  try {
    if (opts.now !== "real") await context.clock.setFixedTime(new Date(opts.now));
    await context.addInitScript(
      ({ themeKey, theme, dirKey, direction }) => {
        try {
          localStorage.setItem(themeKey, JSON.stringify(theme));
          if (direction === "off") localStorage.removeItem(dirKey);
          else localStorage.setItem(dirKey, direction);
        } catch {} // about:blank has no storage
      },
      { themeKey: THEME_KEY, theme, dirKey: DIRECTION_KEY, direction },
    );
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.split("\n")[0]));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200));
    });
    await load(page, opts.base, "home");
    await resetExample(page);
    if (def.combat) await startCombat(page);
    await page.setViewportSize(vp);
    await load(page, opts.base, def.route);
    await setRole(page, role);
    if (def.prepare) await def.prepare(page, role);
    const warning = await settle(page, Boolean(def.keepFocus));
    const problems = [...(await globalChecks(page, group)), await def.check(page)].filter(Boolean);
    for (const variant of variants) {
      const file = fileName(variant.state, theme, vp.width, direction);
      const { buf, stable } = await stableShot(page, variant.full);
      const target = problems.length
        ? path.join(opts.out, "_failed", file)
        : path.join(opts.out, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, buf);
      results.push({
        file: path.relative(opts.out, target),
        state: variant.state,
        role,
        theme,
        width: vp.width,
        height: vp.height,
        direction,
        fullPage: variant.full,
        route: "#" + def.route,
        ok: problems.length === 0,
        problems,
        stable,
        warning,
        errors: [...errors],
        ms: Date.now() - started,
      });
    }
    // Optional in-page inspection of the settled, checked page, after its screenshots. Only the
    // design-value audit (changes/visual-01/audit/audit.js) sets it; the CLI never does.
    if (opts.inspect && !problems.length) {
      const inspected = await opts
        .inspect(page, group)
        .catch((error) => ({ error: error.message.split("\n")[0] }));
      for (const r of results) r.inspected = inspected;
    }
  } catch (error) {
    for (const variant of variants)
      results.push({
        file: null,
        state: variant.state,
        role,
        theme,
        width: vp.width,
        direction,
        ok: false,
        problems: ["failed: " + error.message.split("\n")[0]],
        errors,
      });
  } finally {
    await context.close();
  }
  return results;
}

// ---------------------------------------------------------------- matrix, manifest, contact

function buildGroups(values) {
  const list = (s) =>
    String(s)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  const combos = values.combo?.length
    ? values.combo.map((c) => {
        const [state, theme, width, direction = OFF] = c.split(":");
        return { state, theme, width, direction };
      })
    : list(values.states).flatMap((state) =>
        list(values.themes).flatMap((theme) =>
          list(values.widths).flatMap((width) =>
            list(values.directions).map((direction) => ({ state, theme, width, direction })),
          ),
        ),
      );
  const groups = new Map();
  for (const c of combos) {
    if (!["dark", "light"].includes(c.theme)) throw new Error(`Bad theme «${c.theme}»`);
    if (!/^[a-z0-9][a-z0-9-]*$/.test(c.direction))
      throw new Error(`Bad direction «${c.direction}»`);
    viewportOf(c.width);
    const s = parseState(c.state);
    const key = [s.base, s.role, c.theme, c.width, c.direction].join("|");
    if (!groups.has(key))
      groups.set(key, { ...c, def: s.def, base: s.base, role: s.role, variants: [] });
    const g = groups.get(key);
    if (!g.variants.some((v) => v.state === c.state))
      g.variants.push({ state: c.state, full: s.full });
  }
  return [...groups.values()];
}

function writeManifest(out, meta, results) {
  const file = path.join(out, "manifest.json");
  // One row per combo: a re-run replaces the earlier row, also when it now fails.
  const key = (r) => [r.state, r.theme, r.width, r.direction].join("|");
  const fresh = new Set(results.map(key));
  const merged = [...readShots(out).filter((r) => !fresh.has(key(r))), ...results].sort((a, b) =>
    key(a).localeCompare(key(b)),
  );
  fs.writeFileSync(file, JSON.stringify({ ...meta, shots: merged }, null, 2) + "\n");
  return merged;
}

function readShots(out) {
  try {
    return JSON.parse(fs.readFileSync(path.join(out, "manifest.json"), "utf8")).shots ?? [];
  } catch {
    return [];
  }
}

function contactSheets(out, shots) {
  const ok = shots.filter(
    (r) => r.ok && r.file && !r.fullPage && fs.existsSync(path.join(out, r.file)),
  );
  const order = Object.keys(BASES);
  const rank = (r) => [order.indexOf(parseState(r.state).base), r.role === "dm" ? 1 : 0, -r.width];
  const bySheet = new Map();
  for (const r of ok) {
    const key = r.theme + "-" + r.direction;
    if (!bySheet.has(key)) bySheet.set(key, []);
    bySheet.get(key).push(r);
  }
  // montage needs an explicit label font here (no fontconfig list): the first one present.
  const font = [
    process.env.CAPTURE_FONT,
    "/System/Library/Fonts/Supplemental/Arial.ttf",
    "/System/Library/Fonts/Helvetica.ttc",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  ].find((f) => f && fs.existsSync(f));
  const written = [];
  for (const [key, rows] of bySheet) {
    rows.sort((a, b) => {
      const [x, y] = [rank(a), rank(b)];
      return x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    });
    const target = path.join(out, `contact-${key}.png`);
    execFileSync("magick", [
      "montage",
      ...(font ? ["-font", font] : []),
      "-label",
      "%f",
      ...rows.map((r) => path.join(out, r.file)),
      "-geometry",
      "560x560+12+12",
      "-tile",
      "4x",
      "-background",
      "#2b2b2b",
      "-fill",
      "#f0f0f0",
      "-pointsize",
      "18",
      "-title",
      `visual-01 capture · ${key}`,
      target,
    ]);
    written.push(path.basename(target));
  }
  return written;
}

async function pool(items, jobs, fn) {
  const results = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const item = items[next++];
      results.push(...(await fn(item)));
    }
  };
  await Promise.all(Array.from({ length: Math.min(jobs, items.length) }, worker));
  return results;
}

async function main() {
  const { values } = parseArgs({
    options: {
      out: { type: "string" },
      base: { type: "string", default: "http://127.0.0.1:8881/" },
      states: { type: "string", default: "home,sheet,table-combat,campaign,library" },
      themes: { type: "string", default: "dark" },
      widths: { type: "string", default: "1440,390" },
      directions: { type: "string", default: OFF },
      combo: { type: "string", multiple: true },
      now: { type: "string", default: "2026-09-30T19:00:00+02:00" },
      dpr: { type: "string" },
      "reduced-motion": { type: "boolean", default: false },
      browser: { type: "string", default: "chromium" },
      jobs: { type: "string", default: "3" },
      contact: { type: "boolean", default: false },
      "contact-only": { type: "boolean", default: false },
      list: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return console.log(HELP);
  if (values.list) {
    for (const [name, def] of Object.entries(BASES))
      console.log(`${name.padEnd(18)} #${def.route.padEnd(22)} ${def.about}`);
    return console.log("Modifiers: <state>-dm (visit as DM), <state>-full (full page).");
  }
  if (!values.out) throw new Error("--out <dir> is required (see --help)");
  if (values["contact-only"]) {
    const out = path.resolve(values.out);
    return console.log("contact:", contactSheets(out, readShots(out)).join(", "));
  }
  const base = new URL(values.base).href;
  if (new URL(base).port === "8879")
    throw new Error("Port 8879 serves the frozen interview-01 copy: never capture it");
  if (values.now !== "real" && Number.isNaN(Date.parse(values.now)))
    throw new Error(`Bad --now «${values.now}»`);
  const opts = {
    out: path.resolve(values.out),
    base,
    now: values.now,
    dpr: values.dpr ? Number(values.dpr) : undefined,
    reducedMotion: values["reduced-motion"],
    browser: values.browser,
  };
  const groups = buildGroups(values);
  fs.mkdirSync(opts.out, { recursive: true });
  const playwright = require("playwright");
  const type = playwright[values.browser];
  if (!type) throw new Error(`Unknown browser «${values.browser}»`);
  const browser = await type.launch();
  const t0 = Date.now();
  let results;
  try {
    results = await pool(groups, Math.max(1, Number(values.jobs) || 1), (g) =>
      shootGroup(browser, g, opts),
    );
  } finally {
    await browser.close();
  }
  const shots = writeManifest(
    opts.out,
    {
      tool: "changes/visual-01/capture/shoot.js",
      base,
      browser: `${values.browser} ${browser.version()}`,
      fixedNow: values.now,
      reducedMotion: opts.reducedMotion,
      capturedAt: new Date().toISOString(),
    },
    results,
  );
  for (const r of results)
    console.log(
      `${r.ok ? "ok  " : "FAIL"} ${r.file ?? r.state}${r.stable === false ? " (not stable)" : ""}` +
        `${r.warning ? " · warning: " + r.warning : ""}` +
        `${r.problems.length ? " · " + r.problems.join("; ") : ""}` +
        `${r.errors.length ? " · errors: " + r.errors.join(" | ") : ""}`,
    );
  if (values.contact) console.log("contact:", contactSheets(opts.out, shots).join(", "));
  const failed = results.filter((r) => !r.ok).length;
  console.log(`${results.length - failed}/${results.length} shots in ${Date.now() - t0} ms`);
  process.exitCode = failed ? 1 : 0;
}

// Reused by the design-value audit (changes/visual-01/audit/audit.js); the CLI is unchanged.
module.exports = { BASES, parseState, buildGroups, shootGroup, pool, viewportOf, fileName };

if (require.main === module)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 2;
  });
