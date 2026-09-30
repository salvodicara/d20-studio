// Phase C (visual-01, 30/09/2026): the dev-only «Direzione» selector and its hooks. With no
// direction the app must stay exactly as it is: icon() byte-identical, no strip control, no
// loader side effect under plain Node. Direction skins are prefixed so they stay inert.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { icon, iconPath, setIconOverride } from "../ui.mjs";
import * as directions from "../directions/index.mjs";

const here = (path) => new URL(`../${path}`, import.meta.url);
const original = (name) =>
  '<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
  (iconPath(name) ?? iconPath("book")) +
  '"/></svg>';

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
