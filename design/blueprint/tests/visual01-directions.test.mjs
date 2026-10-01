// Phase C (visual-01, 30/09/2026): the dev-only «Direzione» selector and its hooks. With no
// direction the app must stay exactly as it is: icon() byte-identical, no strip control, no
// loader side effect under plain Node. Direction skins are prefixed so they stay inert.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { icon, iconPath, logo, setIconOverride, setLogoOverride } from "../ui.mjs";
import * as directions from "../directions/index.mjs";
import * as geometry from "../directions/brand-geometry.mjs";

const here = (path) => new URL(`../${path}`, import.meta.url);
const original = (name) =>
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
  (iconPath(name) ?? iconPath("book")) +
  '"/></svg>';
// Today's mark (ui.mjs logo()), frozen on 01/10/2026: with no override it stays byte-identical.
const originalLogo = (cls) =>
  `<svg class="${cls}" viewBox="0 0 32 32" aria-hidden="true"><g stroke="var(--logo-edge, #12171d)" stroke-width="0.6" stroke-linejoin="round"><polygon points="16,9.5 3.88,9 16,2" fill="currentColor" fill-opacity="0.86"/><polygon points="16,9.5 16,2 28.12,9" fill="currentColor" fill-opacity="1"/><polygon points="16,9.5 9,21.5 3.88,9" fill="currentColor" fill-opacity="0.7"/><polygon points="23,21.5 16,9.5 28.12,9" fill="currentColor" fill-opacity="0.8"/><polygon points="9,21.5 23,21.5 16,30" fill="currentColor" fill-opacity="0.58"/><polygon points="9,21.5 3.88,9 3.88,23" fill="currentColor" fill-opacity="0.5"/><polygon points="9,21.5 3.88,23 16,30" fill="currentColor" fill-opacity="0.42"/><polygon points="23,21.5 16,30 28.12,23" fill="currentColor" fill-opacity="0.52"/><polygon points="23,21.5 28.12,23 28.12,9" fill="currentColor" fill-opacity="0.64"/><polygon points="16,9.5 23,21.5 9,21.5" fill="#f7e6bd"/></g><text x="16" y="19.3" text-anchor="middle" font-family="Iowan Old Style, Palatino Linotype, Palatino, Book Antiqua, Georgia, serif" font-size="6.8" font-weight="700" fill="#2a2116">20</text></svg>`;

test("logo() is byte-identical when no override is set", () => {
  assert.equal(logo(), originalLogo("logo"));
  assert.equal(logo("logo"), originalLogo("logo"));
  assert.equal(logo("brand-mark"), originalLogo("brand-mark"));
});

test("setLogoOverride replaces the logo with an svg string and null restores it", () => {
  const alt = (cls) =>
    `<svg class="${cls}" viewBox="0 0 100 100" aria-hidden="true"><path d="M50 7 87 28.5"/></svg>`;
  const seen = [];
  try {
    setLogoOverride((cls) => {
      seen.push(cls);
      return alt(cls);
    });
    assert.equal(logo(), alt("logo"));
    assert.equal(logo("brand-mark"), alt("brand-mark"));
    assert.deepEqual(seen, ["logo", "brand-mark"], "the override receives the class name");
    for (const answer of [null, undefined, "", "<span>d20</span>", 42, { svg: "<svg/>" }]) {
      setLogoOverride(() => answer);
      assert.equal(logo(), originalLogo("logo"), `an answer of ${String(answer)} keeps today's`);
    }
    setLogoOverride("not a function");
    assert.equal(logo(), originalLogo("logo"), "a non-function clears the override");
    setLogoOverride(alt);
    assert.equal(logo(), alt("logo"));
    setLogoOverride(null);
    assert.equal(logo(), originalLogo("logo"), "null restores today's mark");
  } finally {
    setLogoOverride(null);
  }
  assert.equal(logo(), originalLogo("logo"));
  assert.equal(icon("ruler"), original("ruler"), "the logo hook never touches icon()");
});

