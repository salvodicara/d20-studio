// In-page collector of the design-value audit (I-250). Playwright serialises
// `collectDesignValues` with Function.prototype.toString and runs it in the page, so it must be
// self-contained: no outer scope, no imports. It reads the live DOM and computed styles only; the
// one write is `window.__d20AuditText` (the text elements, for the platform-font lookup through
// CDP in audit.js, deleted right after).
"use strict";

function collectDesignValues() {
  const VW = innerWidth;
  const VH = innerHeight;
  const SX = scrollX;
  const SY = scrollY;
  const r2 = (n) => Math.round(n * 100) / 100;
  const px = (v) => {
    const n = parseFloat(v);
    return Number.isFinite(n) ? r2(n) : 0;
  };

  // ------------------------------------------------------------ colours (any syntax → sRGB)
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  const nums = (s) => s.split(/[\s,/]+/).filter(Boolean);
  const alphaOf = (s) => (s === undefined ? 1 : s.endsWith("%") ? parseFloat(s) / 100 : +s);
  function rgba(css) {
    if (!css) return null;
    if (colorCache.has(css)) return colorCache.get(css);
    let out = null;
    let m;
    if (css === "transparent") out = [0, 0, 0, 0];
    else if ((m = /^rgba?\(([^)]*)\)$/.exec(css))) {
      const [r, g, b, a] = nums(m[1]);
      out = [+r, +g, +b, alphaOf(a)];
    } else if ((m = /^color\(srgb ([^)]*)\)$/.exec(css))) {
      const [r, g, b, a] = nums(m[1]);
      out = [r * 255, g * 255, b * 255, alphaOf(a)];
    } else {
      // Other syntaxes (oklch, lab, color-mix results...): let the canvas convert to sRGB.
      ctx.fillStyle = "#010203";
      ctx.fillStyle = css;
      const norm = ctx.fillStyle;
      if ((m = /^#([0-9a-f]{6})$/i.exec(norm))) {
        const n = parseInt(m[1], 16);
        out = [n >> 16, (n >> 8) & 255, n & 255, 1];
      } else if ((m = /^rgba?\(([^)]*)\)$/.exec(norm))) {
        const [r, g, b, a] = nums(m[1]);
        out = [+r, +g, +b, alphaOf(a)];
      } else {
        ctx.clearRect(0, 0, 1, 1);
        ctx.fillRect(0, 0, 1, 1);
        const d = ctx.getImageData(0, 0, 1, 1).data;
        out = [d[0], d[1], d[2], d[3] / 255];
      }
    }
    if (out)
      out = [...out.slice(0, 3).map((c) => Math.round(Math.min(255, Math.max(0, c)))), out[3]];
    colorCache.set(css, out);
    return out;
  }
  const hex = (c) => {
    if (!c) return null;
    const h = (n) => n.toString(16).padStart(2, "0");
    const base = "#" + c.slice(0, 3).map(h).join("");
    return c[3] >= 0.995 ? base : base + h(Math.round(c[3] * 255));
  };
  const COLOR_RE =
    /(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\([^()]*\)|#[0-9a-f]{3,8}\b|\btransparent\b/gi;
  const colorsIn = (s) => (s.match(COLOR_RE) || []).map(rgba).filter(Boolean);

  // ------------------------------------------------------------ fonts: first family available
  const GENERIC = new Set([
    "serif",
    "sans-serif",
    "monospace",
    "cursive",
    "fantasy",
    "system-ui",
    "ui-serif",
    "ui-sans-serif",
    "ui-monospace",
    "ui-rounded",
    "math",
    "emoji",
    "fangsong",
  ]);
  const familiesOf = (stack) =>
    stack
      .split(",")
      .map((s) => s.trim().replace(/^["']|["']$/g, ""))
      .filter(Boolean);
  const faces = [...document.fonts];
  const SAMPLE = "mmmmmmmmmmlli1WQ@#ÀÉgjy";
  const width = (font) => {
    ctx.font = font;
    return ctx.measureText(SAMPLE).width;
  };
  const installed = (f) =>
    ["monospace", "serif", "sans-serif"].some(
      (g) => width(`72px "${f}", ${g}`) !== width(`72px ${g}`),
    );
  const stacks = {};
  function firstFamily(stack) {
    if (stacks[stack]) return stacks[stack].family;
    let found = { family: "(browser default)", how: "default" };
    for (const f of familiesOf(stack)) {
      const lower = f.toLowerCase();
      if (GENERIC.has(lower)) {
        found = { family: f, how: "generic" };
        break;
      }
      const own = faces.filter(
        (ff) => ff.family.replace(/^["']|["']$/g, "").toLowerCase() === lower,
      );
      if (own.length) {
        if (own.some((ff) => ff.status === "loaded")) {
          found = { family: f, how: "webfont" };
          break;
        }
        continue; // declared but not loaded: the browser falls back
      }
      if (installed(f)) {
        found = { family: f, how: "local" };
        break;
      }
    }
    stacks[stack] = found;
    return found.family;
  }

  // ------------------------------------------------------------ element description
  const SKIP = new Set(
    "SCRIPT STYLE LINK META HEAD TITLE TEMPLATE NOSCRIPT BR WBR DEFS CLIPPATH MASK PATTERN LINEARGRADIENT RADIALGRADIENT SYMBOL FILTER MARKER USE IMAGE DESC METADATA".split(
      " ",
    ),
  );
  const SVG_RECORD = new Set(["SVG", "TEXT"]);
  // Not part of the product skin: the dev-only demo strip (with the Phase C «Direzione» selector)
  // and the brand logo, which waits for Phase D (code-map §0.5).
  const EXCLUDE = ".demo-strip, svg.logo, #direction-defs";
  const STATE_CLASS =
    /^(is-|has-)|^(active|current|selected|open|expanded|shown|hidden|pressed|checked|available|spent|used|empty)$/;
  const seg = (e) => {
    const tag = e.tagName.toLowerCase();
    if (e.id) return `${tag}#${e.id}`;
    const cls = (e.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean).slice(0, 3);
    return tag + cls.map((c) => "." + c).join("");
  };
  const pathOf = (e) => {
    const parts = [];
    for (let a = e; a && a !== document.documentElement && parts.length < 4; a = a.parentElement) {
      parts.unshift(seg(a));
      if (a.id) break;
    }
    return parts.join(" > ");
  };
  const clean = (s, n = 60) => (s || "").replace(/\s+/g, " ").trim().slice(0, n);
  const IMPLICIT = {
    BUTTON: "button",
    SELECT: "combobox",
    TEXTAREA: "textbox",
    NAV: "navigation",
    MAIN: "main",
    ASIDE: "complementary",
    DIALOG: "dialog",
    UL: "list",
    OL: "list",
    LI: "listitem",
    TABLE: "table",
    FORM: "form",
    SUMMARY: "button",
    PROGRESS: "progressbar",
    METER: "meter",
    FIELDSET: "group",
    P: "paragraph",
    H1: "heading",
    H2: "heading",
    H3: "heading",
    H4: "heading",
    H5: "heading",
    H6: "heading",
  };
  const INPUT_ROLE = {
    checkbox: "checkbox",
    radio: "radio",
    range: "slider",
    number: "spinbutton",
    search: "searchbox",
    button: "button",
    submit: "button",
    reset: "button",
    image: "button",
  };
  function roleOf(e, tag) {
    const r = e.getAttribute("role");
    if (r) return r.split(/\s+/)[0];
    if (tag === "A") return e.hasAttribute("href") ? "link" : "";
    if (tag === "INPUT") return INPUT_ROLE[e.type] || "textbox";
    if (tag === "IMG") return e.getAttribute("alt") === "" ? "presentation" : "img";
    if (tag === "SECTION")
      return e.hasAttribute("aria-label") || e.hasAttribute("aria-labelledby") ? "region" : "";
    return IMPLICIT[tag] || "";
  }
  function nameOf(e, tag) {
    const label = e.getAttribute("aria-label");
    if (label) return clean(label);
    const by = e.getAttribute("aria-labelledby");
    if (by)
      return clean(
        by
          .split(/\s+/)
          .map((id) => document.getElementById(id)?.textContent || "")
          .join(" "),
      );
    if (e.labels?.length) return clean(e.labels[0].textContent);
    if (tag === "IMG") return clean(e.getAttribute("alt"));
    return clean(e.textContent) || clean(e.getAttribute("title"));
  }
  const INTERACTIVE_ROLE =
    /^(button|link|tab|menuitem|menuitemcheckbox|menuitemradio|option|checkbox|radio|switch|combobox|textbox|searchbox|slider|spinbutton)$/;
  const TEXT_INPUT =
    /^(text|search|email|url|tel|password|number|date|time|datetime-local|month|week)$/;
  function kindOf(e, tag, role, cls) {
    const interactive =
      ["BUTTON", "SELECT", "TEXTAREA", "INPUT", "SUMMARY"].includes(tag) ||
      (tag === "A" && e.hasAttribute("href")) ||
      INTERACTIVE_ROLE.test(role);
    if (role === "tab" || (interactive && /(^|[\s_-])(sub)?tab(?=$|\s)/.test(cls))) return "tab";
    if (/^(menuitem|menuitemcheckbox|menuitemradio|option)$/.test(role)) return "menuitem";
    if (tag === "SELECT" || (role === "combobox" && tag !== "INPUT")) return "select";
    if (tag === "TEXTAREA" || (tag === "INPUT" && TEXT_INPUT.test(e.type))) return "input";
    if (tag === "INPUT" && /^(checkbox|radio|range)$/.test(e.type)) return "toggle";
    if (role === "switch" || role === "checkbox" || role === "radio") return "toggle";
    if (/(^|[\s_-])(chip|badge|pill|tag|pip)(?=$|\s)/.test(cls)) return "chip";
    if (
      tag === "BUTTON" ||
      tag === "SUMMARY" ||
      role === "button" ||
      (tag === "INPUT" && /^(button|submit|reset|image)$/.test(e.type)) ||
      (tag === "A" && /(^|\s)button(\s|$)/.test(cls))
    )
      return "button";
    if (tag === "A" && e.hasAttribute("href")) return "link";
    return null;
  }
  // Visible text and icons inside a control (visually hidden labels do not count as text).
  function contentOf(e, tag) {
    if (tag === "INPUT" && /^(checkbox|radio|range|color|file)$/.test(e.type)) return "native";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return "text";
    let text = false;
    const walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n && !text; n = walker.nextNode()) {
      if (!n.textContent.trim()) continue;
      const p = n.parentElement;
      const b = p.getBoundingClientRect();
      const pcs = getComputedStyle(p);
      if (
        b.width > 2 &&
        b.height > 2 &&
        pcs.visibility === "visible" &&
        !/inset\(50%\)/.test(pcs.clipPath)
      )
        text = true;
    }
    const icon =
      Boolean(e.querySelector("svg, img")) || /url\(/.test(getComputedStyle(e).maskImage || "");
    return text && icon ? "icon+text" : text ? "text" : icon ? "icon" : "empty";
  }
  function ownTextOf(e, tag) {
    if (tag === "TEXTAREA" || (tag === "INPUT" && TEXT_INPUT.test(e.type)))
      return clean(e.value || e.placeholder, 40);
    if (tag === "INPUT") return /^(button|submit|reset)$/.test(e.type) ? clean(e.value, 40) : "";
    if (tag === "SELECT") return clean(e.selectedOptions?.[0]?.textContent, 40);
    if (tag === "TEXT") return clean(e.textContent, 40);
    let s = "";
    for (const n of e.childNodes) if (n.nodeType === 3) s += n.textContent;
    return clean(s, 40);
  }
  function cornerOf(v, w, h) {
    const parts = v.split(" ");
    const toPx = (p, ref) => (p.endsWith("%") ? (parseFloat(p) / 100) * ref : parseFloat(p));
    const rx = toPx(parts[0], w);
    const ry = toPx(parts[1] ?? parts[0], h);
    if (!rx || !ry) return 0;
    if (Math.min(rx, ry) >= Math.min(w, h) / 2 - 0.5) return "full";
    return rx === ry ? r2(rx) : `${r2(rx)}/${r2(ry)}`;
  }
  const intersect = (a, b) => [
    Math.max(a[0], b[0]),
    Math.max(a[1], b[1]),
    Math.min(a[2], b[2]),
    Math.min(a[3], b[3]),
  ];
  const empty = (b) => b[2] - b[0] < 1 || b[3] - b[1] < 1;

  // ------------------------------------------------------------ contrast (WCAG 2.x)
  const lin = (c) => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratioOf = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const over = (top, under) => [0, 1, 2].map((i) => top[i] * top[3] + under[i] * (1 - top[3]));
  const GRAPHIC_TAGS = new Set(["IMG", "VIDEO", "CANVAS", "IFRAME", "OBJECT", "EMBED", "PICTURE"]);
  const SHAPES = new Set(["RECT", "CIRCLE", "ELLIPSE", "PATH", "POLYGON", "POLYLINE"]);
  // Layers painted under `el` at its centre, top first: {rgba} | {stops} | {graphic}.
  function layersUnder(el, vis) {
    const x = (vis[0] + vis[2]) / 2;
    const y = (vis[1] + vis[3]) / 2;
    const stack = x >= 0 && y >= 0 && x < VW && y < VH ? document.elementsFromPoint(x, y) : [];
    let idx = stack.indexOf(el);
    const chain = [];
    if (idx < 0)
      for (let a = el; a; a = a.parentElement) {
        idx = stack.indexOf(a);
        if (idx >= 0) break;
        chain.push(a);
      }
    const seq = [...chain, ...(idx >= 0 ? stack.slice(idx) : [])];
    const layers = [];
    const tag0 = el.tagName.toUpperCase();
    if (tag0 === "TEXT") {
      // SVG labels drawn with a halo: the stroke is the text's own background.
      const cs = getComputedStyle(el);
      const stroke = cs.stroke !== "none" && !cs.stroke.startsWith("url(") ? rgba(cs.stroke) : null;
      if (stroke && parseFloat(cs.strokeWidth) >= 1.5 && /^stroke/.test(cs.paintOrder))
        layers.push({
          rgba: [...stroke.slice(0, 3), stroke[3] * (+cs.strokeOpacity || 1)],
          halo: true,
        });
    }
    let methods = new Set([idx >= 0 ? "stack" : "ancestors"]);
    for (const L of seq) {
      const tag = L.tagName.toUpperCase();
      const cs = getComputedStyle(L);
      const op = parseFloat(cs.opacity);
      if (L !== el && GRAPHIC_TAGS.has(tag)) {
        layers.push({ graphic: tag.toLowerCase() });
        break;
      }
      if (L instanceof SVGElement && tag !== "SVG") {
        if (tag === "IMAGE" || tag === "USE" || tag === "FOREIGNOBJECT") {
          if (tag !== "FOREIGNOBJECT") {
            layers.push({ graphic: "svg " + tag.toLowerCase() });
            break;
          }
          continue;
        }
        if (!SHAPES.has(tag)) continue;
        if (cs.fill.startsWith("url(")) {
          layers.push({ graphic: "svg pattern/gradient fill" });
          break;
        }
        const f = cs.fill === "none" ? null : rgba(cs.fill);
        if (f) layers.push({ rgba: [...f.slice(0, 3), f[3] * (+cs.fillOpacity || 0) * op] });
      } else {
        const bgi = cs.backgroundImage;
        if (bgi && bgi !== "none") {
          if (/url\(/.test(bgi)) {
            layers.push({ graphic: "background image" });
            break;
          }
          const stops = colorsIn(bgi).map((c) => [...c.slice(0, 3), c[3] * op]);
          if (stops.length) layers.push({ stops });
          methods.add("gradient");
        }
        const bg = rgba(cs.backgroundColor);
        if (bg && bg[3] > 0) layers.push({ rgba: [...bg.slice(0, 3), bg[3] * op] });
      }
      const last = layers[layers.length - 1];
      if (last?.rgba && last.rgba[3] >= 0.995) break;
      if (last?.stops && last.stops.every((s) => s[3] >= 0.995)) break;
    }
    return { layers, methods };
  }
  // The colour the glyphs are painted with: SVG text paints with `fill`, HTML text with `color`.
  const inkOf = (el, cs) =>
    el instanceof SVGElement && cs.fill !== "none" && !cs.fill.startsWith("url(")
      ? cs.fill
      : cs.color;
  function contrastOf(el, cs, vis, cumOp, fs, fw) {
    const fg = rgba(inkOf(el, cs));
    if (!fg || fg[3] * cumOp < 0.05) return null; // intentionally invisible text
    const { layers, methods } = layersUnder(el, vis);
    const bottom = layers[layers.length - 1];
    let cands = bottom?.graphic
      ? [
          [0, 0, 0],
          [255, 255, 255],
        ]
      : [[255, 255, 255]];
    if (bottom?.graphic) methods.add("over " + bottom.graphic);
    for (let i = layers.length - 1; i >= 0; i--) {
      const L = layers[i];
      if (L.rgba) cands = cands.map((c) => over(L.rgba, c));
      else if (L.stops) cands = cands.flatMap((c) => L.stops.map((s) => over(s, c)));
      if (L.halo) methods.add("svg halo");
      cands = [...new Map(cands.map((c) => [c.map(Math.round).join(","), c])).values()].slice(
        0,
        24,
      );
    }
    const fgA = [...fg.slice(0, 3), fg[3] * cumOp];
    const pairs = cands.map((bg) => {
      const f = over(fgA, bg);
      return { f, bg, ratio: ratioOf(f, bg) };
    });
    pairs.sort((a, b) => a.ratio - b.ratio);
    const worstPair = pairs[0];
    let worst = worstPair.ratio;
    const best = pairs[pairs.length - 1].ratio;
    if (pairs.length > 1) {
      // A varying background (gradient, graphic) may cross the text's luminance in between.
      const ls = pairs.map((p) => lum(p.bg));
      const lf = lum(worstPair.f);
      if (lf >= Math.min(...ls) && lf <= Math.max(...ls)) worst = 1;
    }
    const large = fs >= 24 || (fs >= 18.66 && +fw >= 700);
    const need = large ? 3 : 4.5;
    const toHex = (c) => hex([...c.map(Math.round), 1]);
    return {
      fg: hex(fg) + (cumOp < 0.995 ? ` ×${r2(cumOp)}` : ""),
      bg: [...new Set(pairs.map((p) => toHex(p.bg)))].slice(0, 6),
      ratio: r2(worst),
      best: r2(best),
      need,
      large,
      method: [...methods].join(", "),
      verdict: worst >= need ? "pass" : best < need ? "fail" : "uncertain",
      // A varying background (gradient, image, map art): audit.js measures it in the screenshot.
      varying: pairs.length > 1,
      fgRgba: fgA.map(r2),
    };
  }
  // Is `el` painted over at (x, y) by an element outside it that paints? Undecidable (false) off
  // screen or when neither it nor an ancestor is hit-testable there.
  function covered(el, x, y) {
    if (x < 0 || y < 0 || x >= VW || y >= VH) return false;
    const stack = document.elementsFromPoint(x, y);
    let anc = el;
    let i = stack.indexOf(el);
    while (i < 0 && anc.parentElement) {
      anc = anc.parentElement;
      i = stack.indexOf(anc);
    }
    return i > 0 && stack.slice(0, i).some((o) => !anc.contains(o) && paints(o));
  }
  // Does this element paint a background of its own (colour, gradient, image, filled shape)?
  function paints(L) {
    const tag = L.tagName.toUpperCase();
    if (GRAPHIC_TAGS.has(tag) || tag === "IMAGE" || tag === "USE") return true;
    const cs = getComputedStyle(L);
    if (L instanceof SVGElement) return SHAPES.has(tag) && cs.fill !== "none";
    const bg = rgba(cs.backgroundColor);
    return (bg && bg[3] > 0.01) || cs.backgroundImage !== "none";
  }
  // Sample points 1–3 px around the text's ink box (client px, flat [x, y, …]) whose topmost
  // element is the text, one of its transparent ancestors, or the first layer that paints under
  // the text's centre: the background the text sits on, not a neighbouring decoration, icon or
  // the map around a marker (audit.js reads these pixels in the screenshot).
  function ringPoints(el, tbox, vis) {
    const [l, t] = [tbox[0] - SX, tbox[1] - SY];
    const [r, b] = [l + tbox[2], t + tbox[3]];
    const stack = document.elementsFromPoint((vis[0] + vis[2]) / 2, (vis[1] + vis[3]) / 2);
    let i = stack.indexOf(el);
    for (let a = el.parentElement; a && i < 0; a = a.parentElement) i = stack.indexOf(a);
    const under = new Set([el]);
    let base = null; // the first layer that paints under the text's centre
    for (let k = Math.max(i, 0); k < stack.length; k++) {
      under.add(stack[k]);
      if (paints(stack[k])) {
        base = stack[k];
        break;
      }
    }
    // On an HTML background layer only its padding box counts, not its own border.
    let inner = null;
    if (base && !(base instanceof SVGElement)) {
      const b = base.getBoundingClientRect();
      const bs = getComputedStyle(base);
      // 1 px further in: a border at a fractional position anti-aliases into the next row.
      inner = [
        b.left + px(bs.borderLeftWidth) + 1,
        b.top + px(bs.borderTopWidth) + 1,
        b.right - px(bs.borderRightWidth) - 1,
        b.bottom - px(bs.borderBottomWidth) - 1,
      ];
    }
    // On an SVG shape (a token or marker disc) only its fill counts, not its outline.
    const onBackground = (hit, x, y) => {
      if (!under.has(hit)) return false;
      if (hit === base && inner)
        return x >= inner[0] && x < inner[2] && y >= inner[1] && y < inner[3];
      if (hit === el || !(hit instanceof SVGGeometryElement)) return true;
      const m = hit.getScreenCTM();
      if (!m) return true;
      const p = new DOMPoint(x, y).matrixTransform(m.inverse());
      return hit.isPointInFill(p) && !hit.isPointInStroke(p);
    };
    const step = tbox[2] + tbox[3] > 160 ? 2 : 1;
    const pts = [];
    for (let y = t - 3; y <= b + 3; y += step)
      for (let x = l - 3; x <= r + 3; x += step) {
        if (x > l - 1 && x < r + 1 && y > t - 1 && y < b + 1) continue;
        if (x < 0 || y < 0 || x >= VW || y >= VH) continue;
        if (onBackground(document.elementFromPoint(x, y), x, y)) pts.push(x, y);
      }
    return pts;
  }
  // The text's own ink box (union of its text-node line boxes), in page coordinates.
  function textBoxOf(el, tag, cs, rect) {
    let b = null;
    const add = (r) => {
      if (r.width < 0.5 || r.height < 0.5) return;
      b = b
        ? [
            Math.min(b[0], r.left),
            Math.min(b[1], r.top),
            Math.max(b[2], r.right),
            Math.max(b[3], r.bottom),
          ]
        : [r.left, r.top, r.right, r.bottom];
    };
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT")
      b = [
        rect.left + px(cs.borderLeftWidth) + px(cs.paddingLeft),
        rect.top + px(cs.borderTopWidth) + px(cs.paddingTop),
        rect.right - px(cs.borderRightWidth) - px(cs.paddingRight),
        rect.bottom - px(cs.borderBottomWidth) - px(cs.paddingBottom),
      ];
    else if (tag === "TEXT") add(rect);
    else
      for (const n of el.childNodes)
        if (n.nodeType === 3 && n.textContent.trim()) {
          const range = document.createRange();
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) add(r);
        }
    return b && [r2(b[0] + SX), r2(b[1] + SY), r2(b[2] - b[0]), r2(b[3] - b[1])];
  }

  // ------------------------------------------------------------ walk
  const modal = [...document.querySelectorAll("dialog[open]")].find((d) => d.matches(":modal"));
  const records = [];
  const textEls = [];
  const ALL = [-Infinity, -Infinity, Infinity, Infinity];
  const VIEW = [0, 0, VW, VH];
  const DOC = [
    -SX,
    -SY,
    document.documentElement.scrollWidth - SX,
    document.documentElement.scrollHeight - SY,
  ];
  let visited = 0;

  function visit(el, key, clip, op) {
    const tag = el.tagName.toUpperCase();
    if (SKIP.has(tag) || el.matches(EXCLUDE)) return;
    visited++;
    const isSvg = el instanceof SVGElement;
    const cs = getComputedStyle(el);
    if (cs.display === "none") return;
    const cumOp = op * parseFloat(cs.opacity);
    if (cumOp <= 0.01) return;
    if (/inset\(50%\)/.test(cs.clipPath) || cs.clip === "rect(0px, 0px, 0px, 0px)") return;
    const rect = el.getBoundingClientRect();
    const own = cs.position === "fixed" ? ALL : clip;
    const box = [rect.left, rect.top, rect.right, rect.bottom];
    const vis = intersect(box, own);
    const shown =
      !empty(vis) &&
      cs.visibility === "visible" &&
      (!isSvg || SVG_RECORD.has(tag)) &&
      (isSvg || el.checkVisibility({ contentVisibilityAuto: true }));
    if (
      shown &&
      (!isSvg || tag === "TEXT" || !el.parentElement?.closest("svg") || el.matches(".icon"))
    )
      record(el, tag, key, cs, rect, vis, cumOp, isSvg);
    if (tag === "TEXT") return;
    let childClip = own;
    const ox = cs.overflowX !== "visible";
    const oy = cs.overflowY !== "visible";
    if ((ox || oy) && tag !== "HTML" && tag !== "BODY") {
      const pb = [
        rect.left + px(cs.borderLeftWidth),
        rect.top + px(cs.borderTopWidth),
        rect.right - px(cs.borderRightWidth),
        rect.bottom - px(cs.borderBottomWidth),
      ];
      childClip = [
        ox ? Math.max(own[0], pb[0]) : own[0],
        oy ? Math.max(own[1], pb[1]) : own[1],
        ox ? Math.min(own[2], pb[2]) : own[2],
        oy ? Math.min(own[3], pb[3]) : own[3],
      ];
    }
    let i = 0;
    for (const child of el.children) visit(child, `${key}/${i++}`, childClip, cumOp);
  }

  function record(el, tag, key, cs, rect, vis, cumOp, isSvg) {
    const cls = el.getAttribute("class") || "";
    const role = roleOf(el, tag);
    const kind0 = isSvg ? (tag === "SVG" ? "icon" : null) : kindOf(el, tag, role, cls);
    const w = r2(rect.width);
    const h = r2(rect.height);
    const sides = ["Top", "Right", "Bottom", "Left"];
    const bw = sides.map((s) =>
      /^(none|hidden)$/.test(cs[`border${s}Style`]) ? 0 : px(cs[`border${s}Width`]),
    );
    const bc = sides.map((s, i) => {
      const c = bw[i] ? rgba(cs[`border${s}Color`]) : null;
      return c && c[3] >= 0.01 ? hex(c) : null; // a transparent border paints nothing
    });
    const bgc = rgba(cs.backgroundColor);
    const bgi =
      cs.backgroundImage === "none"
        ? null
        : /url\(/.test(cs.backgroundImage)
          ? "image"
          : "gradient";
    const shadow = cs.boxShadow === "none" ? null : cs.boxShadow;
    const surface = (bgc && bgc[3] >= 0.04) || bgi || bc.some(Boolean);
    let kind = kind0 === "chip" && !surface ? null : kind0; // a chip has a visible surface
    if (
      !kind &&
      !isSvg &&
      tag !== "HTML" &&
      tag !== "BODY" &&
      w >= 120 &&
      h >= 40 &&
      ((bgc && bgc[3] >= 0.04) || bgi || bc.filter(Boolean).length >= 3 || shadow)
    )
      kind = "panel";
    const flexGrid = /flex|grid/.test(cs.display);
    const text = ownTextOf(el, tag);
    const fs = px(cs.fontSize);
    const isText = Boolean(text) && fs >= 1; // zero-size text is a hiding technique, not type
    const inView = !empty(intersect(vis, VIEW));
    // Hidden under another element (a panel over a map marker): not visible, so not audited.
    const seen = intersect(vis, VIEW);
    const cx = (seen[0] + seen[2]) / 2;
    const cy = (seen[1] + seen[3]) / 2;
    const centreCovered = inView && covered(el, cx, cy);
    if (
      centreCovered &&
      [0.25, 0.75].every((fx) =>
        [0.25, 0.75].every((fy) =>
          covered(el, seen[0] + fx * (seen[2] - seen[0]), seen[1] + fy * (seen[3] - seen[1])),
        ),
      )
    )
      return;
    const inDoc = !empty(intersect(vis, DOC)); // what a full-page screenshot shows
    const fw = cs.fontWeight;
    let typed = null;
    try {
      typed = isSvg ? null : el.computedStyleMap();
    } catch {}
    // Auto margins resolve to px in getComputedStyle; the typed OM still says "auto".
    const margin = (side) =>
      typed?.get(`margin-${side}`)?.toString() === "auto"
        ? "auto"
        : px(cs[`margin${side[0].toUpperCase()}${side.slice(1)}`]);
    const content = kind && kind !== "panel" && kind !== "icon" ? contentOf(el, tag) : null;
    const glyph =
      content === "icon" || content === "icon+text" ? el.querySelector("svg, img") : null;
    const gb = glyph?.getBoundingClientRect();
    const rec = {
      key,
      tag: tag.toLowerCase(),
      path: pathOf(el),
      cls: cls.trim().split(/\s+/).filter(Boolean),
      sig:
        tag.toLowerCase() +
        cls
          .trim()
          .split(/\s+/)
          .filter((c) => c && !STATE_CLASS.test(c))
          .sort()
          .map((c) => "." + c)
          .join(""),
      role,
      name: kind || isText ? nameOf(el, tag) : clean(el.getAttribute("aria-label")),
      kind,
      box: [r2(rect.left + SX), r2(rect.top + SY), w, h],
      inView,
      inDoc,
      inert: Boolean(el.closest("[inert]") || (modal && !modal.contains(el))),
      disabled: Boolean(el.matches(":disabled") || el.closest('[aria-disabled="true"]')),
      text: isText ? text : null,
      content,
      iconBox: gb ? [r2(gb.width), r2(gb.height)] : null,
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px),
      mar: ["top", "right", "bottom", "left"].map(margin),
      gap: flexGrid ? [cs.rowGap, cs.columnGap].map((v) => (v === "normal" ? 0 : px(v))) : null,
      items: flexGrid ? [...el.children].filter((c) => c.checkVisibility?.()).length : 0,
      display: cs.display,
      ff: cs.fontFamily,
      fam: firstFamily(cs.fontFamily),
      fs,
      fw,
      lh: cs.lineHeight === "normal" ? "normal" : px(cs.lineHeight),
      ls: cs.letterSpacing === "normal" ? 0 : px(cs.letterSpacing),
      caps: cs.fontVariantCaps === "normal" ? null : cs.fontVariantCaps,
      bw,
      bc,
      br: ["TopLeft", "TopRight", "BottomRight", "BottomLeft"].map((c) =>
        cornerOf(cs[`border${c}Radius`], rect.width, rect.height),
      ),
      shadow,
      c: hex(rgba(inkOf(el, cs))),
      bg: bgc && bgc[3] > 0 ? hex(bgc) : null,
      bgi,
      op: r2(cumOp),
    };
    if (isText && centreCovered) rec.contrast = { verdict: "covered" };
    else if (isText && rec.inert === false && rec.disabled === false)
      rec.contrast = contrastOf(el, cs, rec.inView ? intersect(vis, VIEW) : vis, cumOp, fs, fw);
    else if (isText) rec.contrast = { verdict: rec.inert ? "inert" : "exempt (disabled)" };
    if (isText) {
      rec.tbox = textBoxOf(el, tag, cs, rect);
      if (rec.contrast?.varying && rec.inView && rec.tbox)
        rec.contrast.ring = ringPoints(el, rec.tbox, intersect(vis, VIEW));
      rec.t = textEls.length;
      textEls.push(el);
    }
    records.push(rec);
  }

  visit(document.documentElement, "html", ALL, 1);
  window.__d20AuditText = textEls;
  return {
    viewport: { width: VW, height: VH, scrollX: SX, scrollY: SY },
    document: {
      width: document.documentElement.scrollWidth,
      height: document.documentElement.scrollHeight,
    },
    modalDialog: Boolean(modal),
    visited,
    fontStacks: stacks,
    records,
  };
}

module.exports = { collectDesignValues };
