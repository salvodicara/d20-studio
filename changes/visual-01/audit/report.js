// Aggregation and Markdown rendering of the design-value audit (I-250). Input: the raw files
// written by audit.js (one per state and width: every visible element with its computed design
// values). Output: one machine-readable report object and its Markdown rendering.
"use strict";

const CONTROLS = new Set(["button", "input", "select", "tab", "menuitem", "toggle"]);
const COMPONENTS = ["button", "input", "select", "tab", "chip", "menuitem", "toggle", "panel"];
const SPACING = ["padding", "margin", "gap"];
// Base-step candidates; when none covers 85 % of the uses, the conventional 4 px (spacing) and
// 2 px (radius) grids are assumed for the off-step check, and the report says so.
const STEPS = { spacing: [8, 6, 5, 4, 3, 2], radius: [4, 2] };
const FALLBACK = { spacing: 4, radius: 2 };
const EXAMPLES = 5;

const uniq = (list) => [...new Set(list)];
// Browser defaults a curated design never leaves in place (I-250: nothing unattended).
const DEFAULTS = [
  {
    rule: "button keeps the browser's default padding (1px 6px)",
    test: (r) => (r.tag === "button" || r.tag === "input") && r.pad.join() === "1,6,1,6",
  },
  {
    rule: "text field keeps the browser's default padding (1px 2px)",
    test: (r) => r.kind === "input" && r.pad.join() === "1,2,1,2",
  },
  {
    rule: "field keeps the browser's default dark-scheme background (#3b3b3b)",
    test: (r) => (r.kind === "input" || r.kind === "select") && r.bg === "#3b3b3b",
  },
  {
    rule: "control keeps the browser's default font size (13.33px)",
    test: (r) => ["button", "input", "select", "textarea"].includes(r.tag) && r.fs === 13.33,
  },
];
const nz = (v) => v !== 0 && v !== null && v !== undefined;
const half = (n) => Math.round(n * 2) / 2;
const isNum = (v) => typeof v === "number";
const multiple = (v, step) => Math.abs(Math.abs(v) / step - Math.round(Math.abs(v) / step)) < 0.01;
const alphaOf = (hex) => (hex && hex.length === 9 ? parseInt(hex.slice(7), 16) / 255 : hex ? 1 : 0);