test("the loader clears a logo override when no direction applies (no document)", async () => {
  try {
    setLogoOverride(() => "<svg/>");
    await directions.applyDirection(null);
    assert.equal(logo(), originalLogo("logo"));
  } finally {
    setLogoOverride(null);
  }
});

// The d20 mark of every direction (I-251): a true icosahedron seen face-on.
const pairs = (points) => points.split(" ").map((p) => p.split(",").map(Number));
const area = (pts) =>
  Math.abs(
    pts.reduce((sum, [x, y], i) => {
      const [nx, ny] = pts[(i + 1) % pts.length];
      return sum + x * ny - nx * y;
    }, 0) / 2,
  );
const inside = ([px, py], tri, pad = 0) => {
  // Signed distances to the three edges, all at least `pad` on the inner side.
  const [cx, cy] = tri.reduce(([sx, sy], [x, y]) => [sx + x / 3, sy + y / 3], [0, 0]);
  return tri.every(([ax, ay], i) => {
    const [bx, by] = tri[(i + 1) % 3];
    const len = Math.hypot(bx - ax, by - ay);
    const side = (x, y) => ((bx - ax) * (y - ay) - (by - ay) * (x - ax)) / len;
    return Math.sign(side(px, py)) === Math.sign(side(cx, cy)) && Math.abs(side(px, py)) >= pad;
  });
};

test("brand geometry: the ten visible faces of a face-on icosahedron tile its hexagon", () => {
  assert.equal(geometry.VIEWBOX, "0 0 100 100");
  const hexagon = pairs(geometry.OUTLINE);
  assert.equal(hexagon.length, 6, "a hexagon silhouette");
  assert.deepEqual(hexagon[0], [50, 7], "pointy top");
  for (const [x, y] of hexagon) {
    const r = Math.hypot(x - 50, y - 50);
    assert.ok(Math.abs(r - 43) < 0.3, `hexagon vertex ${x},${y} at radius ${r.toFixed(2)}`);
  }
  const front = pairs(geometry.CENTER_FACE);
  assert.equal(front.length, 3);
  for (const [x, y] of front) {
    const r = Math.hypot(x - 50, y - 50);
    // The front face's circumradius is 1/φ of the silhouette's, as on a real d20.
    assert.ok(Math.abs(r / 43 - 0.618) < 0.005, `front vertex at ${(r / 43).toFixed(3)} R`);
  }
  assert.equal(geometry.FACES.length, 10, "the front hemisphere shows ten faces");
  const roles = geometry.FACES.map((f) => f.role).sort();
  assert.deepEqual(roles, [
    "bottom",
    "flank",
    "flank",
    "flank",
    "flank",
    "flank",
    "flank",
    "front",
    "top",
    "top",
  ]);
  assert.equal(geometry.FACES.find((f) => f.role === "front").points, geometry.CENTER_FACE);
  const total = geometry.FACES.reduce((sum, face) => {
    assert.equal(pairs(face.points).length, 3, `${face.id} is a triangle`);
    assert.deepEqual(face.vertices, pairs(face.points));
    assert.ok(face.normal[2] > 0, `${face.id} faces the viewer`);
    assert.ok(Math.abs(Math.hypot(...face.normal) - 1) < 0.002, `${face.id} unit normal`);
    assert.ok(face.tone >= 0 && face.tone <= 1, `${face.id} tone in 0..1`);
    return sum + area(face.vertices);
  }, 0);
  assert.ok(Math.abs(total - area(hexagon)) < 0.01, "the faces tile the silhouette exactly");
  // Every vertex inside the silhouette meets five faces: a real icosahedron vertex.
  for (const [x, y] of front) {
    const meets = geometry.FACES.filter((f) => f.vertices.some(([fx, fy]) => fx === x && fy === y));
    assert.equal(meets.length, 5, `front vertex ${x},${y} meets five faces`);
  }
  assert.equal(new Set(geometry.FACES.map((f) => f.id)).size, 10, "unique face ids");
  assert.equal(geometry.SEAMS.split("M").filter(Boolean).length, 12, "twelve inner seams");
});

