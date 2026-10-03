#!/usr/bin/env node
// Crops sections of the dev-only component specimen (Phase C, visual-01) for the I-248 board.
// For each direction it loads directions/specimen.html?direction=<id> at 1440 in dark, waits as
// shoot-specimen.mjs does (ready flag, network idle, fonts, sample art decoded), then:
//   - writes the full page to <specimen-out>/specimen-<dir>.png;
//   - records the page-coordinate boxes of every section (container + its level-2 heading) in
//     <specimen-out>/sections.json (one entry per direction; a re-run replaces it);
//   - crops these sections (device scale 1, full section width, 16 px margin) into <shots-out>:
//       Marchio                                     -> spec-brand-dark-1440-<dir>.png
//       Tipografia                                  -> spec-type-dark-1440-<dir>.png
//       Pulsanti                                    -> spec-buttons-dark-1440-<dir>.png
//       Campi dei moduli                            -> spec-fields-dark-1440-<dir>.png
//       Finestre di dialogo + Avvisi e suggerimenti -> spec-dialogs-dark-1440-<dir>.png
// With --variants <list> (round 2, one combination per run, one direction id) the page is
// specimen.html?direction=<id>&variant=<list> and every name gets «+<list with dots>» after the
// direction: specimen-bg3+c2.t3.png, spec-buttons-dark-1440-bg3+c2.t3.png.
// Sections are found by their visible title text, not by id, and the run fails when a title is
// missing. Never writes inside the worktree. First written for the board (evidence folder,
// 01/10/2026); this is the canonical copy, the board's crop-specimen.mjs runs it.
//
// Usage (from the worktree root, server on 8881; GNU timeout is not installed):
//   perl -e 'alarm 150; exec @ARGV' -- node changes/visual-01/specimen/crop-specimen.mjs \
//     --specimen-out <dir> --shots-out <dir> --directions off,current,bg3 [--crops brand] [--jobs 3]
//   … --directions bg3 --variants c2,t3
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

// The capture kit's own parser: the same list, the same errors, the same file suffix.
const { variantList } = createRequire(import.meta.url)("../capture/shoot.js");

const WORKTREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const HELP = `Usage: node crop-specimen.mjs --specimen-out <dir> --shots-out <dir> --directions <list>

  --directions <list>   'off' (no key), 'current' («Attuale») or direction ids     [required]
  --specimen-out <dir>  full pages and sections.json                              [required]
  --shots-out <dir>     the spec-<crop>-dark-1440-<dir>.png crops                 [required]
  --variants <list>     round-2 options inside the one direction id, one per axis
                        c,t,b,i (e.g. c2,t3; the last per axis wins)               [none]
  --crops <list>        brand,type,buttons,fields,dialogs                           [all]
  --base <url>          app URL                                    [http://127.0.0.1:8881/]
  --jobs <n>            directions captured in parallel                               [3]`;

const { values } = parseArgs({
  options: {
    base: { type: "string", default: "http://127.0.0.1:8881/" },
    directions: { type: "string" },
    variants: { type: "string" },
    crops: { type: "string" },
    jobs: { type: "string", default: "3" },
    "specimen-out": { type: "string" },
    "shots-out": { type: "string" },
    help: { type: "boolean", default: false },
  },
});
if (values.help || !values.directions || !values["specimen-out"] || !values["shots-out"]) {
  console.log(HELP);
  process.exit(values.help ? 0 : 1);
}
const list = (s) =>
  String(s)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
const base = values.base.endsWith("/") ? values.base : values.base + "/";
const directions = list(values.directions);
for (const d of directions)
  if (!/^[a-z0-9][a-z0-9-]*$/.test(d)) throw new Error(`Bad direction «${d}»`);
