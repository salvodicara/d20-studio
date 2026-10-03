#!/usr/bin/env node
// Captures the dev-only component specimen (design/blueprint/directions/specimen.html) as one
// full-page screenshot per direction and width: specimen-<direction>.png at 1440 and
// specimen-<direction>-390.png on a phone; with --variants (round 2, directions/README.md)
// specimen-<direction>+<list with dots>[-390].png, e.g. specimen-bg3+c2.t3.png. Before shooting it checks that the specimen loads
// exactly the stylesheets of a running app page, in the same order (it fails otherwise).
//
// Usage (from the worktree root, server on 8881; GNU timeout is not installed):
//   perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/shoot-specimen.mjs \
//     --out <dir> --directions off,current,bg3,owlbear
//   … --out <dir> --directions bg3 --variants c2,t3     (one combination per run)
// Options: see --help. Never writes inside the repository unless --out points there.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { createRequire } from "node:module";
import { chromium } from "playwright";

// The capture kit's own parser: the same list, the same errors, the same file suffix.
const { variantList } = createRequire(import.meta.url)("../capture/shoot.js");

const HELP = `Usage: node shoot-specimen.mjs --out <dir> [options]

  --out <dir>          output folder (created if missing)                        [required]
  --base <url>         app URL (the specimen is <base>directions/specimen.html)
                                                                   [http://127.0.0.1:8881/]
  --directions <list>  'off' (no key), 'current' («Attuale», direction mode) or direction
                       ids (bg3,ddb,foundry,owlbear,solasta,roll20,owlcat,alchemy,demiplane)
                                                                                  [off]
  --variants <list>    round-2 options inside the run's one direction id, one per axis
                       c,t,b,i (e.g. c2,t3; the last per axis wins)                [none]
  --widths <list>      1440 and/or 390 (390 is a phone: touch, mobile)        [1440,390]
  --dpr <n>            device pixel ratio for every shot                             [1]
  --jobs <n>           shots captured in parallel                                    [3]

Files: specimen-<direction>.png (1440), specimen-<direction>-390.png (390), manifest.json;
with --variants specimen-<direction>+<list with dots>[-390].png (specimen-bg3+c2.t3.png).
Exit code: 0 all ok, 1 a shot failed its checks, 2 the stylesheet list drifted from the app.`;

const DIRECTION_KEY = "d20-dev-direction";
const VARIANT_KEY = "d20-dev-variant";
// Console noise the loader documents (directions/README.md «Known noise»): a direction with no
// icons.mjs, or the sample map missing, logs one 404; the page is still complete.
const NOISE = /Failed to load resource: the server responded with a status of 404/;

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    base: { type: "string", default: "http://127.0.0.1:8881/" },
    directions: { type: "string", default: "off" },
    variants: { type: "string" },
    widths: { type: "string", default: "1440,390" },
    dpr: { type: "string", default: "1" },
    jobs: { type: "string", default: "3" },
    help: { type: "boolean", default: false },
  },
});
if (values.help || !values.out) {
  console.log(HELP);
  process.exit(values.help ? 0 : 1);
}
const list = (s) =>
  String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const base = values.base.endsWith("/") ? values.base : values.base + "/";
const out = path.resolve(values.out);
const directions = list(values.directions);
const widths = list(values.widths).map(Number);
for (const d of directions)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(d)) throw new Error(`Bad direction «${d}»`);
for (const w of widths) if (![1440, 390].includes(w)) throw new Error(`Width must be 1440 or 390`);
// --variants: one combination per run, inside the run's one direction (an id, not off/current).
const variant = variantList(values.variants);
if (values.variants !== undefined && !variant) throw new Error("--variants names no variant");
if (variant && (directions.length !== 1 || ["off", "current"].includes(directions[0])))
  throw new Error(`--variants needs exactly one direction id, not «${directions.join(",")}»`);
fs.mkdirSync(out, { recursive: true });

const viewport = (width) => ({ width, height: width === 390 ? 844 : 900 });
// `variant` "c2,t3" is written "+c2.t3" after the direction (as capture/shoot.js).
const suffix = (direction, variant) =>
  direction + (variant ? "+" + variant.split(",").join(".") : "");
const fileName = (direction, width) =>
  `specimen-${suffix(direction, variant)}${width === 1440 ? "" : "-" + width}.png`;
