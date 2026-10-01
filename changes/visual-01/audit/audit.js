#!/usr/bin/env node
// Design-value audit for Phase C (visual-01, I-250): for one direction, reach the round-1 states
// of the real app with the capture kit (shoot.js), read every visible element's computed design
// values in the page (collect.js), and report the value histograms, the inferred scales and their
// outliers, the component variants, the typography in use and the WCAG contrast of every text
// (report.js). Usage: see README.md next to this file, or run with --help.
"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { execFileSync } = require("node:child_process");
const { buildGroups, shootGroup, pool } = require("../capture/shoot.js");
const { collectDesignValues } = require("./collect.js");
const { buildReport, renderMarkdown } = require("./report.js");

const ROUND1 = [
  "home",
  "sheet",
  "sheet-full",
  "table-combat",
  "table-combat-dm",
  "table-explore",
  "sheet-spells",
  "sheet-inventory",
  "dialog-initiative",
  "token-menu",
].join(",");
const EVIDENCE = path.join(
  os.homedir(),
  "Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/audit",
);

const HELP = `Usage: node audit.js --direction <off|current|id> [options]

  --direction <name>   'off' (plain app), 'current' («Attuale») or a direction id   [required]
  --states <list>      states of the capture kit                 [the 10 round-1 states]
  --widths <list>      1440,390 or WxH values                                  [1440,390]
  --theme <name>       dark | light                                                [dark]
  --out <dir>          output folder           [${EVIDENCE}/<direction>]
  --base <url>         app URL (never 8879)                      [http://127.0.0.1:8881/]
  --now <iso|real>     fixed Date.now for the page                [2026-09-30T19:00:00+02:00]
  --jobs <n>           states captured in parallel                                    [3]
  --report-only        rebuild audit.json and audit.md from <out>/raw only

Runs into the same folder merge: raw/<state>-<theme>-<width>.json is replaced per state, and the
report is rebuilt from every raw file of the folder.`;

// ---------------------------------------------------------------- in-page inspection

async function platformFonts(page) {
  // The platform fonts Chromium actually used for each text element (CDP), by glyph count.
  const cdp = await page.context().newCDPSession(page);
  try {
    await cdp.send("DOM.enable");
    await cdp.send("CSS.enable");
    await cdp.send("DOM.getDocument", { depth: 0 });
    const { result } = await cdp.send("Runtime.evaluate", { expression: "window.__d20AuditText" });
    const { result: props } = await cdp.send("Runtime.getProperties", {
      objectId: result.objectId,
      ownProperties: true,
    });
    const out = [];
    await Promise.all(
      props
        .filter((p) => /^\d+$/.test(p.name) && p.value?.objectId)
        .map(async (p) => {
          // A node the app re-rendered away since the collection is skipped, not fatal.
          try {
            const { nodeId } = await cdp.send("DOM.requestNode", { objectId: p.value.objectId });
            const { fonts } = await cdp.send("CSS.getPlatformFontsForNode", { nodeId });
            out[Number(p.name)] = fonts
              .map((f) => ({ family: f.familyName, glyphs: f.glyphCount, custom: f.isCustomFont }))
              .sort((a, b) => b.glyphs - a.glyphs);
          } catch {
            out.missed = (out.missed ?? 0) + 1;
          }
        }),
    );
    return out;
  } finally {
    await cdp
      .send("Runtime.evaluate", { expression: "delete window.__d20AuditText" })
      .catch(() => {});
    await cdp.detach().catch(() => {});
  }
}

async function inspect(page) {
  const data = await page.evaluate(collectDesignValues);
  const fonts = await platformFonts(page);
  data.platformFontMisses = fonts.missed ?? 0;
  for (const r of data.records)
    if (r.t !== undefined) {
      r.pf = fonts[r.t] ?? [];
      r.pfam = r.pf[0]?.family ?? null;
      delete r.t;
    }
  return data;
}

// ---------------------------------------------------------------- contrast over varying backgrounds