// --variants: one combination per run, inside the run's one direction (an id, not off/current).
const variant = variantList(values.variants);
if (values.variants !== undefined && !variant) throw new Error("--variants names no variant");
if (variant && (directions.length !== 1 || ["off", "current"].includes(directions[0])))
  throw new Error(`--variants needs exactly one direction id, not «${directions.join(",")}»`);
// `variant` "c2,t3" is written "+c2.t3" after the direction (as capture/shoot.js).
const suffix = (direction, variant) =>
  direction + (variant ? "+" + variant.split(",").join(".") : "");
const specimenOut = path.resolve(values["specimen-out"]);
const shotsOut = path.resolve(values["shots-out"]);
for (const dir of [specimenOut, shotsOut])
  if (dir === WORKTREE || dir.startsWith(WORKTREE + path.sep))
    throw new Error(`Refusing to write inside the worktree: ${dir}`);
fs.mkdirSync(specimenOut, { recursive: true });
fs.mkdirSync(shotsOut, { recursive: true });

const MARGIN = 16;
const ALL_CROPS = [
  { key: "brand", titles: ["Marchio"] },
  { key: "type", titles: ["Tipografia"] },
  { key: "buttons", titles: ["Pulsanti"] },
  { key: "fields", titles: ["Campi dei moduli"] },
  { key: "dialogs", titles: ["Finestre di dialogo", "Avvisi e suggerimenti"] },
];
const wanted = values.crops ? list(values.crops) : ALL_CROPS.map((c) => c.key);
const CROPS = ALL_CROPS.filter((c) => wanted.includes(c.key));
if (CROPS.length !== wanted.length)
  throw new Error(`Unknown crop in «${values.crops}»: ${ALL_CROPS.map((c) => c.key).join(",")}`);
const KNOWN_ABORTS =
  /old-watch\.webp|\/directions\/[a-z0-9-]+\/(icons|brand)\.mjs$|\/directions\/[a-z0-9-]+\/variants\/[ctbi]\d{1,2}\.(css|icons\.mjs)$/;
const NOISE = /Failed to load resource: the server responded with a status of 404/;