// Stylesheet hrefs as paths from the app root, so the app's absolute and relative hrefs compare.
const normalise = (hrefs) => hrefs.map((href) => new URL(href, base).pathname.replace(/^\//, ""));

async function newContext(browser, width) {
  const mobile = width < 768;
  return browser.newContext({
    viewport: viewport(width),
    deviceScaleFactor: Number(values.dpr) || 1,
    isMobile: mobile,
    hasTouch: mobile,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: "dark",
    reducedMotion: "no-preference",
    serviceWorkers: "block",
  });
}

/** The stylesheets of a running app page (direction key removed), in document order. */
async function appSheets(browser) {
  const context = await newContext(browser, 1440);
  try {
    await context.addInitScript((key) => {
      try {
        localStorage.removeItem(key);
      } catch {}
    }, DIRECTION_KEY);
    const page = await context.newPage();
    await page.goto(base + "#home", { waitUntil: "load" });
    await page.locator("#demo-role").waitFor({ timeout: 15000 });
    return await page.evaluate(() =>
      [...document.querySelectorAll('link[rel="stylesheet"]:not([data-direction-sheet])')].map(
        (link) => link.getAttribute("href"),
      ),
    );
  } finally {
    await context.close();
  }
}

async function shoot(browser, direction, width, expected) {
  const started = Date.now();
  const context = await newContext(browser, width);
  const errors = [];
  const noise = [];
  const problems = [];
  try {
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push("pageerror: " + e.message.split("\n")[0]));
    page.on("console", (m) => {
      if (m.type() !== "error" && m.type() !== "warning") return;
      (NOISE.test(m.text()) ? noise : errors).push(`${m.type()}: ${m.text().slice(0, 200)}`);
    });
    page.on("requestfailed", (r) => {
      const why = r.failure()?.errorText ?? "";
      (why === "net::ERR_ABORTED" ? noise : errors).push(`request failed (${why}): ${r.url()}`);
    });
    const query = `?direction=${direction}` + (variant ? `&variant=${variant}` : "");
    await page.goto(`${base}directions/specimen.html${query}`, {
      waitUntil: "load",
    });
    await page.locator('#specimen[data-ready="true"]').waitFor({ timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
    // Fonts, the sample art of the loader's sprite and of sample.css backgrounds, decoded.
    await page.evaluate(async () => {
      await document.fonts.ready;
      const urls = new Set(
        [...document.querySelectorAll("#direction-defs image")].map((el) => el.href.baseVal),
      );
      for (const el of document.querySelectorAll("#specimen *")) {
        const bg = getComputedStyle(el).backgroundImage;
        for (const m of bg.matchAll(/url\("([^"]+)"\)/g)) urls.add(m[1]);
      }
      await Promise.all(
        [...urls].map((src) => {
          const img = new Image();
          img.src = src;
          return img.decode().catch(() => {});
        }),
      );
      document.activeElement?.blur?.();
    });
    await page.mouse.move(0, 0);
    const report = await page.evaluate(() => ({
      ...globalThis.specimenReport,
      attribute: document.documentElement.dataset.direction ?? null,
      stored: localStorage.getItem("d20-dev-direction"),
      variant: document.documentElement.dataset.variant ?? null,
      variantKey: localStorage.getItem("d20-dev-variant"),
      height: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - innerWidth,
    }));
    // Checks: the direction applied as the loader applies it, every sheet loaded, the same
    // stylesheet list as the app, no page error, no sideways page scroll.
    const id = ["off", "current"].includes(direction) ? null : direction;
    if (report.attribute !== id)
      problems.push(`data-direction is «${report.attribute}», expected «${id}»`);
    if (direction === "off" && report.stored !== null) problems.push("direction key still set");
    if (direction !== "off" && report.stored === null) problems.push("direction key not set");
    if (id && !report.direction.some((href) => href.endsWith(`directions/${id}/direction.css`)))
      problems.push(`directions/${id}/direction.css not linked`);
    // Every requested variant applied (one with no file in variants/ is not: a typo fails).
    const wanted = variant ? variant.split(",").join(" ") : null;
    if (report.variant !== wanted)
      problems.push(`data-variant is «${report.variant}», expected «${wanted}»`);
    if (report.variantKey !== (variant || null))
      problems.push(`variant key is ${report.variantKey}`);
    if (report.missing.length) problems.push(`sheets not loaded: ${report.missing.join(", ")}`);
    if (report.drift) problems.push(`static sheets drifted from index.html`);
    if (expected && normalise(report.app).join() !== expected.join())
      problems.push("stylesheet list differs from the running app");
    if (report.overflowX > 0) problems.push(`page scrolls sideways by ${report.overflowX} px`);
    problems.push(...errors);
    const buf = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
    const file = fileName(direction, width);
    const target = problems.length ? path.join(out, "_failed", file) : path.join(out, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, buf);
    return {
      file: path.relative(out, target),
      direction,
      ...(variant ? { variant } : {}),
      width,
      height: report.height,
      ok: problems.length === 0,
      problems,
      noise,
      sheets: { app: report.app.length, direction: report.direction },
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      file: null,
      direction,
      ...(variant ? { variant } : {}),
      width,
      ok: false,
      problems: ["failed: " + error.message.split("\n")[0], ...errors],
      noise,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch();
  try {
    const app = normalise(await appSheets(browser));
    const jobs = directions.flatMap((d) => widths.map((w) => [d, w]));
    const results = [];
    const queue = [...jobs];
    const worker = async () => {
      for (let job = queue.shift(); job; job = queue.shift()) {
        const row = await shoot(browser, ...job, app);
        results.push(row);
        console.log(`${row.ok ? "ok  " : "FAIL"} ${row.file ?? fileName(...job)}`);
        for (const p of row.problems) console.log(`     ${p}`);
      }
    };
    await Promise.all(Array.from({ length: Math.max(1, Number(values.jobs) || 1) }, worker));
    // One row per file: a re-run replaces the earlier row.
    const manifestFile = path.join(out, "manifest.json");
    let previous = [];
    try {
      previous = JSON.parse(fs.readFileSync(manifestFile, "utf8")).shots ?? [];
    } catch {}
    const key = (r) => `${suffix(r.direction, r.variant)}|${r.width}`;
    const fresh = new Set(results.map(key));
    const shots = [...previous.filter((r) => !fresh.has(key(r))), ...results].sort((a, b) =>
      key(a).localeCompare(key(b)),
    );
    fs.writeFileSync(
      manifestFile,
      JSON.stringify(
        {
          page: `${base}directions/specimen.html`,
          browser: `chromium ${browser.version()}`,
          capturedAt: new Date().toISOString(),
          appSheets: app,
          shots,
        },
        null,
        2,
      ) + "\n",
    );
    const drift = results.some((r) =>
      r.problems.includes("stylesheet list differs from the running app"),
    );
    if (drift) console.log("The specimen's stylesheet list differs from the running app.");
    process.exitCode = drift ? 2 : results.every((r) => r.ok) ? 0 : 1;
  } finally {
    await browser.close();
  }
}

await main();