// Text over a gradient, an image or the map: the computed layers only bound the ratio, so the
// rendered pixels are measured in the state's own screenshot, at the ring points collect.js chose
// 1–3 px around the text's ink box (only where the topmost element is also under the text's
// centre). Pixels of the text's own colour (neighbouring glyphs, icons) are ignored unless they
// are most of the ring. Worst = 10th percentile of the ratios, typical = median. Viewport shots
// only (a full-page capture re-lays the page out). The ring points are not kept in the raw file.
function measurePixels(records, png, viewport) {
  const todo = records.filter((r) => r.contrast?.ring?.length);
  if (!todo.length) return;
  const file = fs.readFileSync(png);
  const [W, H] = [file.readUInt32BE(16), file.readUInt32BE(20)]; // PNG IHDR
  const rgb = execFileSync("magick", [png, "-alpha", "off", "-depth", "8", "rgb:-"], {
    maxBuffer: W * H * 3 + 1024,
  });
  const dpr = W / viewport.width;
  const lin = (c) => ((c /= 255) <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  for (const r of todo) {
    const c = r.contrast;
    const px = [];
    for (let k = 0; k < c.ring.length; k += 2) {
      const i = Math.floor(c.ring[k] * dpr);
      const j = Math.floor(c.ring[k + 1] * dpr);
      if (i < 0 || j < 0 || i >= W || j >= H) continue;
      const o = (j * W + i) * 3;
      px.push([rgb[o], rgb[o + 1], rgb[o + 2]]);
    }
    delete c.ring;
    if (px.length < 12) continue;
    const [fr, fg, fb, fa] = c.fgRgba;
    const ratios = px.map(([pr, pg, pb]) => {
      // the text colour composited over this background pixel (alpha and opacity included)
      const f = lum(fr * fa + pr * (1 - fa), fg * fa + pg * (1 - fa), fb * fa + pb * (1 - fa));
      const b = lum(pr, pg, pb);
      return (Math.max(f, b) + 0.05) / (Math.min(f, b) + 0.05);
    });
    const ink = ratios.filter((q) => q < 1.25).length;
    const bg = ink / ratios.length < 0.4 ? ratios.filter((q) => q >= 1.25) : ratios;
    bg.sort((a, b) => a - b);
    const pick = (p) => Math.round(bg[Math.floor(p * (bg.length - 1))] * 100) / 100;
    c.computed = { ratio: c.ratio, best: c.best, verdict: c.verdict };
    c.ratio = pick(0.1);
    c.best = pick(0.5);
    c.pixels = bg.length;
    c.method += ", pixels";
    c.verdict = c.ratio >= c.need ? "pass" : "fail";
  }
}

// ---------------------------------------------------------------- report

function readRaws(dir, direction) {
  const rawDir = path.join(dir, "raw");
  if (!fs.existsSync(rawDir)) return [];
  return fs
    .readdirSync(rawDir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(fs.readFileSync(path.join(rawDir, f), "utf8")))
    .filter((r) => r.direction === direction);
}

function writeReport(out, direction, meta) {
  const raws = readRaws(out, direction);
  if (!raws.length) throw new Error(`No raw files for «${direction}» in ${out}/raw`);
  const report = buildReport(raws, {
    tool: "changes/visual-01/audit/audit.js",
    direction,
    generatedAt: new Date().toISOString(),
    base: raws[0].base,
    browser: raws[0].browser,
    theme: [...new Set(raws.map((r) => r.theme))].join(","),
    ...meta,
  });
  fs.writeFileSync(path.join(out, "audit.json"), JSON.stringify(report, null, 1) + "\n");
  fs.writeFileSync(path.join(out, "audit.md"), renderMarkdown(report));
  return report;
}

// ---------------------------------------------------------------- main

async function main() {
  const { values } = parseArgs({
    options: {
      direction: { type: "string" },
      states: { type: "string", default: ROUND1 },
      widths: { type: "string", default: "1440,390" },
      theme: { type: "string", default: "dark" },
      out: { type: "string" },
      base: { type: "string", default: "http://127.0.0.1:8881/" },
      now: { type: "string", default: "2026-09-30T19:00:00+02:00" },
      jobs: { type: "string", default: "3" },
      "report-only": { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
  });
  if (values.help) return console.log(HELP);
  const direction = values.direction;
  if (!direction || !/^[a-z0-9][a-z0-9-]*$/.test(direction))
    throw new Error("--direction <off|current|id> is required (see --help)");
  const out = path.resolve(values.out ?? path.join(EVIDENCE, direction));
  fs.mkdirSync(path.join(out, "raw"), { recursive: true });
  const t0 = Date.now();
  if (values["report-only"]) {
    const rep = writeReport(out, direction, {});
    return console.log(`${rep.headline.summary}\n→ ${path.join(out, "audit.md")}`);
  }

  const base = new URL(values.base).href;
  if (new URL(base).port === "8879")
    throw new Error("Port 8879 serves the frozen interview-01 copy: never audit it");
  const groups = buildGroups({
    states: values.states,
    themes: values.theme,
    widths: values.widths,
    directions: direction,
  });
  const playwright = require("playwright");
  const browser = await playwright.chromium.launch();
  const version = browser.version();
  const opts = {
    out: path.join(out, "shots"),
    base,
    now: values.now,
    browser: "chromium",
    reducedMotion: false,
    inspect,
  };
  let results;
  try {
    // One retry for a state that threw (a load timeout when the machine is busy) or whose
    // inspection failed; a failed kit check is deterministic and is not retried.
    const run = async (g, retry = true) => {
      const res = await shootGroup(browser, g, opts);
      const flaky = res.some(
        (r) => r.inspected?.error || r.problems?.some((p) => p.startsWith("failed:")),
      );
      if (!flaky || !retry) return res;
      console.log(`retry ${res[0].state}@${res[0].width} · ${res[0].problems.join("; ")}`);
      return run(g, false);
    };
    results = await pool(groups, Math.max(1, Number(values.jobs) || 1), (g) => run(g));
  } finally {
    await browser.close();
  }

  let failed = 0;
  // Viewport shots first: a viewport and a full-page variant share one inspection, and only the
  // viewport screenshot can be measured.
  results.sort((a, b) => Number(Boolean(a.fullPage)) - Number(Boolean(b.fullPage)));
  for (const r of results) {
    const data = r.inspected;
    if (!r.ok || !data || data.error) {
      failed++;
      const why = [...(r.problems ?? []), data?.error && "inspect: " + data.error].filter(Boolean);
      console.log(`FAIL ${r.state}@${r.width} · ${why.join("; ") || "not inspected"}`);
      // No stale raw file from an earlier run may stand in for this state in the report.
      fs.rmSync(path.join(out, "raw", `${r.state}-${r.theme}-${r.width}.json`), { force: true });
      continue;
    }
    const records = data.records.filter((x) => (r.fullPage ? x.inDoc : x.inView));
    if (!r.fullPage) measurePixels(records, path.join(opts.out, r.file), data.viewport);
    for (const x of records) delete x.contrast?.ring;
    const raw = {
      direction,
      state: r.state,
      theme: r.theme,
      width: r.width,
      height: r.height,
      fullPage: r.fullPage,
      role: r.role,
      route: r.route,
      base,
      browser: `chromium ${version}`,
      fixedNow: values.now,
      capturedAt: new Date().toISOString(),
      shot: path.join("shots", r.file),
      errors: r.errors,
      viewport: data.viewport,
      document: data.document,
      modalDialog: data.modalDialog,
      platformFontMisses: data.platformFontMisses,
      visited: data.visited,
      fontStacks: data.fontStacks,
      records,
    };
    const file = path.join(out, "raw", `${r.state}-${r.theme}-${r.width}.json`);
    fs.writeFileSync(file, JSON.stringify(raw) + "\n");
    console.log(`ok   ${r.state}@${r.width} · ${records.length} elements · ${r.ms} ms`);
  }
  const rep = writeReport(out, direction, {});
  console.log(rep.headline.summary);
  console.log(
    `→ ${path.join(out, "audit.md")} (${results.length - failed}/${results.length} states, ${Date.now() - t0} ms)`,
  );
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exitCode = 2;
});