// Each property: which values one element contributes (deduplicated per element).
const PROPS = [
  {
    id: "padding",
    label: "Padding (any side, px)",
    numeric: true,
    step: "spacing",
    get: (r) => uniq(r.pad.filter(nz)),
  },
  {
    id: "margin",
    label: "Margin (any side, px; auto margins excluded)",
    numeric: true,
    step: "spacing",
    get: (r) => uniq(r.mar.filter((v) => isNum(v) && v !== 0)),
  },
  {
    id: "gap",
    label: "Gap / row-gap / column-gap of flex and grid containers with 2+ items (px)",
    numeric: true,
    step: "spacing",
    get: (r) => (r.gap && r.items >= 2 ? uniq(r.gap.filter(nz)) : []),
  },
  {
    id: "control-height",
    label: "Control height (buttons, inputs, selects, tabs, menu items, toggles; px)",
    numeric: true,
    step: "spacing",
    get: (r) => (CONTROLS.has(r.kind) ? [half(r.box[3])] : []),
  },
  {
    id: "chip-height",
    label: "Chip / badge / pill height (px)",
    numeric: true,
    get: (r) => (r.kind === "chip" ? [half(r.box[3])] : []),
  },
  {
    id: "font-family",
    label: "Font family (first available family of the stack)",
    text: true,
    get: (r) => [r.fam],
  },
  {
    id: "font-platform",
    label: "Font actually rendered (platform font with most glyphs)",
    text: true,
    get: (r) => (r.pfam ? [r.pfam] : []),
  },
  { id: "font-size", label: "Font size (px)", numeric: true, text: true, get: (r) => [r.fs] },
  { id: "font-weight", label: "Font weight", text: true, get: (r) => [String(r.fw)] },
  { id: "line-height", label: "Line height (px or normal)", text: true, get: (r) => [r.lh] },
  {
    id: "line-height-ratio",
    label: "Line height ÷ font size",
    text: true,
    get: (r) => [r.lh === "normal" ? "normal" : Math.round((r.lh / r.fs) * 100) / 100],
  },
  {
    id: "letter-spacing",
    label: "Letter spacing (px; 0 = normal)",
    numeric: true,
    text: true,
    get: (r) => [r.ls],
  },
  {
    id: "type-style",
    label: "Type styles (family size/line-height weight, letter spacing, caps)",
    text: true,
    get: (r) => [typeStyle(r)],
  },
  {
    id: "border-width",
    label: "Border width (visible sides, px)",
    numeric: true,
    get: (r) => uniq(r.bw.filter((w, i) => w && r.bc[i])),
  },
  {
    id: "border-radius",
    label: "Border radius (each corner; px, full = pill/circle)",
    step: "radius",
    get: (r) => uniq(r.br.filter(nz)),
  },
  { id: "box-shadow", label: "Box shadow", get: (r) => (r.shadow ? [r.shadow] : []) },
  { id: "color", label: "Text colour", text: true, get: (r) => [r.c] },
  {
    id: "background-color",
    label: "Background colour (non-transparent)",
    get: (r) => (r.bg ? [r.bg] : []),
  },
  {
    id: "border-color",
    label: "Border colour (visible sides)",
    get: (r) => uniq(r.bc.filter(Boolean)),
  },
  {
    id: "icon-size",
    label: "Icon size (inline SVG ≤ 64 px, w×h)",
    get: (r) =>
      r.kind === "icon" && r.box[2] <= 64 && r.box[3] <= 64
        ? [`${half(r.box[2])}×${half(r.box[3])}`]
        : [],
  },
];

const typeStyle = (r) =>
  `${r.fam} ${r.fs}/${r.lh} ${r.fw}` + (r.ls ? ` ls ${r.ls}` : "") + (r.caps ? ` ${r.caps}` : "");

// A visible text element whose text is not deliberately transparent.
const isText = (r) => r.text !== null && r.text !== undefined && r.contrast !== null;