test("brand geometry: svgFaces, the «20» numeral and per-call id suffixes", () => {
  const plain = geometry.svgFaces();
  assert.equal(plain.match(/<polygon /g).length, 10);
  assert.ok(plain.includes(`points="${geometry.CENTER_FACE}"`));
  const styled = geometry.svgFaces((face, i) =>
    face.role === "front"
      ? { fill: 'a"b', "fill-opacity": 1 }
      : `fill="currentColor" data-i="${i}"`,
  );
  assert.match(styled, /fill="a&quot;b" fill-opacity="1"/, "object attributes are escaped");
  assert.match(styled, /fill="currentColor" data-i="0"/);
  const text = geometry.numeral('fill="#000"');
  assert.match(
    text,
    /^<text x="50" y="[\d.]+" font-size="[\d.]+" text-anchor="middle" fill="#000">20<\/text>$/,
  );
  // The numeral's box (lining figures: 1.15 em wide, 0.72 em tall, on the baseline) stays
  // inside the front face with air on every side, up to the largest recommended size.
  const front = pairs(geometry.CENTER_FACE);
  for (const size of [geometry.NUMERAL.size, geometry.NUMERAL.max]) {
    const { x, y } = geometry.NUMERAL;
    const w = 1.15 * size;
    const h = 0.72 * size;
    for (const corner of [
      [x - w / 2, y - h],
      [x + w / 2, y - h],
      [x - w / 2, y],
      [x + w / 2, y],
    ])
      assert.ok(inside(corner, front, 1), `size ${size}: corner ${corner} inside the face`);
  }
  const a = geometry.uniqueSuffix();
  const b = geometry.uniqueSuffix();
  assert.notEqual(a, b);
  assert.match(a, /^[a-z][a-z0-9-]*$/, "usable in an id");
});

