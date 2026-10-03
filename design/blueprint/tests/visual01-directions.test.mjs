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

// Round 2 (02/10/2026): numbered options inside a direction on four axes, c colours, t fonts,
// b buttons and fields, i icons, combinable (c2 + t3). Dev-only, like the direction itself.
const memoryStorage = (store) => ({
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
});

test("parseVariants: a comma list, one per axis in c, t, b, i order, the last one wins", () => {
  const parse = directions.parseVariants;
  assert.deepEqual(directions.VARIANT_AXES, ["c", "t", "b", "i"]);
  assert.deepEqual(parse("c2,t3"), ["c2", "t3"]);
  assert.deepEqual(parse("t3,c2"), ["c2", "t3"], "axis order, not the order typed");
  assert.deepEqual(parse("i2, b1 ,t3,c2"), ["c2", "t3", "b1", "i2"]);
  assert.deepEqual(parse("c2,t3,c4"), ["c4", "t3"], "one per axis: the last c wins");
  assert.deepEqual(parse("c2 t3"), ["c2", "t3"], "the attribute's space form reads back");
  assert.deepEqual(parse("c12"), ["c12"]);
  for (const nothing of [null, undefined, "", "off", ",", "x2", "c", "2", "C2", "c2x", "cc2", 42])
    assert.deepEqual(parse(nothing), [], `«${String(nothing)}» names no variant`);
  assert.deepEqual(parse("x2,c2,c,t3!"), ["c2"], "invalid names are ignored, valid ones kept");
});

test("?variant= writes the variant key on loopback: a list, off, or nothing valid", async () => {
  const store = new Map();
  globalThis.localStorage = memoryStorage(store);
  try {
    for (const [search, expected] of [
      ["?direction=bg3&variant=t3,c2", "c2,t3"],
      ["?variant=c2,c4", "c4"],
      ["?direction=current", "c4"], // no ?variant=: the key stays
      ["?variant=off", null],
      ["?variant=b1", "b1"],
      ["?variant=zz", null], // nothing valid: no variant
    ]) {
      globalThis.location = { hostname: "127.0.0.1", search };
      await directions.startDirection(); // no document: only the keys change
      assert.equal(store.get("d20-dev-variant") ?? null, expected, search);
    }
    store.set("d20-dev-variant", "c2");
    globalThis.location = { hostname: "example.org", search: "?variant=off" };
    await directions.startDirection();
    assert.equal(store.get("d20-dev-variant"), "c2", "ignored off loopback");
  } finally {
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});

test("variants are active only with an active direction, on loopback", () => {
  const store = new Map();
  globalThis.localStorage = memoryStorage(store);
  try {
    assert.deepEqual(directions.activeVariants(), [], "no browser location: none");
    globalThis.location = { hostname: "127.0.0.1", search: "" };
    store.set("d20-dev-variant", "t3,c2");
    assert.deepEqual(directions.activeVariants(), [], "no direction key: none");
    store.set("d20-dev-direction", "current");
    assert.deepEqual(directions.activeVariants(), [], "«Attuale»: none");
    store.set("d20-dev-direction", "bg3");
    assert.deepEqual(directions.activeVariants(), ["c2", "t3"]);
    store.delete("d20-dev-variant");
    assert.deepEqual(directions.activeVariants(), []);
    store.set("d20-dev-variant", "c2");
    globalThis.location = { hostname: "example.org", search: "" };
    assert.deepEqual(directions.activeVariants(), [], "never off loopback");
  } finally {
    delete globalThis.location;
    delete globalThis.localStorage;
  }
});

// The smallest document the loader touches: <html> dataset, <head> links (load fires on append),
// the body sprite, getElementById. fetch answers HEAD requests from `files`.
function fakeDocument(files) {
  const element = (tag, parent) => {
    const attrs = new Map();
    const el = {
      tagName: tag,
      parent,
      listeners: {},
      dataset: {},
      setAttribute: (k, v) => attrs.set(k, String(v)),
      getAttribute: (k) => (attrs.has(k) ? attrs.get(k) : null),
      removeAttribute: (k) => attrs.delete(k),
      hasAttribute: (k) => attrs.has(k),
      addEventListener: (type, fn) => (el.listeners[type] = fn),
      remove() {
        const kids = el.parent?.children;
        if (kids?.includes(el)) kids.splice(kids.indexOf(el), 1);
      },
      get nextElementSibling() {
        const kids = el.parent?.children ?? [];
        return kids[kids.indexOf(el) + 1] ?? null;
      },
    };
    return el;
  };
  const head = element("head");
  head.children = [];
  head.append = (el) => {
    el.parent = head;
    head.children.push(el);
    const done = files.has(el.getAttribute("href")) ? "load" : "error";
    queueMicrotask(() => el.listeners[done]?.());
  };
  Object.defineProperty(head, "lastElementChild", { get: () => head.children.at(-1) ?? null });
  const body = element("body");
  body.children = [];
  body.insertAdjacentHTML = (where, html) => {
    const svg = element("svg", body);
    svg.id = /id="([^"]+)"/.exec(html)[1];
    svg.setAttribute("data-art", /data-art="([^"]+)"/.exec(html)[1]);
    body.children.push(svg);
  };
  for (const href of ["styles.css", "combat.css", "registry.css"]) {
    const link = element("link", head);
    link.setAttribute("href", href);
    head.children.push(link);
  }
  const doc = {
    documentElement: element("html"),
    head,
    body,
    createElement: (tag) => element(tag, null),
    getElementById: (id) => [...head.children, ...body.children].find((el) => el.id === id) ?? null,
    querySelector: () => null, // no <link rel="icon">: the favicon swap has nothing to do
  };
  const requests = [];
  const fetch = async (path, init) => {
    requests.push(`${init?.method ?? "GET"} ${path}`);
    return { ok: files.has(path) };
  };
  return { doc, requests, fetch, hrefs: () => head.children.map((el) => el.getAttribute("href")) };
}