function compact4(v) {
  const [t, r, b, l] = v.map((x) => (x === 0 ? "0" : String(x)));
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function lookOf(r) {
  const a = alphaOf(r.bg);
  const fill =
    r.bgi === "image"
      ? "image"
      : r.bgi === "gradient"
        ? "gradient"
        : a < 0.04
          ? "no fill"
          : a >= 0.9
            ? `solid ${r.bg.slice(0, 7)}`
            : `tint ${r.bg}`;
  const border = r.bc.some(Boolean) ? "border" : "no border";
  if (r.kind === "panel") return `${fill} · ${border} · ${r.shadow ? "shadow" : "no shadow"}`;
  return `${fill} · ${border} · ${r.content}`;
}

function variantOf(r) {
  if (r.kind === "panel")
    return `radius ${compact4(r.br)} · border ${compact4(r.bw)} · pad ${compact4(r.pad)}`;
  const border = `border ${compact4(r.bw.map((w, i) => (r.bc[i] ? w : 0)))}`;
  // A fixed-size icon-only control is defined by its box and glyph size, not by its padding.
  if (r.content === "icon")
    return [
      `${half(r.box[2])}×${half(r.box[3])}`,
      r.iconBox && `icon ${half(r.iconBox[0])}×${half(r.iconBox[1])}`,
      `radius ${compact4(r.br)}`,
      border,
    ]
      .filter(Boolean)
      .join(" · ");
  return [
    `h ${half(r.box[3])}`,
    `pad ${compact4(r.pad)}`,
    `font ${r.fs}/${r.fw} ${r.fam}`,
    `radius ${compact4(r.br)}`,
    border,
  ].join(" · ");
}

function inferStep(entries, family) {
  const nums = entries.filter((e) => isNum(e.value));
  const total = nums.reduce((s, e) => s + e.elements.size, 0) || 1;
  const coverage = STEPS[family].map((step) => ({
    step,
    share: round3(
      nums.filter((e) => multiple(e.value, step)).reduce((s, e) => s + e.elements.size, 0) / total,
    ),
  }));
  const pick = coverage.find((c) => c.share >= 0.85);
  if (pick) return { step: pick.step, share: pick.share, assumed: false, coverage };
  const step = FALLBACK[family];
  return { step, share: coverage.find((c) => c.step === step).share, assumed: true, coverage };
}
const round3 = (n) => Math.round(n * 1000) / 1000;

function buildReport(raws, meta) {
  const elements = new Map(); // identity → description
  const hist = Object.fromEntries(PROPS.map((p) => [p.id, new Map()]));
  const comps = Object.fromEntries(
    COMPONENTS.map((k) => [k, { byLook: new Map(), byClass: new Map() }]),
  );
  const contrast = new Map(); // identity|fg|bg → finding
  let rows = 0;

  for (const raw of raws) {
    const where = `${raw.state}@${raw.width}`;
    for (const r of raw.records) {
      rows++;
      const id = `${raw.width}|${r.key}`;
      if (!elements.has(id))
        elements.set(id, {
          id,
          width: raw.width,
          path: r.path,
          name: r.name || r.text || "",
          kind: r.kind,
          states: new Set(),
        });
      elements.get(id).states.add(where);
      for (const p of PROPS) {
        if (p.text && !isText(r)) continue;
        for (const value of p.get(r)) {
          const k = JSON.stringify(value);
          if (!hist[p.id].has(k))
            hist[p.id].set(k, { value, elements: new Set(), uses: 0, kinds: new Set() });
          const e = hist[p.id].get(k);
          e.elements.add(id);
          e.uses++;
          if (r.kind) e.kinds.add(r.kind);
        }
      }
      if (COMPONENTS.includes(r.kind)) {
        const variant = variantOf(r);
        for (const [map, key] of [
          [comps[r.kind].byLook, lookOf(r)],
          [comps[r.kind].byClass, r.sig],
        ]) {
          if (!map.has(key)) map.set(key, new Map());
          const vs = map.get(key);
          if (!vs.has(variant))
            vs.set(variant, { elements: new Set(), sigs: new Set(), widths: new Set() });
          const v = vs.get(variant);
          v.elements.add(id);
          v.sigs.add(r.sig);
          v.widths.add(raw.width);
        }
      }
      if (r.contrast && r.text) {
        const c = r.contrast;
        const k = [id, c.fg, (c.bg || []).join("+")].join("|");
        const seen = contrast.get(k);
        // A ratio measured in a screenshot beats one bounded from the layers (full-page states).
        if (!seen || (c.pixels && !seen.pixels)) {
          const { varying, fgRgba, ...kept } = c;
          contrast.set(k, {
            id,
            text: r.text,
            path: r.path,
            size: r.fs,
            weight: r.fw,
            ...kept,
            states: seen?.states ?? new Set(),
          });
        }
        contrast.get(k).states.add(where);
      }
    }
  }

  const describe = (ids) =>
    [...ids].slice(0, EXAMPLES).map((id) => {
      const e = elements.get(id);
      return { path: e.path, name: e.name, width: e.width, states: [...e.states] };
    });
  const sortEntries = (list, numeric) =>
    list.sort((a, b) =>
      numeric && isNum(a.value) && isNum(b.value)
        ? a.value - b.value
        : b.elements.size - a.elements.size || String(a.value).localeCompare(String(b.value)),
    );

  // Base steps: spacing (padding, margin, gap) and radius.
  const spacingEntries = SPACING.flatMap((id) => [...hist[id].values()]);
  const steps = {
    spacing: inferStep(spacingEntries, "spacing"),
    radius: inferStep([...hist["border-radius"].values()], "radius"),
  };

  const properties = {};
  for (const p of PROPS) {
    const entries = sortEntries([...hist[p.id].values()], p.numeric);
    const step = p.step ? steps[p.step].step : null;
    const outliers = [];
    for (const e of entries) {
      const why = [];
      if (e.elements.size <= 2)
        why.push(`rare (${e.elements.size} element${e.elements.size > 1 ? "s" : ""})`);
      if (step && isNum(e.value) && !multiple(e.value, step)) why.push(`not a multiple of ${step}`);
      if (isNum(e.value) && !Number.isInteger(e.value) && p.id !== "letter-spacing")
        why.push("fractional px");
      if (why.length)
        outliers.push({
          value: e.value,
          why,
          count: e.elements.size,
          elements: describe(e.elements),
        });
    }
    properties[p.id] = {
      label: p.label,
      distinct: entries.length,
      histogram: entries.map((e) => ({
        value: e.value,
        elements: e.elements.size,
        uses: e.uses,
        kinds: [...e.kinds],
      })),
      scale: entries.filter((e) => e.elements.size >= 3).map((e) => e.value),
      step,
      outliers,
    };
  }

  // Near-duplicate colours: distinct values a few units apart (probably meant to be one token).
  const nearDuplicates = {};
  for (const id of ["color", "background-color", "border-color"]) {
    const list = properties[id].histogram.map((h) => h.value).filter(Boolean);
    const pairs = [];
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) {
        const [a, b] = [list[i], list[j]].map(parseHex);
        const d = Math.max(
          ...[0, 1, 2].map((k) => Math.abs(a[k] - b[k])),
          Math.abs(a[3] - b[3]) * 255,
        );
        if (d <= 6) pairs.push([list[i], list[j]]);
      }
    nearDuplicates[id] = pairs;
  }

  const components = {};
  for (const kind of COMPONENTS) {
    const shape = (map) =>
      [...map.entries()]
        .map(([key, vs]) => ({
          key,
          elements: uniq([...vs.values()].flatMap((v) => [...v.elements])).length,
          variants: [...vs.entries()]
            .map(([variant, v]) => ({
              variant,
              elements: v.elements.size,
              widths: [...v.widths].sort((a, b) => b - a),
              classes: [...v.sigs].slice(0, 6),
              examples: describe(v.elements),
            }))
            .sort((a, b) => b.elements - a.elements),
        }))
        .sort((a, b) => b.variants.length - a.variants.length || b.elements - a.elements);
    const byLook = shape(comps[kind].byLook);
    const byClass = shape(comps[kind].byClass);
    const count = uniq(
      [...comps[kind].byLook.values()].flatMap((vs) =>
        [...vs.values()].flatMap((v) => [...v.elements]),
      ),
    ).length;
    components[kind] = {
      elements: count,
      visualClasses: byLook.length,
      variants: byLook.reduce((s, g) => s + g.variants.length, 0),
      multiVariant: byLook.filter((g) => g.variants.length > 1).length,
      byLook,
      byClass: byClass.filter((g) => g.variants.length > 1),
      cssClasses: byClass.length,
    };
  }

  const defaults = DEFAULTS.map((d) => {
    const ids = new Set();
    for (const raw of raws)
      for (const r of raw.records) if (d.test(r)) ids.add(`${raw.width}|${r.key}`);
    return { rule: d.rule, elements: ids.size, examples: describe(ids) };
  }).filter((d) => d.elements);

  const findings = [...contrast.values()].map((c) => ({ ...c, states: [...c.states] }));
  const measured = findings.filter((c) => ["pass", "fail", "uncertain"].includes(c.verdict));
  const fails = measured.filter((c) => c.verdict === "fail").sort((a, b) => a.ratio - b.ratio);
  const unsure = measured
    .filter((c) => c.verdict === "uncertain")
    .sort((a, b) => a.ratio - b.ratio);
  const contrastReport = {
    measured: measured.length,
    pass: measured.length - fails.length - unsure.length,
    fail: fails.length,
    uncertain: unsure.length,
    notMeasured: findings.length - measured.length,
    failures: fails,
    uncertainList: unsure,
  };

  const typography = {
    families: properties["font-family"].histogram,
    platformFonts: properties["font-platform"].histogram,
    sizes: properties["font-size"].histogram,
    weights: properties["font-weight"].histogram,
    lineHeights: properties["line-height"].histogram,
    stacks: mergeStacks(raws),
  };

  const headline = {
    elements: elements.size,
    rows,
    states: raws.length,
    spacing: {
      distinct: uniq(spacingEntries.map((e) => e.value)).length,
      step: steps.spacing.step,
      stepShare: steps.spacing.share,
      assumed: steps.spacing.assumed,
      scale: uniq(SPACING.flatMap((id) => properties[id].scale)).sort((a, b) => a - b),
      outlierValues: uniq(SPACING.flatMap((id) => properties[id].outliers.map((o) => o.value)))
        .length,
    },
    controlHeights: properties["control-height"].distinct,
    fontFamilies: properties["font-family"].distinct,
    platformFonts: properties["font-platform"].distinct,
    fontSizes: properties["font-size"].distinct,
    fontWeights: properties["font-weight"].distinct,
    lineHeights: properties["line-height"].distinct,
    typeStyles: properties["type-style"].distinct,
    radii: properties["border-radius"].distinct,
    borderWidths: properties["border-width"].distinct,
    shadows: properties["box-shadow"].distinct,
    colors: {
      text: properties.color.distinct,
      background: properties["background-color"].distinct,
      border: properties["border-color"].distinct,
      nearDuplicatePairs: Object.values(nearDuplicates).reduce((s, l) => s + l.length, 0),
    },
    buttons: {
      elements: components.button.elements,
      visualClasses: components.button.visualClasses,
      variants: components.button.variants,
      multiVariant: components.button.multiVariant,
    },
    contrast: {
      measured: contrastReport.measured,
      fail: contrastReport.fail,
      uncertain: contrastReport.uncertain,
    },
  };
  headline.summary =
    `${headline.elements} visible elements in ${headline.states} state shots · spacing ` +
    `${headline.spacing.distinct} values (${headline.spacing.assumed ? "no base step; " : "step "}${headline.spacing.step} px covers ` +
    `${Math.round(headline.spacing.stepShare * 100)} %, ${headline.spacing.outlierValues} outlier values) · ` +
    `${headline.controlHeights} control heights · ${headline.fontFamilies} font families ` +
    `(${headline.platformFonts} platform fonts), ${headline.fontSizes} sizes, ${headline.fontWeights} weights, ` +
    `${headline.typeStyles} type styles · ` +
    `${headline.radii} radii · ${headline.shadows} shadows · colours ${headline.colors.text} text / ` +
    `${headline.colors.background} background / ${headline.colors.border} border · buttons ` +
    `${headline.buttons.visualClasses} visual classes, ${headline.buttons.variants} variants ` +
    `(${headline.buttons.multiVariant} classes with >1 variant) · contrast ${headline.contrast.fail} ` +
    `failures + ${headline.contrast.uncertain} uncertain of ${headline.contrast.measured} texts`;

  return {
    ...meta,
    inputs: raws.map((r) => ({
      state: r.state,
      width: r.width,
      theme: r.theme,
      role: r.role,
      route: r.route,
      capturedAt: r.capturedAt,
      shot: r.shot,
      elements: r.records.length,
      errors: r.errors,
    })),
    headline,
    steps,
    properties,
    nearDuplicates,
    defaults,
    components,
    typography,
    contrast: contrastReport,
  };
}

