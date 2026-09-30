// Visual pass 2 (30/09/2026), surface «pages»: the markup the re-layout added to Home, the
// campaign Overview, Preferences and the Library, and the hooks it had to keep. Synthetic
// sample data only (the lantern campaign).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import * as cm from "../campaign-members.mjs";
import * as P from "../party.mjs";
import { harness as homeHarness, slotHTML } from "./home-harness.mjs";

const IMAGE = "data:image/png;base64,iVBORw0KGgo=";

function overviewHarness(role = "dm") {
  const values = new Map();
  const storage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v) };
  const registry = createRegistry();
  assert.equal(registry.use(cm.ID, cm.register).status, "built");
  assert.equal(registry.use("party", P.register).status, "built");
  const store = createStore({ storage });
  registry.initState(store.state);
  const ctx = {
    role,
    lang: "it",
    offline: false,
    view: { page: "campaign", id: "", tab: "overview" },
    get state() {
      return store.state;
    },
    esc,
    icon: () => "",
    t(it, en) {
      return this.lang === "it" ? it : en;
    },
    label(value) {
      return typeof value === "object" && value
        ? value[this.lang] || value.it || value.en || ""
        : String(value ?? "");
    },
    toast() {},
    navigate() {},
    render() {},
    undoLabel: () => "",
    commit(label, mutator, options = {}) {
      store.commit(label, mutator, this.role, { shared: !options.local });
      return { applied: true, persisted: true };
    },
    registry,
  };
  registry.attach(ctx);
  const render = () => registry.get("campaign-section", "overview", ctx).render(ctx);
  const mutate = (fn) => {
    fn(store.state);
    store.persist();
  };
  return { ctx, render, mutate };
}

test("visual2 Overview: Kanka campaign header with description, tags and members", () => {
  const h = overviewHarness("dm");
  const html = h.render();
  // The page title and the dashboard hooks stay (party.test, party-journey).
  assert.match(html, /<h1[^>]*data-campaign-heading[^>]*>Panoramica<\/h1>/);
  assert.match(html, /data-party-dashboard="dm"/);
  // Final review F20 (Kanka): «Entra al Tavolo» lives in the campaign sidebar, not here.
  assert.match(html, /class="campaign-heading"[\s\S]*data-party-dash="setup"[\s\S]*<\/header>/);
  assert.doesNotMatch(
    /<header class="campaign-heading">[\s\S]*?<\/header>/.exec(html)[0],
    /Entra al Tavolo/,
  );
  // The campaign's name moves from the heading's subtitle into the header.
  const heading = /<header class="campaign-heading">[\s\S]*?<\/header>/.exec(html)[0];
  assert.doesNotMatch(heading, /Le lanterne di Bruma/);
  const board = /<section class="party-billboard[\s\S]*?<\/section>/.exec(html)[0];
  assert.match(board, /<h2 id="party-billboard-title">Le lanterne di Bruma<\/h2>/);
  assert.match(board, /vecchio osservatorio di Bruma/);
  assert.match(board, /<li class="badge">2024<\/li>/);
  assert.match(board, /aria-label="Membri della campagna"/);
  assert.match(board, /<strong>DM<\/strong>/);
  assert.match(board, /<strong>Giocatore<\/strong>/);
  assert.doesNotMatch(board, /has-art/, "no image: a plain card");
});

test("visual2 Overview: the campaign image becomes the header's background, only a safe one", () => {
  const h = overviewHarness("player");
  h.mutate((state) => {
    state.ext[cm.ID].campaigns.lanterns.image = IMAGE;
  });
  assert.match(
    h.render(),
    new RegExp(`party-billboard has-art[^>]*--party-art:url\\('${IMAGE}'\\)`),
  );
  h.mutate((state) => {
    state.ext[cm.ID].campaigns.lanterns.image = "javascript:alert(1)";
  });
  assert.doesNotMatch(h.render(), /has-art|javascript:/);
});

test("visual2 Overview: D&D Beyond character cards keep the party tile's hooks", () => {
  const h = overviewHarness("dm");
  const party = /data-party-tile="party"[\s\S]*?<\/section>/.exec(h.render())[0];
  for (const id of ["doran", "livia", "mira"]) {
    assert.match(party, new RegExp(`class="party-mini party-card" data-party-mini="${id}"`));
    assert.match(party, new RegExp(`data-party-sheet="${id}" data-tab="actions"`));
  }
  assert.match(party, /Giocato da DM/);
  assert.match(party, /class="party-hpbar/);
  assert.match(party, /data-party-route="overview"/);
});

test("visual2 Overview: «Collegamenti» lists the latest readable entries, not hidden sections", () => {
  const h = overviewHarness("player");
  let links = /data-party-tile="links"[\s\S]*?<\/section>/.exec(h.render())[0];
  assert.match(links, /data-party-recent/);
  assert.match(links, /data-campaign-open="[^"]+"/, "the sample recap");
  assert.match(links, /data-campaign-route="[^"]*world/);
  assert.match(links, /data-campaign-route="[^"]*notes/);
  h.mutate((state) => {
    state.ext["campaign-settings"] ??= {};
    state.ext["campaign-settings"].campaigns ??= {};
    state.ext["campaign-settings"].campaigns.lanterns = {
      policy: { hiddenSections: ["journal"] },
    };
  });
  links = /data-party-tile="links"[\s\S]*?<\/section>/.exec(h.render())[0];
  assert.doesNotMatch(links, /data-campaign-open=/, "a turned-off Journal lists nothing");
  assert.match(links, /Nessuna voce da mostrare/);
});

test("visual2 Home: the next session follows «continue playing»; the campaign art rides along", async () => {
  const h = await homeHarness({ campaigns: true });
  let html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(html, /^<div data-ext-slot="route:home"[^>]*><div class="home-dashboard">/);
  assert.ok(html.includes("data-home-page"), "home-ui's page is inside");
  const resume = html.indexOf("resume-scene");
  const appointment = html.indexOf("data-home-appointment");
  const summary = html.indexOf("home-bottom");
  assert.ok(
    resume > 0 && resume < appointment && appointment < summary,
    "DOM order follows the view",
  );
  assert.doesNotMatch(html, /data-home-art/);
  h.mutate((state) => {
    state.ext[cm.ID].campaigns.lanterns.image = IMAGE;
  });
  html = slotHTML(h.registry, "route", "home", h.ctx);
  assert.match(
    html,
    new RegExp(`class="home-dashboard" data-home-art style="--home-art:url\\('${IMAGE}'\\)"`),
  );
});

test("visual2 CSS: the Library strip scrolls, Preferences are two columns, Home is one grid", () => {
  const read = (name) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
  const rule = (css, selector) => {
    const start = css.indexOf(`${selector} {`);
    assert.ok(start >= 0, `missing ${selector}`);
    return css.slice(start, css.indexOf("}", start));
  };
  const library = rule(read("library.css"), ".library-tabs");
  assert.match(library, /flex-wrap: nowrap;/);
  assert.match(library, /overflow-x: auto;/);
  const prefs = rule(read("preferences.css"), ".dialog-body.pref-layout");
  assert.match(prefs, /display: grid;/);
  assert.match(prefs, /grid-template-columns: minmax\(200px, 248px\) minmax\(0, 1fr\);/);
  assert.match(read("home.css"), /\.home-layout > \.home-main \{\s*display: contents;/);
});