test("the loader links existing variant sheets after the direction's, in axis order, and restores exactly", async () => {
  const store = new Map();
  const files = new Set([
    "directions/dev.css",
    "directions/sample.css",
    "directions/bg3/direction.css",
    "directions/bg3/variants/c2.css",
    "directions/bg3/variants/t3.css",
  ]);
  const page = fakeDocument(files);
  const own = { fetch: globalThis.fetch, document: globalThis.document };
  globalThis.localStorage = memoryStorage(store);
  globalThis.document = page.doc;
  globalThis.fetch = page.fetch;
  const root = page.doc.documentElement;
  const plain = page.hrefs();
  const direction = [...plain, "directions/dev.css", "directions/sample.css"];
  try {
    // No variant key: exactly today's direction (no attribute, no link, no variant request).
    globalThis.location = { hostname: "127.0.0.1", search: "?direction=bg3" };
    await directions.startDirection();
    assert.deepEqual(page.hrefs(), [...direction, "directions/bg3/direction.css"]);
    assert.deepEqual(Object.keys(root.dataset), ["direction"]);
    assert.deepEqual(page.requests, ["HEAD assets/maps/sample/old-watch.webp"]);

    // Typed out of order: linked in axis order, after the direction sheet, last in <head>.
    globalThis.location = { hostname: "127.0.0.1", search: "?variant=t3,c2" };
    await directions.startDirection();
    assert.deepEqual(page.hrefs(), [
      ...direction,
      "directions/bg3/direction.css",
      "directions/bg3/variants/c2.css",
      "directions/bg3/variants/t3.css",
    ]);
    assert.equal(root.dataset.direction, "bg3");
    assert.equal(root.dataset.variant, "c2 t3");
    const sheets = page.doc.head.children.slice(-2);
    assert.deepEqual(
      sheets.map((el) => el.getAttribute("data-direction-sheet")),
      ["dev-direction-variant", "dev-direction-variant"],
      "variant links are direction sheets (the specimen counts them)",
    );

    // Only files that exist: b9 has none, so neither a link nor the attribute names it.
    store.set("d20-dev-variant", "c2,b9");
    await directions.applyDirection("bg3");
    assert.deepEqual(page.hrefs().slice(-2), [
      "directions/bg3/direction.css",
      "directions/bg3/variants/c2.css",
    ]);
    assert.equal(root.dataset.variant, "c2");

    // Another direction: its own variants folder (none here), so no variant link or attribute.
    files.add("directions/ddb/direction.css");
    store.set("d20-dev-direction", "ddb");
    await directions.applyDirection("ddb");
    assert.deepEqual(page.hrefs(), [...direction, "directions/ddb/direction.css"]);
    assert.equal(root.dataset.variant, undefined);
    assert.equal(root.dataset.direction, "ddb");

    // Back to bg3, then variants off: the page is exactly the direction-only page.
    store.set("d20-dev-direction", "bg3");
    await directions.applyDirection("bg3");
    assert.equal(root.dataset.variant, "c2");
    globalThis.location = { hostname: "127.0.0.1", search: "?variant=off" };
    await directions.startDirection();
    assert.deepEqual(page.hrefs(), [...direction, "directions/bg3/direction.css"]);
    assert.equal(root.dataset.variant, undefined);

    // Variants on, then the direction off: nothing of either is left.
    store.set("d20-dev-variant", "c2,t3");
    await directions.applyDirection("bg3");
    assert.equal(page.hrefs().length, direction.length + 3);
    globalThis.location = { hostname: "127.0.0.1", search: "?direction=off" };
    await directions.startDirection();
    assert.deepEqual(page.hrefs(), plain);
    assert.deepEqual(Object.keys(root.dataset), []);
    assert.equal(icon("ruler"), original("ruler"), "the core icons are back");
    assert.equal(store.get("d20-dev-variant"), "c2,t3", "the variant key waits for a direction");
  } finally {
    delete globalThis.location;
    delete globalThis.localStorage;
    globalThis.document = own.document;
    globalThis.fetch = own.fetch;
    if (own.document === undefined) delete globalThis.document;
    await directions.applyDirection(null);
    setIconOverride(null);
    setLogoOverride(null);
  }
});

