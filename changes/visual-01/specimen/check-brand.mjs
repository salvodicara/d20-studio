#!/usr/bin/env node
// Checks the brand hook of the dev-only «Direzione» loader (Phase C, visual-01, I-251) in a real
// browser, without writing in any direction folder: a test brand.mjs for one direction is served
// by Playwright (page.route), never saved to disk.
//
//   1. Zero effect: with no direction (key removed), #app, the whole <html> and the favicon href
//      on #home and #table are identical to the --before server (the same app before the hook,
//      e.g. `git archive HEAD design/blueprint` served on another port). Skipped without --before.
//   2. Hook: «Attuale» → the test brand (header mark replaced, tab icon swapped to its data: URL)
//      → light theme (both step aside) → dark again → «Attuale» (mark, favicon href and #app as
//      before the switch) → off (as step 1).
//   3. A direction without brand.mjs keeps today's mark and tab icon (one caught 404).
//   4. The specimen's «Marchio» section shows the test brand (a screenshot).
//
// Usage (from the worktree root, server on 8881; GNU timeout is not installed):
//   perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/check-brand.mjs \
//     --out <dir> [--before http://127.0.0.1:8886/] [--direction bg3] [--plain bg3]
// --direction: the id that gets the test brand.mjs; --plain: an id with no brand.mjs on disk.
// Exit code 0 when every check passes, 1 otherwise; <out>/check-brand.json lists them.
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { chromium } from "playwright";

const { values } = parseArgs({
  options: {
    out: { type: "string" },
    base: { type: "string", default: "http://127.0.0.1:8881/" },
    before: { type: "string" },
    direction: { type: "string", default: "bg3" },
    plain: { type: "string", default: "bg3" },
  },
});
if (!values.out) {
  console.log("Usage: node check-brand.mjs --out <dir> [--before <url>] [--direction id]");
  process.exit(1);
}
const slash = (url) => (url.endsWith("/") ? url : url + "/");
const base = slash(values.base);
const out = path.resolve(values.out);
fs.mkdirSync(out, { recursive: true });
const KEY = "d20-dev-direction";
const NOW = new Date("2026-10-01T10:00:00+02:00");

// The test brand: geometry from the real brand-geometry.mjs, marked so the checks can find it.
const TEST_BRAND = `import * as g from "../brand-geometry.mjs";
export function directionLogo(className) {
  const id = "test-" + g.uniqueSuffix();
  const faces = g.svgFaces((face) =>
    face.role === "front"
      ? { fill: "url(#" + id + ")" }
      : { fill: "currentColor", "fill-opacity": (0.4 + 0.6 * face.tone).toFixed(2) });
  return g.logoSvg(className,
    '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#d9e4ff"/></linearGradient></defs>' +
    '<g data-test-brand="" stroke="#0b1020" stroke-width="2" stroke-linejoin="round">' + faces + '</g>' +
    g.numeral('font-family="Georgia, serif" font-weight="700" fill="#0b1020" style="font-variant-numeric: lining-nums"'));
}
export const favicon = g.faviconSvg('<polygon points="' + g.OUTLINE + '" fill="#4f7cff" stroke="#0b1020" stroke-width="5" stroke-linejoin="round"/><polygon points="' + g.CENTER_FACE + '" fill="#ffffff" stroke="#0b1020" stroke-width="5" stroke-linejoin="round"/>');
`;

const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok: Boolean(ok), ...(detail ? { detail } : {}) });
  console.log(`${ok ? "ok  " : "FAIL"} ${name}${detail && !ok ? ` · ${detail}` : ""}`);
};

async function context(browser, { route = false, direction = null } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: "dark",
    serviceWorkers: "block",
  });
  await ctx.clock.setFixedTime(NOW);
  await ctx.addInitScript(
    ({ key, value }) => {
      try {
        if (sessionStorage.getItem("check-brand-init")) return; // only before the first load
        sessionStorage.setItem("check-brand-init", "1");
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {}
    },
    { key: KEY, value: direction },
  );
  if (route)
    await ctx.route(`**/directions/${values.direction}/brand.mjs`, (r) =>
      r.fulfill({ status: 200, contentType: "text/javascript", body: TEST_BRAND }),
    );
  const page = await ctx.newPage();
  const noise = [];
  page.on("pageerror", (e) => noise.push("pageerror: " + e.message.split("\n")[0]));
  page.on("console", (m) => m.type() === "error" && noise.push("console: " + m.text()));
  return { ctx, page, noise };
}