// directions/<id>/brand.mjs (optional, I-251): the contract of directions/README.md.
test("every direction brand.mjs keeps the contract", async () => {
  for (const { id } of directions.DIRECTIONS) {
    const file = `directions/${id}/brand.mjs`;
    if (!existsSync(here(file))) continue;
    const mod = await import(here(file).href);
    assert.equal(typeof mod.directionLogo, "function", `${file}: exports directionLogo`);
    const first = mod.directionLogo("logo");
    const second = mod.directionLogo("brand-mark");
    for (const svg of [first, second]) {
      const open = svg.match(/^<svg\b[^>]*>/)?.[0] ?? "";
      assert.match(open, /^<svg class="(logo|brand-mark)"/, `${file}: class first`);
      assert.match(open, / viewBox="[\d. -]+"/, `${file}: a viewBox`);
      assert.match(open, / aria-hidden="true"/, `${file}: decorative (the button is named)`);
      assert.match(svg, /<\/svg>$/);
      assert.doesNotMatch(svg, /<(image|foreignObject|script|use)\b|href=|url\((?!#)/i, file);
      for (const [, content] of svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g))
        assert.equal(content, "20", `${file}: the only text is the «20» numeral`);
    }
    assert.ok(
      first.startsWith('<svg class="logo"') && second.startsWith('<svg class="brand-mark"'),
    );
    const ids = (svg) => [...svg.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
    for (const used of ids(first))
      assert.ok(!ids(second).includes(used), `${file}: id «${used}» repeats across calls`);
    for (const svg of [first, second])
      for (const [, ref] of svg.matchAll(/url\(#([^)]+)\)/g))
        assert.ok(ids(svg).includes(ref), `${file}: url(#${ref}) points inside the same mark`);
    if (mod.favicon !== undefined) {
      const icon = mod.favicon;
      assert.equal(typeof icon, "string", `${file}: favicon is an svg string`);
      assert.match(icon, /^<svg [^>]*xmlns="http:\/\/www\.w3\.org\/2000\/svg"/, `${file}: xmlns`);
      assert.match(icon, /<\/svg>$/);
      assert.doesNotMatch(icon, /currentColor|var\(|<(image|foreignObject|script)\b|href=/i);
      assert.ok(icon.length < 8000, `${file}: favicon under 8 KB`);
    }
  }
});

test("icon() is byte-identical when no override is set", () => {
  for (const name of ["ruler", "home", "sword", "close", "no-such-icon"])
    assert.equal(icon(name), original(name));
});

test("setIconOverride replaces icons it answers for and null restores the core set", () => {
  const alt =
    '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M0 0h24v24H0z"/></svg>';
  try {
    setIconOverride((name) => (name === "ruler" ? alt : null));
    assert.equal(icon("ruler"), alt);
    assert.equal(icon("home"), original("home"), "an unanswered name falls back to the core icon");
    setIconOverride("not a function");
    assert.equal(icon("ruler"), original("ruler"), "a non-function clears the override");
    setIconOverride(() => alt);
    assert.equal(icon("home"), alt);
  } finally {
    setIconOverride(null);
  }
  assert.equal(icon("ruler"), original("ruler"));
  assert.equal(icon("home"), original("home"));
});

test("the four round-1 directions, numbered as the owner sees them (I-248)", () => {
  assert.deepEqual(
    directions.DIRECTIONS.map((d) => d.id),
    ["bg3", "ddb", "foundry", "owlbear", "solasta", "roll20", "owlcat", "alchemy", "demiplane"],
  );
  assert.deepEqual(
    directions.DIRECTIONS.map((d) => d.label),
    [
      "1 · Baldur's Gate 3",
      "2 · D&D Beyond",
      "3 · Foundry VTT",
      "4 · Owlbear Rodeo",
      "5 · Solasta",
      "6 · Roll20",
      "7 · Pathfinder WotR",
      "8 · Alchemy RPG",
      "9 · Demiplane",
    ],
  );
});

test("without a browser there is no direction mode and no control", async () => {
  assert.equal(globalThis.location, undefined);
  assert.equal(directions.directionMode(), false);
  assert.equal(directions.activeDirection(), null);
  const t = (it) => it;
  assert.equal(directions.directionControl(t), "");
  await directions.startDirection();
  await directions.applyDirection(null);
  directions.bindDirection(() => {});
  assert.equal(icon("ruler"), original("ruler"));
});

test("in direction mode the control is labelled «Direzione» with «Attuale» first", async () => {
  const store = new Map();
  globalThis.location = { hostname: "127.0.0.1", search: "" };
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  try {
    const t = (it) => it;
    const en = (it, english) => english;
    assert.equal(directions.directionControl(t), "", "no key: not in direction mode");
    store.set("d20-dev-direction", "current");
    assert.equal(directions.directionMode(), true);
    assert.equal(directions.activeDirection(), null);
    const html = directions.directionControl(t);
    assert.match(html, /^<label class="demo-direction">Direzione <select id="demo-direction">/);
    assert.match(html, /<option value="current" selected>Attuale<\/option><option value="bg3">/);
    for (const d of directions.DIRECTIONS)
      assert.ok(html.includes(`value="${d.id}"`), `option ${d.id}`);
    assert.match(directions.directionControl(en), /Direction <select id="demo-direction">/);
    assert.match(directions.directionControl(en), /<option value="current" selected>Current</);
    store.set("d20-dev-direction", "ddb");
    assert.equal(directions.activeDirection(), "ddb");
    assert.match(directions.directionControl(t), /<option value="ddb" selected>2 · D&amp;D Beyond/);
    assert.doesNotMatch(directions.directionControl(t), /value="current" selected/);
    store.set("d20-dev-direction", "unknown");
    assert.equal(directions.activeDirection(), null, "an unknown value means «Attuale»");
    globalThis.location = { hostname: "example.org", search: "" };
    store.set("d20-dev-direction", "bg3");
    assert.equal(directions.directionMode(), false, "never off loopback");
    assert.equal(directions.activeDirection(), null);
    assert.equal(directions.directionControl(t), "");
  } finally {
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});

test("?direction= writes the key on loopback: an id, current, or off", async () => {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: (k) => store.delete(k),
  };
  try {
    for (const [search, expected] of [
      ["?direction=owlbear", "owlbear"],
      ["?direction=current", "current"],
      ["?direction=nonsense", "current"],
      ["?direction=off", null],
    ]) {
      globalThis.location = { hostname: "localhost", search };
      await directions.startDirection(); // no document: only the key changes
      assert.equal(store.get("d20-dev-direction") ?? null, expected, search);
    }
    store.set("d20-dev-direction", "bg3");
    globalThis.location = { hostname: "example.org", search: "?direction=off" };
    await directions.startDirection();
    assert.equal(store.get("d20-dev-direction"), "bg3", "ignored off loopback");
  } finally {
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});

// Every direction stylesheet stays inert without its root attribute (code-map §c zero effect).
const stripComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
function selectorsOf(css) {
  // Flat walk: selectors of style rules, at any @media/@supports/@container/@layer depth;
  // @font-face and @keyframes bodies are skipped.
  const out = [];
  const src = stripComments(css);
  let i = 0;
  const skipBlock = () => {
    let depth = 0;
    for (; i < src.length; i++) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}" && --depth === 0) return i++;
    }
  };
  const walk = (end) => {
    while (i < end) {
      const open = src.indexOf("{", i);
      const close = src.indexOf("}", i);
      if (close !== -1 && (open === -1 || close < open)) {
        i = close + 1;
        return;
      }
      if (open === -1) return;
      const head = src.slice(i, open).trim();
      if (/^@(font-face|keyframes|-webkit-keyframes|property|counter-style)\b/.test(head)) {
        skipBlock();
      } else if (head.startsWith("@")) {
        i = open + 1;
        walk(src.length);
      } else {
        out.push(head);
        i = open;
        skipBlock();
      }
    }
  };
  walk(src.length);
  return out;
}

// Splits a selector list at its top-level commas (not those inside :has(…) or :is(…)).
function selectorList(head) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < head.length; i++) {
    if (head[i] === "(") depth++;
    else if (head[i] === ")") depth--;
    else if (head[i] === "," && depth === 0) {
      parts.push(head.slice(start, i));
      start = i + 1;
    }
  }
  return [...parts, head.slice(start)].map((s) => s.trim());
}

test("direction, sample and dev stylesheets only match in direction mode", () => {
  const sheets = [];
  for (const entry of readdirSync(here("directions"), { withFileTypes: true }))
    if (entry.isDirectory() && existsSync(here(`directions/${entry.name}/direction.css`)))
      sheets.push(`directions/${entry.name}/direction.css`);
  assert.deepEqual(
    directions.DIRECTIONS.map((d) => `directions/${d.id}/direction.css`).filter(
      (f) => !sheets.includes(f),
    ),
    [],
    "every direction has a direction.css",
  );
  for (const file of [...sheets, "directions/sample.css"]) {
    const css = readFileSync(here(file), "utf8");
    assert.doesNotMatch(stripComments(css), /!important/, `${file}: no !important`);
    for (const head of selectorsOf(css))
      for (const selector of selectorList(head))
        assert.match(
          selector,
          /^:root\[data-direction(?:="[a-z0-9-]+")?\]/,
          `${file}: «${selector}» must start with :root[data-direction…]`,
        );
  }
  const dev = readFileSync(here("directions/dev.css"), "utf8");
  for (const head of selectorsOf(dev)) assert.match(head, /#demo-direction/);
});
