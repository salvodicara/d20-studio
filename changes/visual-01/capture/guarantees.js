#!/usr/bin/env node
// Phase C guarantees, measured deterministically for any list of directions (no agent judgement).
//
//   node changes/visual-01/capture/guarantees.js --directions bg3,ddb [--out <dir>] [--jobs 3]
//
// Live checks (Chromium, dark, Italian, through the capture kit's own states):
//   - hotbar ≤ 120 px at 1440×900 in combat (player and DM);
//   - End turn, Undo and Cancel on screen and on top at 1440 and 390 in combat;
//   - no horizontal overflow at 390 on Home, Scheda and Tavolo;
//   - the app header on one row at 390 (Home and Tavolo);
//   - «Entra al Tavolo» inside the first 844 px at 390;
//   - keyboard focus ring (after a real Tab) visible and not clipped by the viewport or by an
//     overflow-clipping ancestor, on the brand button, End turn, a hotbar action and a sheet tab.
// Static checks on directions/<id>/direction.css: no !important, no text-transform, every
// selector (split on top-level commas) starts with :root[data-direction="<id>"].
"use strict";
const fs = require("node:fs");
const path = require("node:path");
const { parseArgs } = require("node:util");
const { buildGroups, shootGroup, pool } = require("./shoot.js");

const ROOT = path.resolve(__dirname, "../../..");
const DIRS = path.join(ROOT, "design/blueprint/directions");

function staticCheck(id) {
  const file = path.join(DIRS, id, "direction.css");
  if (!fs.existsSync(file))
    return { important: 0, textTransform: 0, unprefixed: 0, unprefixedSample: [], skipped: true };
  const css = fs.readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const splitTop = (s) => {
    const out = [];
    let depth = 0;
    let cur = "";
    for (const c of s) {
      if (c === "(") depth++;
      if (c === ")") depth--;
      if (c === "," && depth === 0) {
        out.push(cur);
        cur = "";
      } else cur += c;
    }
    out.push(cur);
    return out;
  };
  const unprefixed = [];
  let buf = "";
  const stack = [];
  for (const ch of css) {
    if (ch === "{") {
      const sel = buf.trim();
      buf = "";
      if (sel.startsWith("@")) stack.push(sel);
      else {
        const inert = stack.some((a) => /keyframes|font-face/.test(a));
        if (!inert && !/^(from|to|\d+%)/.test(sel))
          for (const s of splitTop(sel))
            if (!s.trim().startsWith(`:root[data-direction="${id}"]`))
              unprefixed.push(s.trim().slice(0, 100));
        stack.push("rule");
      }
    } else if (ch === "}") {
      stack.pop();
      buf = "";
    } else if (ch === ";" && stack[stack.length - 1] !== "rule") buf = "";
    else buf += ch;
  }
  return {
    important: (css.match(/!important/g) || []).length,
    textTransform: (css.match(/text-transform/g) || []).length,
    unprefixed: unprefixed.length,
    unprefixedSample: unprefixed.slice(0, 3),
  };
}

// In-page measurements; runs on the kit's settled page.
async function inspect(page, group) {
  const state = group.variants[0].state;
  const mobile = page.viewportSize().width < 768;
  const res = await page.evaluate(
    ({ state, mobile }) => {
      const vw = innerWidth;
      const vh = innerHeight;
      const q = (s) => document.querySelector(s);
      const box = (el) => el && el.getBoundingClientRect();
      const onTop = (el) => {
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw)
          return false;
        const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
        return !!hit && (hit === el || el.contains(hit));
      };
      const out = { state };
      out.overflowX = document.documentElement.scrollWidth - vw;
      const header = q(".app-header");
      if (header) {
        const kids = [...header.children].filter((k) => k.getBoundingClientRect().width > 0);
        const tops = new Set(kids.map((k) => Math.round(k.getBoundingClientRect().top / 8)));
        out.headerRows = tops.size;
        out.headerHeight = Math.round(header.getBoundingClientRect().height);
      }
      if (state.startsWith("table-combat")) {
        const hb = q(".action-dock.table-hotbar");
        out.hotbar = hb ? Math.round(hb.getBoundingClientRect().height) : null;
        out.endTurn = onTop(q('[data-table="end-turn"]'));
        out.undo = onTop(q('[data-table="undo"]'));
        out.cancel = onTop(q('[data-table="cancel"]'));
      }
      if (state === "home" && mobile) {
        const enter = q('.resume-scene [data-nav="table"]');
        out.enterBottom = enter ? Math.round(box(enter).bottom + scrollY) : null;
      }
      return out;
    },
    { state, mobile },
  );
  // Focus rings: a real Tab first so :focus-visible applies to programmatic focus.
  const targets = {
    "table-combat": [".app-header .brand", '[data-table="end-turn"]', ".combat-action"],
    sheet: [".app-header .brand", ".character-tabs button"],
    home: [".app-header .brand"],
  }[state];
  if (targets) {
    await page.keyboard.press("Tab");
    res.focus = [];
    for (const sel of targets) {
      const r = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { sel, missing: true };
        el.focus();
        el.scrollIntoView({ block: "center", inline: "center" });
        const cs = getComputedStyle(el);
        const w = parseFloat(cs.outlineWidth) || 0;
        const off = parseFloat(cs.outlineOffset) || 0;
        const r = el.getBoundingClientRect();
        const ring = {
          left: r.left - off - w,
          top: r.top - off - w,
          right: r.right + off + w,
          bottom: r.bottom + off + w,
        };
        const visible = el.matches(":focus-visible") && cs.outlineStyle !== "none" && w >= 2;
        let clip = 0;
        const edges = [{ left: 0, top: 0, right: innerWidth, bottom: innerHeight }];
        for (let a = el.parentElement; a; a = a.parentElement) {
          const s = getComputedStyle(a);
          if (/(hidden|clip|auto|scroll)/.test(s.overflowX + s.overflowY))
            edges.push(a.getBoundingClientRect());
        }
        for (const e of edges)
          clip = Math.max(
            clip,
            e.left - ring.left,
            e.top - ring.top,
            ring.right - e.right,
            ring.bottom - e.bottom,
          );
        return { sel, visible, width: w, clippedPx: Math.max(0, Math.round(clip * 10) / 10) };
      }, sel);
      res.focus.push(r);
    }
  }
  return res;
}