function parseHex(h) {
  const n = (i) => parseInt(h.slice(i, i + 2), 16);
  return [n(1), n(3), n(5), h.length === 9 ? n(7) / 255 : 1];
}

function mergeStacks(raws) {
  const out = {};
  for (const raw of raws)
    for (const [stack, v] of Object.entries(raw.fontStacks || {})) out[stack] = v;
  return out;
}

// ---------------------------------------------------------------- Markdown

const code = (v) => "`" + String(v).replace(/`/g, "'") + "`";
const cell = (s) =>
  String(s ?? "")
    .replace(/\|/g, "\\|")
    .replace(/\n/g, " ");
const ex = (e) => `${code(e.path)}${e.name ? ` «${cell(e.name.slice(0, 40))}»` : ""} [${e.width}]`;
const histLine = (h, max = 60) =>
  h
    .slice(0, max)
    .map((x) => `${code(x.value)} ×${x.elements}`)
    .join(" · ") + (h.length > max ? ` · … (${h.length - max} more in audit.json)` : "");

function renderMarkdown(rep) {
  const H = rep.headline;
  const L = [];
  L.push(`# Design-value audit · ${rep.direction}`);
  L.push("");
  L.push(
    `Generated ${rep.generatedAt} by \`changes/visual-01/audit/audit.js\` (I-250) from ${H.states} ` +
      `state shots of the live app (${rep.base}, ${rep.browser}, theme ${rep.theme}). Every visible ` +
      `element's computed values were read; an element seen in several states counts once per ` +
      `width (${H.elements} elements, ${H.rows} element-state rows). Screenshots: \`shots/\`; raw ` +
      `values: \`raw/\`; everything below is also in \`audit.json\`.`,
  );
  L.push("");
  L.push("States: " + rep.inputs.map((i) => `${i.state}@${i.width}`).join(", ") + ".");
  L.push("");
  L.push("## Headline");
  L.push("");
  L.push("| Measure | Value |");
  L.push("| --- | --- |");
  L.push(`| Visible elements (unique per width) | ${H.elements} |`);
  L.push(
    `| Spacing values (padding, margin, gap) | ${H.spacing.distinct} distinct; ${H.spacing.assumed ? "no base step (the 4 px grid fits" : `base step ${H.spacing.step} px (covers`} ${Math.round(H.spacing.stepShare * 100)} %); ${H.spacing.outlierValues} outlier values |`,
  );
  L.push(`| Spacing scale (values used by ≥ 3 elements) | ${H.spacing.scale.join(" · ")} |`);
  L.push(`| Control heights | ${H.controlHeights} distinct |`);
  L.push(
    `| Typography | ${H.fontFamilies} families (first available), ${H.platformFonts} platform fonts rendered, ${H.fontSizes} sizes, ${H.fontWeights} weights, ${H.lineHeights} line heights, ${H.typeStyles} type styles |`,
  );
  L.push(`| Radii · border widths · shadows | ${H.radii} · ${H.borderWidths} · ${H.shadows} |`);
  L.push(
    `| Colours (text · background · border) | ${H.colors.text} · ${H.colors.background} · ${H.colors.border}; ${H.colors.nearDuplicatePairs} near-duplicate pairs |`,
  );
  L.push(
    `| Buttons | ${H.buttons.elements} elements, ${H.buttons.visualClasses} visual classes, ${H.buttons.variants} variants, ${H.buttons.multiVariant} classes with more than one variant |`,
  );
  L.push(
    `| Contrast (WCAG 2.x AA) | ${H.contrast.fail} failures, ${H.contrast.uncertain} uncertain, of ${H.contrast.measured} measured texts |`,
  );
  L.push("");

  L.push("## 1. Value histograms");
  L.push("");
  L.push("Each value with the number of distinct elements using it (`value ×elements`).");
  L.push("");
  for (const [id, p] of Object.entries(rep.properties)) {
    L.push(
      `- **${p.label}** — ${p.distinct} distinct: ${p.histogram.length ? histLine(p.histogram) : "none"}`,
    );
  }
  L.push("");

  L.push("## 2. Scale and outliers");
  L.push("");
  for (const [name, s] of Object.entries(rep.steps))
    L.push(
      `- **Base step, ${name}:** ` +
        (s.assumed
          ? `none — no grid covers 85 % of the uses; outliers are checked against the conventional ${s.step} px grid (${Math.round(s.share * 100)} % of uses fit it).`
          : `${s.step} px (${Math.round(s.share * 100)} % of element uses are multiples).`) +
        " Coverage: " +
        s.coverage.map((c) => `${c.step} px ${Math.round(c.share * 100)} %`).join(", ") +
        ".",
    );
  L.push("");
  L.push(
    "Outliers are values used by only 1–2 elements, values that are not a multiple of the base step (spacing, control heights, radii), and fractional pixel values.",
  );
  L.push("");
  for (const [id, p] of Object.entries(rep.properties)) {
    L.push(`### ${p.label}`);
    L.push("");
    L.push(`Scale (≥ 3 elements): ${p.scale.length ? p.scale.map(code).join(" · ") : "none"}`);
    L.push("");
    if (!p.outliers.length) {
      L.push("No outliers.");
      L.push("");
      continue;
    }
    L.push("| Value | Why | Elements (examples) |");
    L.push("| --- | --- | --- |");
    for (const o of p.outliers.slice(0, 40))
      L.push(
        `| ${code(cell(o.value))} | ${o.why.join("; ")} | ${o.elements.map(ex).join("<br>")} |`,
      );
    if (p.outliers.length > 40) L.push(`| … | ${p.outliers.length - 40} more in audit.json | |`);
    L.push("");
  }
  const near = Object.entries(rep.nearDuplicates).filter(([, l]) => l.length);
  if (near.length) {
    L.push("### Near-duplicate colours (≤ 6 units apart per channel)");
    L.push("");
    for (const [id, list] of near)
      L.push(`- ${id}: ${list.map(([a, b]) => `${code(a)} ≈ ${code(b)}`).join(", ")}`);
    L.push("");
  }

  if (rep.defaults.length) {
    L.push("### Browser defaults left in place");
    L.push("");
    L.push("| Rule | Elements | Examples |");
    L.push("| --- | --- | --- |");
    for (const d of rep.defaults)
      L.push(`| ${d.rule} | ${d.elements} | ${d.examples.slice(0, 3).map(ex).join("<br>")} |`);
    L.push("");
  }

  L.push("## 3. Components");
  L.push("");
  L.push(
    "A **visual class** is the look of a component: its fill (solid colour, tint, none, gradient, image), whether it has a border, and its content (text, icon, icon+text); panels use fill, border and shadow. A **variant** is a distinct combination of size (height, or w×h for icon-only), padding, font, radius and border width. A coherent system has one variant per class (per size tier). Classes with more than one variant are listed; `[1440]`/`[390]` is the width.",
  );
  L.push("");
  for (const [kind, c] of Object.entries(rep.components)) {
    if (!c.elements) continue;
    L.push(
      `### ${kind} — ${c.elements} elements, ${c.visualClasses} visual classes, ${c.variants} variants, ${c.multiVariant} classes with more than one variant`,
    );
    L.push("");
    const multi = c.byLook.filter((g) => g.variants.length > 1);
    const single = c.byLook.filter((g) => g.variants.length === 1);
    for (const g of multi.slice(0, 12)) {
      L.push(`**${g.key}** — ${g.elements} elements, ${g.variants.length} variants`);
      L.push("");
      L.push("| Variant | Elements | Widths | CSS classes | Examples |");
      L.push("| --- | --- | --- | --- | --- |");
      for (const v of g.variants.slice(0, 10))
        L.push(
          `| ${cell(v.variant)} | ${v.elements} | ${v.widths.join(", ")} | ${v.classes.map(code).join(" ")} | ${v.examples.slice(0, 2).map(ex).join("<br>")} |`,
        );
      if (g.variants.length > 10) L.push(`| … ${g.variants.length - 10} more | | | | |`);
      L.push("");
    }
    if (multi.length > 12)
      L.push(`… ${multi.length - 12} more multi-variant classes in audit.json.`);
    if (single.length)
      L.push(
        `Consistent classes (one variant): ${single.map((g) => `${cell(g.key)} (${g.elements}; ${cell(g.variants[0].variant)})`).join(" · ")}`,
      );
    L.push("");
    if (c.byClass.length) {
      L.push(
        `By CSS class: ${c.byClass.length} of ${c.cssClasses} class signatures render more than one variant: ` +
          c.byClass
            .slice(0, 15)
            .map((g) => `${code(g.key)} ×${g.variants.length}`)
            .join(", ") +
          (c.byClass.length > 15 ? ", …" : "") +
          ".",
      );
      L.push("");
    }
  }

  L.push("## 4. Typography");
  L.push("");
  L.push(`- **Families (first available in the stack):** ${histLine(rep.typography.families)}`);
  L.push(`- **Platform fonts actually rendered:** ${histLine(rep.typography.platformFonts)}`);
  L.push(`- **Sizes:** ${rep.typography.sizes.length} — ${histLine(rep.typography.sizes)}`);
  L.push(`- **Weights:** ${histLine(rep.typography.weights)}`);
  L.push(`- **Line heights:** ${histLine(rep.typography.lineHeights, 40)}`);
  L.push("");
  L.push("| Font stack (computed) | First available | How |");
  L.push("| --- | --- | --- |");
  for (const [stack, v] of Object.entries(rep.typography.stacks))
    L.push(`| ${code(cell(stack))} | ${cell(v.family)} | ${v.how} |`);
  L.push("");

  L.push("## 5. Contrast (WCAG 2.x, AA)");
  L.push("");
  const C = rep.contrast;
  L.push(
    `${C.measured} distinct text/background pairs measured: ${C.pass} pass, ${C.fail} fail, ${C.uncertain} uncertain; ${C.notMeasured} not measured (disabled controls, inert content behind a modal dialog, text whose centre is covered by another element). Needed: 4.5:1, or 3:1 for large text (≥ 24 px, or ≥ 18.66 px bold). On a solid background the ratio is computed exactly from the layers painted under the text (\`elementsFromPoint\`, alpha and opacity included; SVG labels use their halo stroke). Over a gradient, an image or the map (method \`pixels\`) it is measured in the state's screenshot, from the background pixels in a 1–3 px ring around the text (only where the topmost element is the text's own background layer, so neighbouring icons and decorations are left out): the ratio shown is the 10th percentile, then the median. \`uncertain\` is left where too few such pixels could be read (below the fold of a full-page state, tiny map glyphs): the computed worst case fails and the best case passes.`,
  );
  L.push("");
  const table = (list, title) => {
    if (!list.length) return;
    L.push(`### ${title} (${list.length})`);
    L.push("");
    L.push("| Ratio | Need | Text | Foreground | Background | Element | Method | States |");
    L.push("| --- | --- | --- | --- | --- | --- | --- | --- |");
    for (const c of list.slice(0, 60))
      L.push(
        `| ${c.ratio}${c.best !== c.ratio ? (c.pixels ? ` (median ${c.best})` : `–${c.best}`) : ""} | ${c.need} | «${cell(c.text)}» ${c.size}px/${c.weight} | ${code(c.fg)} | ${c.bg.map(code).join(" ")} | ${code(cell(c.path))} | ${c.method} | ${c.states.join(", ")} |`,
      );
    if (list.length > 60) L.push(`| … | | ${list.length - 60} more in audit.json | | | | | |`);
    L.push("");
  };
  table(C.failures, "Failures");
  table(C.uncertainList, "Uncertain");
  return L.join("\n") + "\n";
}

module.exports = { buildReport, renderMarkdown };