test("variant icons win over the direction's, then the direction's, then the core", () => {
  const svg = (id) => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" id="${id}"></svg>`;
  const variant = (name) => (name === "ruler" ? svg("variant") : name === "bad" ? 42 : null);
  const direction = (name) => (name === "home" || name === "bad" ? svg("direction") : null);
  const pick = directions.combineIcons([variant, direction]);
  assert.equal(pick("ruler"), svg("variant"));
  assert.equal(pick("home"), svg("direction"), "the variant's null falls back to the direction");
  assert.equal(pick("bad"), svg("direction"), "a non-svg answer falls back too");
  assert.equal(pick("sword"), null, "neither answers: the core icon");
  const thrower = () => {
    throw new Error("broken");
  };
  assert.equal(directions.combineIcons([thrower, direction])("home"), svg("direction"));
  assert.equal(directions.combineIcons([]), null, "no picker: no override");
  assert.equal(directions.combineIcons([null, undefined]), null);
  globalThis.document = { documentElement: { dataset: { prefTheme: "light" } } };
  try {
    assert.equal(pick("ruler"), null, "the light theme keeps the core icons");
  } finally {
    delete globalThis.document;
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

// directions/<id>/variants/<name>.css (round 2): inert without both the direction and the
// variant on <html>; the same bans as direction.css (README «Contract for a variant builder»).
function variantProblems(css, id, name) {
  const prefix = `:root[data-direction="${id}"][data-variant~="${name}"]`;
  const problems = [];
  const plain = stripComments(css);
  if (/!important/.test(plain)) problems.push("!important");
  if (/text-transform/.test(plain)) problems.push("text-transform");
  for (const head of selectorsOf(css))
    for (const selector of selectorList(head))
      if (!selector.startsWith(prefix)) problems.push(`«${selector}» must start with ${prefix}`);
  return problems;
}

test("the variant check rejects what the contract forbids", () => {
  const good = `@font-face { font-family: "X"; src: url(x.woff2); }
    :root[data-direction="bg3"][data-variant~="c2"]:not([data-pref-theme="light"]) { --accent: #c9a25e; }
    @media (max-width: 720px) { :root[data-direction="bg3"][data-variant~="c2"] .brand, :root[data-direction="bg3"][data-variant~="c2"] .brand b { gap: 4px; } }`;
  assert.deepEqual(variantProblems(good, "bg3", "c2"), []);
  for (const [bad, why] of [
    [`:root[data-direction="bg3"] { --accent: red; }`, "no variant attribute"],
    [`:root[data-direction="bg3"][data-variant~="t3"] { --accent: red; }`, "another variant"],
    [`:root[data-variant~="c2"] { --accent: red; }`, "no direction"],
    [`:root[data-direction="bg3"][data-variant~="c2"] a, .brand { color: red; }`, "a bare part"],
    [`:root[data-direction="bg3"][data-variant~="c2"] a { color: red !important; }`, "!important"],
    [`:root[data-direction="bg3"][data-variant~="c2"] a { text-transform: none; }`, "transform"],
  ])
    assert.notDeepEqual(variantProblems(bad, "bg3", "c2"), [], why);
});

test("every variant stylesheet and icon module keeps the contract", async () => {
  const name = /^([ctbi]\d{1,2})\.(css|icons\.mjs)$/;
  for (const { id } of directions.DIRECTIONS) {
    const folder = `directions/${id}/variants`;
    if (!existsSync(here(folder))) continue;
    for (const file of readdirSync(here(folder))) {
      if (!/\.(css|mjs)$/.test(file)) continue;
      const m = name.exec(file);
      assert.ok(m, `${folder}/${file}: named <axis c|t|b|i><number>.css or .icons.mjs`);
      if (m[2] === "css")
        assert.deepEqual(
          variantProblems(readFileSync(here(`${folder}/${file}`), "utf8"), id, m[1]),
          [],
          `${folder}/${file}`,
        );
      else {
        const mod = await import(here(`${folder}/${file}`).href);
        assert.equal(typeof mod.directionIcon, "function", `${folder}/${file}: directionIcon`);
        for (const icon of ["ruler", "home", "sword", "no-such-icon"]) {
          const svg = mod.directionIcon(icon);
          assert.ok(
            svg === null ||
              (typeof svg === "string" && /^<svg class="icon"[^>]* aria-hidden="true"/.test(svg)),
            `${folder}/${file}: ${icon} is null or a full decorative <svg class="icon">`,
          );
        }
      }
    }
  }
});