async function open(page, url) {
  await page.goto(url, { waitUntil: "load" });
  await page.locator("#demo-role").waitFor({ timeout: 15000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
}

// Markup with the page's origin (it differs between --base and --before) and the uploaded
// sample art's blob: ids (new on every load) written out as fixed tokens.
const snapshot = (page) =>
  page.evaluate(() => {
    const norm = (s) =>
      s
        ?.replaceAll(location.origin, "ORIGIN")
        .replaceAll(encodeURIComponent(location.origin), "ORIGIN")
        .replace(/blob:ORIGIN\/[0-9a-f-]{36}/g, "blob:ORIGIN/ID") ?? null;
    return {
      html: norm(document.documentElement.outerHTML),
      app: norm(document.querySelector("#app")?.outerHTML),
      icon: document.querySelector('link[rel="icon"]')?.getAttribute("href") ?? null,
      mark: document.querySelector("header .brand svg")?.outerHTML ?? null,
      direction: document.documentElement.dataset.direction ?? null,
    };
  });

async function switchTo(page, value) {
  await page.selectOption("#demo-direction", value);
  await page.waitForFunction(
    (v) =>
      v === "current"
        ? !document.documentElement.dataset.direction
        : document.documentElement.dataset.direction === v,
    value,
  );
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(150);
}

const firstDiff = (a, b) => {
  if (a === b) return "";
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return `at ${i}: «${a.slice(Math.max(0, i - 60), i + 60)}» vs «${b.slice(Math.max(0, i - 60), i + 60)}»`;
};

const browser = await chromium.launch();
try {
  // 1. Zero effect with no direction.
  const plainState = {};
  for (const route of ["home", "table"]) {
    const after = await context(browser);
    await open(after.page, `${base}#${route}`);
    plainState[route] = await snapshot(after.page);
    await after.ctx.close();
    if (!values.before) continue;
    const before = await context(browser);
    await open(before.page, `${slash(values.before)}#${route}`);
    const was = await snapshot(before.page);
    await before.ctx.close();
    const now = plainState[route];
    check(
      `off #${route}: #app identical to before`,
      now.app === was.app,
      firstDiff(now.app, was.app),
    );
    check(
      `off #${route}: <html> identical to before`,
      now.html === was.html,
      firstDiff(now.html, was.html),
    );
    check(`off #${route}: favicon href identical to before`, now.icon === was.icon);
  }
  const own = plainState.home;
  check(
    "off: no data-direction, a favicon is present",
    !own.direction && own.icon?.startsWith("data:"),
  );

  // 2. The hook, with the test brand served for one direction.
  const { ctx, page, noise } = await context(browser, { route: true, direction: "current" });
  await open(page, `${base}#home`);
  const current = await snapshot(page);
  check(
    "«Attuale»: today's mark and tab icon",
    current.mark === own.mark && current.icon === own.icon,
  );
  await switchTo(page, values.direction);
  const branded = await snapshot(page);
  check(
    `${values.direction} + test brand.mjs: the header mark is the direction's`,
    /data-test-brand/.test(branded.mark ?? ""),
  );
  const expectedIcon = await page.evaluate(
    async () =>
      `data:image/svg+xml,${encodeURIComponent((await import(`/directions/${document.documentElement.dataset.direction}/brand.mjs`)).favicon)}`,
  );
  check(
    `${values.direction}: the tab icon is the direction's favicon`,
    branded.icon === expectedIcon,
  );
  const marks = await page.evaluate(() => {
    const ids = [...document.querySelectorAll(".brand svg [id]")].map((el) => el.id);
    return { count: document.querySelectorAll(".brand svg").length, ids };
  });
  check(
    "every mark on the page has its own gradient id",
    new Set(marks.ids).size === marks.ids.length,
    JSON.stringify(marks),
  );
  await page
    .locator("header.app-header")
    .screenshot({ path: path.join(out, `header-test-brand-${values.direction}.png`) });

  await page.evaluate(() => (document.documentElement.dataset.prefTheme = "light"));
  await page.waitForTimeout(100);
  const light = await page.evaluate(async () => ({
    icon: document.querySelector('link[rel="icon"]').getAttribute("href"),
    logo: (await import("/ui.mjs")).logo(),
  }));
  check("light theme: the tab icon steps aside (today's href)", light.icon === own.icon);
  check(
    "light theme: logo() steps aside (today's mark)",
    !/data-test-brand/.test(light.logo) &&
      light.logo.startsWith('<svg class="logo" viewBox="0 0 32 32"'),
  );
  await page.evaluate(() => (document.documentElement.dataset.prefTheme = "dark"));
  await page.waitForTimeout(100);
  check(
    "dark again: the direction's tab icon is back",
    (await page.evaluate(() => document.querySelector('link[rel="icon"]').getAttribute("href"))) ===
      expectedIcon,
  );

  await switchTo(page, "current");
  const back = await snapshot(page);
  check("back to «Attuale»: favicon href restored byte for byte", back.icon === own.icon);
  check("back to «Attuale»: the header mark is today's", back.mark === own.mark);
  check(
    "back to «Attuale»: #app as before the switch",
    back.app === current.app,
    firstDiff(back.app, current.app),
  );
  await open(page, `${base}?direction=off#home`);
  const off = await snapshot(page);
  check("then off: #app as with no key", off.app === own.app, firstDiff(off.app, own.app));
  check("then off: <html> as with no key", off.html === own.html, firstDiff(off.html, own.html));
  check(
    "no page error during the switches",
    !noise.some((n) => n.startsWith("pageerror")),
    noise.join(" | "),
  );
  await ctx.close();

  // 3. A direction with no brand.mjs on disk.
  const plain = await context(browser, { direction: values.plain });
  await open(plain.page, `${base}#home`);
  const kept = await snapshot(plain.page);
  check(
    `${values.plain} without brand.mjs: today's mark`,
    kept.direction === values.plain && kept.mark === own.mark,
  );
  check(`${values.plain} without brand.mjs: today's tab icon`, kept.icon === own.icon);
  check(
    `${values.plain} without brand.mjs: only the known 404 noise`,
    plain.noise.every((n) => /status of 404/.test(n)),
    plain.noise.join(" | "),
  );
  await plain.ctx.close();

  // 4. The specimen's «Marchio» section with the test brand.
  const spec = await context(browser, { route: true });
  await spec.page.goto(`${base}directions/specimen.html?direction=${values.direction}`, {
    waitUntil: "load",
  });
  await spec.page.locator('#specimen[data-ready="true"]').waitFor({ timeout: 20000 });
  await spec.page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await spec.page.evaluate(() => document.fonts.ready);
  const cells = await spec.page.evaluate(() => ({
    marks: document.querySelectorAll("#specimen-brand svg [data-test-brand]").length,
    ids: [...document.querySelectorAll("#specimen-brand svg [id]")].map((el) => el.id),
    favicons: [...document.querySelectorAll("#specimen-brand img.specimen-favicon")].map((img) =>
      img.getAttribute("src").slice(0, 40),
    ),
    caption: [...document.querySelectorAll("#specimen-brand .specimen-class")]
      .map((el) => el.textContent)
      .find((t) => t.startsWith("link")),
  }));
  check(
    "specimen «Marchio»: every mark is the test brand (1× 2× Tavolo, 6+6 sizes, 3×)",
    cells.marks === 16,
    JSON.stringify(cells),
  );
  check(
    "specimen «Marchio»: 16 marks, 16 distinct gradient ids",
    cells.ids.length === 16 && new Set(cells.ids).size === 16,
  );
  check(
    "specimen «Marchio»: the favicon cells show the direction's",
    cells.favicons.length === 4 && /della direzione/.test(cells.caption ?? ""),
  );
  await spec.page
    .locator("#specimen-brand")
    .screenshot({ path: path.join(out, `spec-brand-test-${values.direction}.png`) });
  await spec.ctx.close();
} finally {
  await browser.close();
}
fs.writeFileSync(
  path.join(out, "check-brand.json"),
  JSON.stringify(
    { base, before: values.before ?? null, at: new Date().toISOString(), checks },
    null,
    2,
  ) + "\n",
);
const failed = checks.filter((c) => !c.ok).length;
console.log(`${checks.length - failed}/${checks.length} checks passed`);
process.exitCode = failed ? 1 : 0;