async function run(browser, direction) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    locale: "it-IT",
    timezoneId: "Europe/Rome",
    colorScheme: "dark",
    reducedMotion: "no-preference",
    serviceWorkers: "block",
  });
  const problems = [];
  const noise = [];
  try {
    const page = await context.newPage();
    page.on("pageerror", (e) => problems.push("page error: " + e.message));
    page.on("console", (m) => {
      if (m.type() !== "error") return;
      (NOISE.test(m.text()) ? noise : problems).push("console: " + m.text());
    });
    page.on("requestfailed", (r) => {
      const msg = `request failed: ${r.url()} (${r.failure()?.errorText})`;
      // Known noise (directions/README.md): the loader's HEAD probe of the sample map, and the
      // caught import of a direction's optional icons.mjs or brand.mjs when the file is absent,
      // and the HEAD probes of the variant files (Chromium reports a HEAD fetch as aborted; a
      // variant sheet that did not load is caught by specimenReport.missing instead).
      (KNOWN_ABORTS.test(r.url()) ? noise : problems).push(msg);
    });
    const query = `?direction=${direction}` + (variant ? `&variant=${variant}` : "");
    await page.goto(`${base}directions/specimen.html${query}`, {
      waitUntil: "load",
    });
    await page.locator('#specimen[data-ready="true"]').waitFor({ timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
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

    const info = await page.evaluate(() => {
      const box = (el) => {
        const r = el.getBoundingClientRect();
        return {
          x: Math.round(r.left + scrollX),
          y: Math.round(r.top + scrollY),
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      };
      // Everything painted by a section, to catch content that overflows its container
      // (absolute dialogs, tooltips, toasts). Each box is cut by its clipping ancestors (a stage
      // has overflow: auto), so content those ancestors hide does not widen the crop.
      const visibleRect = (el, section) => {
        const r = el.getBoundingClientRect();
        let { top, bottom, left, right } = r;
        for (let a = el.parentElement; a && a !== section.parentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.overflowX === "visible" && cs.overflowY === "visible") continue;
          const ar = a.getBoundingClientRect();
          if (cs.overflowX !== "visible")
            ((left = Math.max(left, ar.left)), (right = Math.min(right, ar.right)));
          if (cs.overflowY !== "visible")
            ((top = Math.max(top, ar.top)), (bottom = Math.min(bottom, ar.bottom)));
        }
        return { top, bottom, left, right, width: right - left, height: bottom - top };
      };
      const painted = (section) => {
        const s = section.getBoundingClientRect();
        let top = s.top,
          bottom = s.bottom,
          left = s.left,
          right = s.right;
        for (const el of section.querySelectorAll("*")) {
          const cs = getComputedStyle(el);
          if (cs.visibility === "hidden" || cs.display === "none") continue;
          const r = visibleRect(el, section);
          if (r.width < 2 || r.height < 2) continue;
          top = Math.min(top, r.top);
          bottom = Math.max(bottom, r.bottom);
          left = Math.min(left, r.left);
          right = Math.max(right, r.right);
        }
        return {
          x: Math.round(left + scrollX),
          y: Math.round(top + scrollY),
          width: Math.round(right - left),
          height: Math.round(bottom - top),
        };
      };
      const sections = [...document.querySelectorAll("section.specimen-section")].map((sec) => {
        const heading = sec.querySelector(':scope > [role="heading"][aria-level="2"], :scope > h2');
        return {
          id: sec.id,
          title: heading?.textContent.trim() ?? null,
          section: box(sec),
          heading: heading ? box(heading) : null,
          painted: painted(sec),
        };
      });
      return {
        sections,
        report: globalThis.specimenReport ?? null,
        attribute: document.documentElement.dataset.direction ?? null,
        stored: localStorage.getItem("d20-dev-direction"),
        variant: document.documentElement.dataset.variant ?? null,
        variantKey: localStorage.getItem("d20-dev-variant"),
        pageWidth: document.documentElement.scrollWidth,
        pageHeight: document.documentElement.scrollHeight,
        overflowX: document.documentElement.scrollWidth - innerWidth,
      };
    });

    const id = ["off", "current"].includes(direction) ? null : direction;
    if (info.attribute !== id)
      problems.push(`data-direction is «${info.attribute}», expected «${id}»`);
    if (direction === "off" && info.stored !== null) problems.push("direction key still set");
    if (direction !== "off" && info.stored === null) problems.push("direction key not set");
    if (!info.report) problems.push("no specimenReport");
    else {
      if (info.report.missing?.length)
        problems.push(`sheets not loaded: ${info.report.missing.join(", ")}`);
      if (info.report.drift) problems.push("static sheets drifted from index.html");
      if (id && !info.report.direction?.some((h) => h.endsWith(`directions/${id}/direction.css`)))
        problems.push(`directions/${id}/direction.css not linked`);
    }
    // Every requested variant applied (one with no file in variants/ is not: a typo fails).
    const wanted = variant ? variant.split(",").join(" ") : null;
    if (info.variant !== wanted)
      problems.push(`data-variant is «${info.variant}», expected «${wanted}»`);
    if (info.variantKey !== (variant || null)) problems.push(`variant key is ${info.variantKey}`);
    if (info.overflowX > 0) problems.push(`page scrolls sideways by ${info.overflowX} px`);
    // A variant that did not apply writes no image: a «+c5» file showing the plain direction
    // would mislead the board.
    if (info.variant !== wanted)
      return { direction, ...(variant ? { variant } : {}), ok: false, problems, noise };

    const fullFile = path.join(specimenOut, `specimen-${suffix(direction, variant)}.png`);
    fs.writeFileSync(
      fullFile,
      await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" }),
    );

    const crops = [];
    for (const crop of CROPS) {
      const found = crop.titles.map((t) => info.sections.find((s) => s.title === t));
      const missing = crop.titles.filter((t, i) => !found[i]);
      if (missing.length) {
        problems.push(`section not found: ${missing.join(", ")}`);
        continue;
      }
      // Union of the section containers and of everything they paint, plus the margin.
      const boxes = found.flatMap((s) => [s.section, s.painted]);
      const left = Math.min(...boxes.map((b) => b.x));
      const top = Math.min(...boxes.map((b) => b.y));
      const right = Math.max(...boxes.map((b) => b.x + b.width));
      const bottom = Math.max(...boxes.map((b) => b.y + b.height));
      const overflow = found.some(
        (s) =>
          s.painted.x < s.section.x ||
          s.painted.y < s.section.y ||
          s.painted.x + s.painted.width > s.section.x + s.section.width ||
          s.painted.y + s.painted.height > s.section.y + s.section.height,
      );
      const clip = {
        x: Math.max(0, left - MARGIN),
        y: Math.max(0, top - MARGIN),
        width: Math.min(info.pageWidth, right + MARGIN) - Math.max(0, left - MARGIN),
        height: Math.min(info.pageHeight, bottom + MARGIN) - Math.max(0, top - MARGIN),
      };
      const file = path.join(
        shotsOut,
        `spec-${crop.key}-dark-1440-${suffix(direction, variant)}.png`,
      );
      fs.writeFileSync(
        file,
        await page.screenshot({ fullPage: true, clip, animations: "disabled", caret: "hide" }),
      );
      crops.push({ file: path.basename(file), sections: crop.titles, clip, overflow });
    }

    return {
      direction,
      ...(variant ? { variant } : {}),
      ok: problems.length === 0,
      problems,
      noise,
      full: path.basename(fullFile),
      page: { width: info.pageWidth, height: info.pageHeight },
      sections: info.sections,
      crops,
    };
  } catch (error) {
    return {
      direction,
      ...(variant ? { variant } : {}),
      ok: false,
      problems: ["failed: " + error.message.split("\n")[0], ...problems],
      noise,
    };
  } finally {
    await context.close();
  }
}

const browser = await chromium.launch();
const results = [];
try {
  const queue = [...directions];
  const worker = async () => {
    for (let d = queue.shift(); d; d = queue.shift()) {
      const row = await run(browser, d);
      results.push(row);
      console.log(
        `${row.ok ? "ok  " : "FAIL"} ${suffix(d, variant)}` +
          (row.crops ? ` (${row.crops.length} crops)` : ""),
      );
      for (const p of row.problems) console.log(`     ${p}`);
      for (const c of row.crops ?? [])
        console.log(
          `     ${c.file} ${c.clip.width}x${c.clip.height} @${c.clip.x},${c.clip.y}${c.overflow ? " (overflow included)" : ""}`,
        );
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Number(values.jobs) || 1) }, worker));
  const manifestFile = path.join(specimenOut, "sections.json");
  let previous = [];
  try {
    previous = JSON.parse(fs.readFileSync(manifestFile, "utf8")).directions ?? [];
  } catch {}
  // One entry per direction and variant list: a re-run replaces it.
  const key = (r) => suffix(r.direction, r.variant);
  const fresh = new Set(results.map(key));
  const merged = [...previous.filter((r) => !fresh.has(key(r))), ...results].sort((a, b) =>
    key(a).localeCompare(key(b)),
  );
  fs.writeFileSync(
    manifestFile,
    JSON.stringify(
      {
        page: `${base}directions/specimen.html`,
        browser: `chromium ${browser.version()}`,
        viewport: "1440x900, dark, dpr 1, it-IT",
        margin: MARGIN,
        updatedAt: new Date().toISOString(),
        directions: merged,
      },
      null,
      2,
    ) + "\n",
  );
  process.exitCode = results.every((r) => r.ok) ? 0 : 1;
} finally {
  await browser.close();
}
