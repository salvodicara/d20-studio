// W2a2 integration: the character sheet's section strip gains "All sections" (D&D Beyond's sheet
// quick-jump, DDB-060), the same control as the campaign strip, because area tabs (B21, B28,
// B54) push most sections off a phone screen. Render-level checks; the browser journey
// w2a2-shell-journey.js exercises the tap, the dialog and the navigation.
import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../state.mjs";
import { createRegistry } from "../registry.mjs";
import { esc } from "../ui.mjs";
import { canControlActor } from "../character-access.mjs";
import { renderCharacters } from "../characters.mjs";
import * as projects from "../projects.mjs";

function memory() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}
function sheet({ lang = "it", tab = "actions" } = {}) {
  const registry = createRegistry();
  registry.use("projects", projects.register);
  const store = createStore({ storage: memory() });
  registry.initState(store.state);
  const ctx = {
    state: store.state,
    registry,
    role: "player",
    lang,
    view: { page: "characters", id: "livia", tab },
    t: (it, en) => (lang === "it" ? it : en),
    label: (value) =>
      value && typeof value === "object" ? (value[lang] ?? value.it) : String(value ?? ""),
    esc,
    icon: () => "",
    canControl: (actor) => canControlActor(actor, "player", store.state),
  };
  return renderCharacters(ctx);
}

test("the sheet strip ends with one 'All sections' quick-jump, outside the tab list", () => {
  const html = sheet();
  const bar = html.match(
    /<div class="character-tabs-bar">([\s\S]*?)<\/div><div class="character-tab-content">/,
  );
  assert.ok(bar, "the strip and the quick-jump share one bar");
  const [nav, after] = bar[1].split("</nav>");
  // B62: area tabs fold into D&D Beyond's categories (Downtime in Extras, gifts in Features &
  // Traits); the categories stay in the strip.
  assert.match(nav, /data-character-tab="extras"/, "area categories stay in the strip");
  assert.match(nav, /data-character-tab="features"/);
  assert.doesNotMatch(nav, /data-character-tabs-all/);
  assert.match(after, /^<button type="button" class="character-tabs-all" data-character-tabs-all/);
  assert.match(after, /aria-haspopup="dialog" aria-label="Tutte le sezioni della scheda"/);
  assert.doesNotMatch(after, /data-character-tab=/, "the quick-jump is not counted as a tab");
  assert.equal(html.match(/data-character-tabs-all/g).length, 1);
});

test("the quick-jump is labelled in English and keeps the open tab untouched", () => {
  const html = sheet({ lang: "en", tab: "projects" });
  assert.match(html, /aria-label="All sheet sections" title="All sheet sections"/);
  // B62: the open tab is Downtime inside Extras — the category is current, the sub-section
  // is the active one under it.
  assert.match(html, /class="active" data-character-tab="extras" aria-current="page"/);
  assert.match(
    html,
    /class="active" data-character-subtab="projects" data-character-tab="projects" aria-current="true"/,
  );
});