async function main() {
  const { values } = parseArgs({
    options: {
      directions: { type: "string" },
      out: {
        type: "string",
        default: path.join(
          require("node:os").homedir(),
          "Workspace/Codex/d20-blueprint-evidence/2026-09-30/visual-01/guarantees",
        ),
      },
      base: { type: "string", default: "http://127.0.0.1:8881/" },
      jobs: { type: "string", default: "3" },
    },
  });
  const ids = values.directions
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const playwright = require("playwright");
  const browser = await playwright.chromium.launch();
  const report = {};
  try {
    for (const id of ids) {
      const groups = [
        ...buildGroups({
          states: "table-combat,table-combat-dm",
          themes: "dark",
          widths: "1440,390",
          directions: id,
        }),
        ...buildGroups({
          states: "home,sheet",
          themes: "dark",
          widths: "1440,390",
          directions: id,
        }),
        ...buildGroups({ states: "table-explore", themes: "dark", widths: "390", directions: id }),
      ];
      const opts = {
        out: path.join(values.out, id),
        base: values.base,
        now: "2026-09-30T19:00:00+02:00",
        browser: "chromium",
        reducedMotion: false,
        inspect,
      };
      const rows = (
        await pool(groups, Number(values.jobs) || 3, (g) => shootGroup(browser, g, opts))
      ).flat();
      report[id] = {
        static: staticCheck(id),
        live: rows.map((r) => ({
          state: r.state,
          width: r.width,
          problems: r.problems,
          ...(r.inspected || {}),
        })),
      };
      fs.mkdirSync(values.out, { recursive: true });
      fs.writeFileSync(path.join(values.out, "guarantees.json"), JSON.stringify(report, null, 1));
    }
  } finally {
    await browser.close();
  }
  fs.mkdirSync(values.out, { recursive: true });
  fs.writeFileSync(path.join(values.out, "guarantees.json"), JSON.stringify(report, null, 1));
  const failsOf = (r) => {
    const fails = [];
    if (r.static.important) fails.push(`!important×${r.static.important}`);
    if (r.static.textTransform) fails.push(`text-transform×${r.static.textTransform}`);
    if (r.static.unprefixed) fails.push(`unprefixed×${r.static.unprefixed}`);
    for (const l of r.live) {
      const tag = `${l.state}@${l.width}`;
      if (l.problems?.length) fails.push(`${tag} kit:${l.problems.join("|")}`);
      if (l.overflowX > 0 && String(l.width) === "390")
        fails.push(`${tag} overflow+${l.overflowX}`);
      if (l.hotbar != null && String(l.width) === "1440" && l.hotbar > 120)
        fails.push(`${tag} hotbar ${l.hotbar}`);
      if (
        l.state?.startsWith("table-combat") &&
        !l.problems?.length &&
        !(l.endTurn && l.undo && l.cancel)
      )
        fails.push(`${tag} endTurn/undo/cancel ${l.endTurn}/${l.undo}/${l.cancel}`);
      if (String(l.width) === "390" && l.headerRows > 1 && /^table/.test(l.state))
        fails.push(`${tag} header rows ${l.headerRows}`);
      if (l.enterBottom != null && l.enterBottom > 844) fails.push(`${tag} enter ${l.enterBottom}`);
      for (const f of l.focus || [])
        if (!f.missing && (!f.visible || f.clippedPx > 0.5))
          fails.push(`${tag} focus ${f.sel} visible=${f.visible} clipped=${f.clippedPx}`);
    }
    return fails;
  };
  // A failure that «Attuale» (today's look) also has is not a regression of the direction.
  const key = (f) => f.replace(/[-\d.]+/g, "#");
  const baseline = report.current ? new Set(failsOf(report.current).map(key)) : new Set();
  for (const [id, r] of Object.entries(report)) {
    const all = failsOf(r);
    const fails =
      id === "current" ? all : all.filter((f) => /kit:/.test(f) || !baseline.has(key(f)));
    const same = all.length - fails.length;
    console.log(
      `${fails.length ? "FAIL" : "ok  "} ${id}${same ? ` (${same} as in «Attuale»)` : ""}${fails.length ? " · " + fails.join("; ") : ""}`,
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
